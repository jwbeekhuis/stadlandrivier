// Loading state utility functions

/**
 * Zet een button in loading state
 * @param {HTMLElement} button - De button element
 * @param {string} loadingText - Optionele loading text (default: "Laden...")
 */
export function setButtonLoading(button, loadingText = 'Laden...') {
    if (!button) return;

    // Sla originele content op
    if (!button.dataset.originalContent) {
        button.dataset.originalContent = button.innerHTML;
    }

    // Voeg loading classes toe
    button.classList.add('btn-loading');
    button.disabled = true;

    // Maak loading content
    const spinnerHtml = '<div class="loading-spinner"></div>';
    const textHtml = `<span class="btn-text">${loadingText}</span>`;

    button.innerHTML = textHtml + spinnerHtml;
}

/**
 * Herstel button uit loading state
 * @param {HTMLElement} button - De button element
 */
export function clearButtonLoading(button) {
    if (!button) return;

    // Verwijder loading classes
    button.classList.remove('btn-loading');
    button.disabled = false;

    // Herstel originele content
    if (button.dataset.originalContent) {
        button.innerHTML = button.dataset.originalContent;
        delete button.dataset.originalContent;
    }
}

/**
 * Toon loading text met spinner
 * @param {HTMLElement} element - Element om loading text in te tonen
 * @param {string} text - Loading text
 * @returns {function} Functie om loading state te wissen
 */
export function showLoadingText(element, text = 'Laden...') {
    if (!element) return () => {};

    const originalContent = element.innerHTML;
    element.innerHTML = `
        <div class="loading-text">
            <div class="loading-spinner"></div>
            <span>${text}</span>
        </div>
    `;

    return () => {
        element.innerHTML = originalContent;
    };
}

/**
 * Disable een groep van buttons om double-clicks te voorkomen
 * @param {HTMLElement[]} buttons - Array van button elements
 */
export function disableButtons(buttons) {
    buttons.forEach(button => {
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.pointerEvents = 'none';
        }
    });
}

/**
 * Enable een groep van buttons
 * @param {HTMLElement[]} buttons - Array van button elements
 */
export function enableButtons(buttons) {
    buttons.forEach(button => {
        if (button) {
            button.disabled = false;
            button.style.opacity = '';
            button.style.pointerEvents = '';
        }
    });
}