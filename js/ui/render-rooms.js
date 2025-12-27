// Active rooms list rendering

import { escapeHtml } from '../utils/string.js';
import { t } from '../i18n/translations.js';
import { state } from '../state/core.js';

/**
 * Render the active rooms list
 * @param {Array} rooms - Array of room objects
 */
export function renderRoomsList(rooms) {
    const list = document.getElementById("active-rooms-list");

    if (rooms.length === 0) {
        list.innerHTML = `<p class="no-rooms">${t('noRooms')}</p>`;
        return;
    }

    list.innerHTML = rooms.map(room => {
        const playerCount = room.players?.length || 0;
        const hostName = room.players?.[0]?.name || "Unknown";
        const roomName = room.roomName || `${hostName}${t('defaultRoomName')}`;
        const isMyRoom = room.players?.some(p => p.uid === state.user.currentUser?.uid);
        const escapedRoomName = escapeHtml(roomName);
        const escapedHostName = escapeHtml(hostName);

        return `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-header">
                    <div class="room-code">${room.id}</div>
                    ${isMyRoom ? `<button class="delete-room-btn" onclick="deleteRoom('${room.id}')" title="${t('deleteRoom')}">🗑️</button>` : ''}
                </div>
                <div class="room-name">${escapedRoomName}</div>
                <div class="room-info">
                    <span class="room-host">${t('host')} ${escapedHostName}</span>
                    <span class="room-players">👤 ${playerCount}</span>
                </div>
                <button class="join-room-quick-btn" onclick="quickJoinRoom('${room.id}')">
                    ${t('joinRoom')}
                </button>
            </div>
        `;
    }).join('');
}
