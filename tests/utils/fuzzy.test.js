import { describe, it, expect } from 'vitest';
import { levenshteinDistance, areWordsFuzzyMatching } from '../../js/utils/fuzzy.js';

describe('Fuzzy Matching Utilities', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('test', 'test')).toBe(0);
      expect(levenshteinDistance('amsterdam', 'amsterdam')).toBe(0);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should calculate distance for single character difference', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
      expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
      expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
    });

    it('should calculate distance for multiple differences', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    it('should handle completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
      expect(levenshteinDistance('test', '1234')).toBe(4);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', 'test')).toBe(4);
      expect(levenshteinDistance('test', '')).toBe(4);
    });

    it('should work with known test cases', () => {
      // Amsterdam with typo (missing 'a')
      expect(levenshteinDistance('amsterdam', 'amsterdm')).toBe(1);
      // Rotterdam with 1 typo (missing 'r')
      expect(levenshteinDistance('rotterdam', 'rottedam')).toBe(1);
      // Den vs Dan (substitution)
      expect(levenshteinDistance('den', 'dan')).toBe(1);
    });

    it('should be case-sensitive', () => {
      expect(levenshteinDistance('Test', 'test')).toBe(1);
      expect(levenshteinDistance('HELLO', 'hello')).toBe(5);
    });
  });

  describe('areWordsFuzzyMatching', () => {
    it('should match identical words', () => {
      expect(areWordsFuzzyMatching('amsterdam', 'amsterdam')).toBe(true);
      expect(areWordsFuzzyMatching('test', 'test')).toBe(true);
    });

    it('should match words ignoring case', () => {
      expect(areWordsFuzzyMatching('Amsterdam', 'amsterdam')).toBe(true);
      expect(areWordsFuzzyMatching('PARIS', 'paris')).toBe(true);
    });

    it('should match words with accents removed', () => {
      expect(areWordsFuzzyMatching('café', 'cafe')).toBe(true);
      expect(areWordsFuzzyMatching('Zürich', 'zurich')).toBe(true);
    });

    it('should NOT match very short words with typos (≤2 chars)', () => {
      expect(areWordsFuzzyMatching('1', '2')).toBe(false);
      expect(areWordsFuzzyMatching('a', 'b')).toBe(false);
      expect(areWordsFuzzyMatching('ab', 'ac')).toBe(false);
    });

    it('should match short words (3-4 chars) with 1 typo', () => {
      expect(areWordsFuzzyMatching('den', 'dan')).toBe(true);
      expect(areWordsFuzzyMatching('cat', 'bat')).toBe(true);
      expect(areWordsFuzzyMatching('test', 'tast')).toBe(true);
    });

    it('should NOT match short words (3-4 chars) with 2+ typos', () => {
      expect(areWordsFuzzyMatching('cat', 'dog')).toBe(false);
      expect(areWordsFuzzyMatching('test', 'bark')).toBe(false); // 2+ typos
    });

    it('should match longer words (>4 chars) with up to 2 typos', () => {
      expect(areWordsFuzzyMatching('amsterdam', 'amsterdm')).toBe(true); // 1 typo
      expect(areWordsFuzzyMatching('rotterdam', 'rottedam')).toBe(true); // 2 typos
      expect(areWordsFuzzyMatching('utrecht', 'utrcht')).toBe(true); // 2 typos
    });

    it('should NOT match longer words (>4 chars) with 3+ typos', () => {
      expect(areWordsFuzzyMatching('amsterdam', 'berlin')).toBe(false); // Completely different
      expect(areWordsFuzzyMatching('rotterdam', 'paris')).toBe(false); // Completely different
    });

    it('should handle edge cases', () => {
      expect(areWordsFuzzyMatching('', '')).toBe(true);
      expect(areWordsFuzzyMatching('test', '')).toBe(false);
      expect(areWordsFuzzyMatching('', 'test')).toBe(false);
    });

    it('should normalize before matching', () => {
      expect(areWordsFuzzyMatching('New-York', 'newyork')).toBe(true);
      expect(areWordsFuzzyMatching('São Paulo', 'saopaulo')).toBe(true);
      expect(areWordsFuzzyMatching("O'Brien", 'obrien')).toBe(true);
    });

    it('should work with real game scenarios', () => {
      // Common typos players might make
      expect(areWordsFuzzyMatching('Amsterdam', 'Amsterdm')).toBe(true);
      expect(areWordsFuzzyMatching('Rotterdam', 'Roterdam')).toBe(true);
      expect(areWordsFuzzyMatching('Utrecht', 'Utrech')).toBe(true);

      // Different answers should not match
      expect(areWordsFuzzyMatching('Amsterdam', 'Rotterdam')).toBe(false);
      expect(areWordsFuzzyMatching('Paris', 'London')).toBe(false);
    });
  });
});
