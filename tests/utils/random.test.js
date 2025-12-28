import { describe, it, expect } from 'vitest';
import { generateRoomCode, getRandomCategories, getRandomLetter } from '../../js/utils/random.js';

describe('Random Utilities', () => {
  describe('generateRoomCode', () => {
    it('should generate a 4-character code', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(4);
    });

    it('should generate uppercase alphanumeric codes', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{4}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        codes.add(generateRoomCode());
      }

      // With 100 iterations, we should have high uniqueness
      // Allow some collisions due to randomness, but expect at least 90% unique
      expect(codes.size).toBeGreaterThan(iterations * 0.9);
    });

    it('should generate different codes on consecutive calls', () => {
      const code1 = generateRoomCode();
      const code2 = generateRoomCode();
      const code3 = generateRoomCode();

      // At least 2 out of 3 should be different (very high probability)
      const allSame = code1 === code2 && code2 === code3;
      expect(allSame).toBe(false);
    });

    it('should only contain valid characters', () => {
      const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        for (const char of code) {
          expect(validChars).toContain(char);
        }
      }
    });
  });

  describe('getRandomCategories', () => {
    it('should return 6 categories by default', () => {
      const categories = getRandomCategories();
      expect(categories).toHaveLength(6);
    });

    it('should return requested number of categories', () => {
      expect(getRandomCategories(3)).toHaveLength(3);
      expect(getRandomCategories(10)).toHaveLength(10);
      expect(getRandomCategories(1)).toHaveLength(1);
    });

    it('should return unique categories', () => {
      const categories = getRandomCategories(10);
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(categories.length);
    });

    it('should return different categories on multiple calls', () => {
      const set1 = getRandomCategories(6);
      const set2 = getRandomCategories(6);

      // Very unlikely to get exact same order
      const sameOrder = JSON.stringify(set1) === JSON.stringify(set2);
      expect(sameOrder).toBe(false);
    });

    it('should return array of strings', () => {
      const categories = getRandomCategories(5);
      categories.forEach(category => {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getRandomLetter', () => {
    it('should return a single character', () => {
      const letter = getRandomLetter();
      expect(letter).toHaveLength(1);
    });

    it('should return an uppercase letter', () => {
      const letter = getRandomLetter();
      expect(letter).toMatch(/^[A-Z]$/);
    });

    it('should not return excluded letters (Q, X, Y) per implementation', () => {
      // Note: Based on the implementation, E and N are actually included
      const excludedLetters = ['Q', 'X', 'Y'];

      for (let i = 0; i < 100; i++) {
        const letter = getRandomLetter();
        expect(excludedLetters).not.toContain(letter);
      }
    });

    it('should return varied letters', () => {
      const letters = new Set();

      for (let i = 0; i < 50; i++) {
        letters.add(getRandomLetter());
      }

      // Should get at least 10 different letters out of 50 tries
      expect(letters.size).toBeGreaterThan(10);
    });

    it('should only return valid letters from the allowed set', () => {
      const allowedLetters = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');

      for (let i = 0; i < 100; i++) {
        const letter = getRandomLetter();
        expect(allowedLetters).toContain(letter);
      }
    });
  });
});
