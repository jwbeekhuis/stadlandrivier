import { t } from '../i18n/translations.js';

/**
 * Show a funny transition screen
 * @param {string} type - 'pens-down' | 'calculating' | 'verdict' | 'roll-letter'
 * @param {number} durationMs - How long to show the transition
 * @param {string} extra - Optional letter or info to display
 * @returns {Promise} - Resolves when the transition is hidden
 */
export function showTransition(type, durationMs = 4000, extra = '') {
    const screen = document.getElementById('transition-screen');
    const title = document.getElementById('transition-title');
    const animation = document.getElementById('transition-animation');
    const subtitle = document.getElementById('transition-subtitle');

    if (!screen || !title || !animation || !subtitle) return Promise.resolve();

    // Prepare content based on type
    const variations = t(`trans${type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`);
    const variation = Array.isArray(variations)
        ? variations[Math.floor(Math.random() * variations.length)]
        : { title: t(`trans${type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`), sub: t(`trans${type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Sub`) };

    switch (type) {
        case 'roll-letter':
            title.textContent = variation.title;
            subtitle.textContent = variation.sub;
            // First show spinning letter
            animation.innerHTML = '<div class="letter-spinner"></div>';

            return new Promise((resolve) => {
                screen.classList.remove('hidden');

                // 2s spinning (was 1.5s, +0.5s voor beter leesbaarheid)
                setTimeout(() => {
                    // Show revealed letter
                    animation.innerHTML = `<div class="letter-reveal">${extra || '?'}</div>`;

                    // Stay on screen for another 2s then resolve (was 1.5s, +0.5s voor beter leesbaarheid)
                    setTimeout(() => {
                        screen.classList.add('hidden');
                        setTimeout(resolve, 500);
                    }, 2000);
                }, 2000);
            });

        case 'pens-down':
            title.textContent = variation.title;
            subtitle.textContent = variation.sub;
            animation.innerHTML = `
                <div class="pens-down-icon">
                    <span>✏️</span>
                </div>
            `;
            break;
        case 'calculating':
            title.textContent = variation.title;
            subtitle.textContent = variation.sub;
            animation.innerHTML = `
                <div class="calculating-animation">
                    <span>🔢</span>
                </div>
            `;
            break;
        case 'verdict':
            title.textContent = variation.title || t('transVerdict');
            subtitle.textContent = variation.sub || t('transVerdictSub');
            animation.innerHTML = '<div class="drumroll-animation">⚖️</div>';
            break;
        default:
            return Promise.resolve();
    }

    // Show screen
    screen.classList.remove('hidden');

    return new Promise((resolve) => {
        setTimeout(() => {
            screen.classList.add('hidden');
            // Wait for fade out animation before resolving
            setTimeout(resolve, 500);
        }, durationMs);
    });
}
