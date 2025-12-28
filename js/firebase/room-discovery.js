// Active rooms discovery and joining

import { db, doc, collection, query, where, orderBy, limit, onSnapshot, getDoc, updateDoc, arrayUnion, UserService } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { setRoomId } from '../state/actions.js';
import { getElements } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { renderRoomsList } from '../ui/render-rooms.js';
import { t } from '../i18n/translations.js';
import { ROOM_STATUS } from '../constants.js';
import { debugLog } from '../utils/string.js';
import { setButtonLoading, clearButtonLoading } from '../utils/loading.js';

/**
 * Subscribe to active rooms list
 */
export function subscribeToActiveRooms() {
    // BELANGRIJK: Stop bestaande listener eerst om memory leaks te voorkomen
    if (state.internals.activeRoomsUnsubscribe) {
        state.internals.activeRoomsUnsubscribe();
        state.internals.activeRoomsUnsubscribe = null;
    }

    const roomsQuery = query(
        collection(db, "rooms"),
        where("status", "in", [ROOM_STATUS.LOBBY, ROOM_STATUS.PLAYING, ROOM_STATUS.VOTING, ROOM_STATUS.FINISHED]),
        orderBy("createdAt", "desc"),
        limit(10)
    );

    // Sla de unsubscribe functie op zodat we hem later kunnen aanroepen
    state.internals.activeRoomsUnsubscribe = onSnapshot(roomsQuery, (snapshot) => {
        const rooms = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            rooms.push({ id: doc.id, ...data });
        });
        renderRoomsList(rooms);
    });
}

/**
 * Stop the active rooms listener
 */
export function stopActiveRoomsListener() {
    if (state.internals.activeRoomsUnsubscribe) {
        state.internals.activeRoomsUnsubscribe();
        state.internals.activeRoomsUnsubscribe = null;
    }
}

/**
 * Reopen a dormant room (original creator only)
 * @param {Object} roomRef - Firebase room document reference
 * @param {Object} roomData - Room data
 * @param {string} playerName - Player name
 * @param {string} playerUid - Player UID
 */
export async function reopenDormantRoom(roomRef, roomData, playerName, playerUid) {
    debugLog(`Reopening dormant room by creator ${roomData.creatorName}`);

    // Reactivate the room with the creator as the first player (host)
    await updateDoc(roomRef, {
        status: ROOM_STATUS.LOBBY,
        hostId: playerUid,
        players: [{
            uid: playerUid,
            name: playerName,
            score: 0,
            answers: {},
            isVerified: false,
            lastSeen: Date.now()
        }],
        currentLetter: '?',  // Reset game state
        votingState: null,
        lastActivity: Date.now()
    });

    return true;
}

/**
 * Quick join a room (from room list button)
 * @param {string} code - Room code to join
 * @param {Function} enterGameUI - Function to enter game UI
 * @param {Function} subscribeToRoom - Function to subscribe to room
 * @param {Function} startHeartbeat - Function to start heartbeat
 * @param {Function} stopActiveRoomsListener - Function to stop active rooms listener
 */
export async function quickJoinRoom(code, enterGameUI, subscribeToRoom, startHeartbeat, stopActiveRoomsListener, joinButton = null) {
    const { playerNameInput } = getElements();
    const currentUser = state.user.currentUser;

    const name = playerNameInput.value.trim();
    if (!name) {
        showToast(t('enterName'), 'warning', 4000);
        playerNameInput.focus();
        return;
    }

    // Zet join button in loading state als deze is meegegeven
    if (joinButton) {
        setButtonLoading(joinButton, t('joining') || 'Deelnemen...');
    }

        // Save name to localStorage as fallback
        localStorage.setItem('playerName', name);
        // Save name to Firestore user profile
        if (currentUser) {
            await UserService.saveProfile(currentUser.uid, { name: name });
        }

        setRoomId(code);

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            showToast(t('roomNotExist'), 'info', 4000);
            return;
        }

        const roomData = roomSnap.data();

        // Handle dormant room reactivation
        if (roomData.status === ROOM_STATUS.DORMANT) {
            // Only the original creator can reopen a dormant room
            if (roomData.creatorUid === currentUser.uid) {
                await reopenDormantRoom(roomRef, roomData, name, currentUser.uid);
                state.room.isHost = true;  // Creator becomes host when reopening
                enterGameUI(code, stopActiveRoomsListener);
                subscribeToRoom(code);
                startHeartbeat();
                return;
            } else {
                showToast(t('roomNotExist'), 'info', 4000);
                return;
            }
        }

        // Normal join flow for active rooms
        state.room.isHost = false;
        const existingPlayer = roomData.players.find(p => p.uid === currentUser.uid);

        if (existingPlayer) {
            // Player already exists, update their info
            const updatedPlayers = roomData.players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, name: name, lastSeen: Date.now() }
                    : p
            );
            await updateDoc(roomRef, {
                players: updatedPlayers,
                lastActivity: Date.now()
            });
        } else {
            // New player, add them
            await updateDoc(roomRef, {
                players: arrayUnion({ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() }),
                lastActivity: Date.now()
            });
        }

        enterGameUI(code, stopActiveRoomsListener);
        subscribeToRoom(code);
        startHeartbeat();
    } catch (error) {
        console.error("Error joining room:", error);
        showToast(t('errorGeneric') + ': ' + error.message, 'error', 6000);
    } finally {
        // Herstel button state altijd, ook bij errors
        if (joinButton) {
            clearButtonLoading(joinButton);
        }
    }
}
