// Player management operations

import { db, doc, getDoc, updateDoc } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { showToast } from '../ui/toast.js';
import { showModal } from '../ui/modal.js';
import { t } from '../i18n/translations.js';
import { debugLog } from '../utils/string.js';

/**
 * Kick a player from the room (host only)
 * @param {string} playerUid - UID of player to kick
 */
export async function kickPlayer(playerUid) {
    if (!state.room.isHost) return;

    try {
        const roomRef = doc(db, "rooms", state.room.roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) return;

        const players = roomSnap.data().players;
        const playerToKick = players.find(p => p.uid === playerUid);

        if (!playerToKick) return;

        const confirmed = await showModal(
            t('kick') + ' ' + playerToKick.name + '?',
            t('confirmKick').replace('{name}', playerToKick.name),
            { type: 'warning', confirmText: t('kick'), confirmDanger: true, t }
        );

        if (!confirmed) return;

        const updatedPlayers = players.filter(p => p.uid !== playerUid);
        await updateDoc(roomRef, { players: updatedPlayers });

        debugLog(`${playerToKick.name} is uit de kamer verwijderd`);
        showToast(playerToKick.name + ' is verwijderd', 'info', 3000);
    } catch (e) {
        console.error("Error kicking player:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}
