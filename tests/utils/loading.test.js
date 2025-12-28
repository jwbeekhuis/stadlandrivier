// Loading utility tests

import { describe, it, expect, beforeEach } from 'vitest';
import { setButtonLoading, clearButtonLoading, showLoadingText, disableButtons, enableButtons } from '../../js/utils/loading.js';

describe('Loading utilities', () => {
    let button;

    beforeEach(() => {
        // happy-dom is already configured in vitest.config.js
        document.body.innerHTML = `
            <button id="test-btn">Original Text</button>
            <div id="test-div">Original Content</div>
        `;
        button = document.getElementById('test-btn');
    });

    describe('setButtonLoading', () => {
        it('should set button to loading state', () => {
            setButtonLoading(button, 'Loading...');

            expect(button.disabled).toBe(true);
            expect(button.classList.contains('btn-loading')).toBe(true);
            expect(button.innerHTML).toContain('loading-spinner');
            expect(button.innerHTML).toContain('Loading...');
            expect(button.dataset.originalContent).toBe('Original Text');
        });

        it('should use default loading text when not provided', () => {
            setButtonLoading(button);

            expect(button.innerHTML).toContain('Laden...');
        });

        it('should handle null button gracefully', () => {
            expect(() => setButtonLoading(null)).not.toThrow();
        });
    });

    describe('clearButtonLoading', () => {
        it('should restore button from loading state', () => {
            // First set to loading
            setButtonLoading(button, 'Loading...');

            // Then clear
            clearButtonLoading(button);

            expect(button.disabled).toBe(false);
            expect(button.classList.contains('btn-loading')).toBe(false);
            expect(button.innerHTML).toBe('Original Text');
            expect(button.dataset.originalContent).toBeUndefined();
        });

        it('should handle null button gracefully', () => {
            expect(() => clearButtonLoading(null)).not.toThrow();
        });
    });

    describe('showLoadingText', () => {
        it('should show loading text and return clear function', () => {
            const div = document.getElementById('test-div');
            const clearFn = showLoadingText(div, 'Processing...');

            expect(div.innerHTML).toContain('loading-text');
            expect(div.innerHTML).toContain('loading-spinner');
            expect(div.innerHTML).toContain('Processing...');
            expect(typeof clearFn).toBe('function');

            // Test clear function
            clearFn();
            expect(div.innerHTML).toBe('Original Content');
        });

        it('should use default text when not provided', () => {
            const div = document.getElementById('test-div');
            showLoadingText(div);

            expect(div.innerHTML).toContain('Laden...');
        });

        it('should handle null element gracefully', () => {
            const clearFn = showLoadingText(null);
            expect(typeof clearFn).toBe('function');
            expect(() => clearFn()).not.toThrow();
        });
    });

    describe('disableButtons', () => {
        it('should disable array of buttons', () => {
            const button2 = document.createElement('button');
            const buttons = [button, button2];

            disableButtons(buttons);

            buttons.forEach(btn => {
                expect(btn.disabled).toBe(true);
                expect(btn.style.opacity).toBe('0.6');
                expect(btn.style.pointerEvents).toBe('none');
            });
        });

        it('should handle null buttons in array gracefully', () => {
            expect(() => disableButtons([button, null])).not.toThrow();
            expect(button.disabled).toBe(true);
        });
    });

    describe('enableButtons', () => {
        it('should enable array of buttons', () => {
            const button2 = document.createElement('button');
            const buttons = [button, button2];

            // First disable them
            disableButtons(buttons);

            // Then enable
            enableButtons(buttons);

            buttons.forEach(btn => {
                expect(btn.disabled).toBe(false);
                expect(btn.style.opacity).toBe('');
                expect(btn.style.pointerEvents).toBe('');
            });
        });

        it('should handle null buttons in array gracefully', () => {
            expect(() => enableButtons([button, null])).not.toThrow();
            expect(button.disabled).toBe(false);
        });
    });
});