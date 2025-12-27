// Real-time room subscription management

import { db, doc, onSnapshot } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { setRoomData } from '../state/actions.js';
import { ROOM_STATUS } from '../constants.js';
import { t } from '../i18n/translations.js';

/**
 * Subscribe to real-time room updates
 * @param {string} code - Room code to subscribe to
 * @param {Function} returnToLobby - Function to call when room is deleted/player kicked
 * @param {Function} updateGameState - Function to call when room data updates
 */
export function subscribeToRoom(code, returnToLobby, updateGameState) {
    // Unsubscribe from previous room if any
    if (state.internals.roomUnsubscribe) {
        state.internals.roomUnsubscribe();
    }

    state.internals.roomUnsubscribe = onSnapshot(doc(db, "rooms", code), (doc) => {
        if (!doc.exists()) {
            // Room doesn't exist anymore
            returnToLobby(t('roomNotExist'));
            return;
        }

        const data = doc.data();

        // Check if room is deleted
        if (data.status === ROOM_STATUS.DELETED) {
            returnToLobby(t('roomDeleted'));
            return;
        }

        // Check if current player is still in the room
        const stillInRoom = data.players.some(p => p.uid === state.user.currentUser.uid);
        if (!stillInRoom) {
            returnToLobby(t('kickedFromRoom'));
            return;
        }

        setRoomData(data);
        updateGameState(data);
    });
}
