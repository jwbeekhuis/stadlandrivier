// Player heartbeat system for tracking active players

import { db, doc, getDoc, updateDoc } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { CONSTANTS } from '../constants.js';
import { debugLog } from '../utils/string.js';

/**
 * Start the heartbeat system
 * Updates player's lastSeen timestamp every 30 seconds
 * Host also runs cleanup of inactive players
 */
export function startHeartbeat() {
    stopHeartbeat(); // Clear any existing interval

    // Update immediately
    updatePlayerHeartbeat();

    // Update elke HEARTBEAT_INTERVAL_MS (30s) - geoptimaliseerd voor Firebase kosten
    // Host doet ook cleanup, maar minder frequent dan voorheen
    state.internals.heartbeatInterval = setInterval(() => {
        updatePlayerHeartbeat();
        if (state.room.isHost) {
            cleanupInactivePlayers();
        }
    }, CONSTANTS.HEARTBEAT_INTERVAL_MS);
}

/**
 * Stop the heartbeat system
 */
export function stopHeartbeat() {
    if (state.internals.heartbeatInterval) {
        clearInterval(state.internals.heartbeatInterval);
        state.internals.heartbeatInterval = null;
    }
}

/**
 * Update the current player's lastSeen timestamp
 * @param {number} retryCount - Number of retry attempts (for exponential backoff)
 */
export async function updatePlayerHeartbeat(retryCount = 0) {
    const roomId = state.room.roomId;
    const currentUser = state.user.currentUser;

    if (!roomId || !currentUser) return;

    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            debugLog("Room no longer exists, stopping heartbeat");
            stopHeartbeat();
            return;
        }

        const players = roomSnap.data().players;
        const playerExists = players.find(p => p.uid === currentUser.uid);

        if (!playerExists) {
            debugLog("Player no longer in room, stopping heartbeat");
            stopHeartbeat();
            return;
        }

        const updatedPlayers = players.map(p =>
            p.uid === currentUser.uid
                ? { ...p, lastSeen: Date.now() }
                : p
        );

        await updateDoc(roomRef, { players: updatedPlayers });
        debugLog("Heartbeat updated successfully");
    } catch (e) {
        console.error("Heartbeat error:", e);

        // Retry up to 3 times with exponential backoff
        if (retryCount < CONSTANTS.MAX_HEARTBEAT_RETRIES) {
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5s delay
            debugLog(`Retrying heartbeat in ${retryDelay}ms (attempt ${retryCount + 1}/${CONSTANTS.MAX_HEARTBEAT_RETRIES})`);
            setTimeout(() => updatePlayerHeartbeat(retryCount + 1), retryDelay);
        } else {
            console.error("Heartbeat failed after 3 retries, but keeping connection alive");
            // Don't stop heartbeat - next interval will try again
        }
    }
}

/**
 * Cleanup inactive players (host only)
 * Removes players who haven't sent a heartbeat in INACTIVE_THRESHOLD_MS
 */
export async function cleanupInactivePlayers() {
    const roomId = state.room.roomId;
    const isHost = state.room.isHost;

    if (!roomId || !isHost) return;

    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) return;

        const data = roomSnap.data();
        const players = data.players;
        const now = Date.now();

        // Increased threshold to 2 minutes to be more forgiving
        // Also add grace period during voting (3 minutes)
        const isVoting = data.status === 'voting'; // Using string directly to avoid circular import
        const inactiveThreshold = isVoting
            ? CONSTANTS.VOTING_INACTIVE_THRESHOLD_MS
            : CONSTANTS.INACTIVE_THRESHOLD_MS; // 3min during voting, 2min otherwise

        const activePlayers = players.filter(p => {
            const timeSinceLastSeen = now - (p.lastSeen || 0);
            const isActive = timeSinceLastSeen < inactiveThreshold;

            // Log inactivity status for debugging
            if (!isActive) {
                debugLog(`Player ${p.name} (${p.uid}) inactive for ${Math.round(timeSinceLastSeen / 1000)}s (threshold: ${inactiveThreshold/1000}s)`);
            }

            return isActive;
        });

        // Only update if players were removed
        if (activePlayers.length < players.length) {
            const removedCount = players.length - activePlayers.length;
            debugLog(`Removing ${removedCount} inactive player(s)`);
            await updateDoc(roomRef, { players: activePlayers });
        }
    } catch (e) {
        console.error("Error cleaning up inactive players:", e);
    }
}
