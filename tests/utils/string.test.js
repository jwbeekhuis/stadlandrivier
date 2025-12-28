import { describe, it, expect, beforeEach } from 'vitest';
import { escapeHtml, normalizeAnswer, pluralize } from '../../js/utils/string.js';

describe('String Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
      expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(escapeHtml('Test & "quotes" <tags>')).toBe('Test &amp; "quotes" &lt;tags&gt;');
    });

    it('should handle XSS payloads', () => {
      const xssPayloads = [
        { input: '<script>alert(document.cookie)</script>', shouldNotContain: '<script' },
        { input: '<img src=x onerror=alert(1)>', shouldNotContain: '<img' },
        { input: '<iframe src="javascript:alert(1)">', shouldNotContain: '<iframe' },
        { input: '<svg onload=alert(1)>', shouldNotContain: '<svg' },
        { input: '"><script>alert(1)</script>', shouldNotContain: '<script' },
        { input: '<a href="javascript:alert(1)">Click</a>', shouldNotContain: '<a' }
      ];

      xssPayloads.forEach(({ input, shouldNotContain }) => {
        const escaped = escapeHtml(input);
        expect(escaped).not.toContain(shouldNotContain);
      });
    });

    it('should handle empty and null values', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should preserve safe text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('123')).toBe('123');
      expect(escapeHtml('Amsterdam')).toBe('Amsterdam');
    });
  });

  describe('normalizeAnswer', () => {
    it('should convert to lowercase', () => {
      expect(normalizeAnswer('AMSTERDAM')).toBe('amsterdam');
      expect(normalizeAnswer('AmStErDaM')).toBe('amsterdam');
    });

    it('should remove accents', () => {
      expect(normalizeAnswer('café')).toBe('cafe');
      expect(normalizeAnswer('naïve')).toBe('naive');
      expect(normalizeAnswer('Zürich')).toBe('zurich');
      expect(normalizeAnswer('São Paulo')).toBe('saopaulo');
    });

    it('should remove non-alphanumeric characters', () => {
      expect(normalizeAnswer('New-York')).toBe('newyork');
      expect(normalizeAnswer('Saint Petersburg')).toBe('saintpetersburg');
      expect(normalizeAnswer("O'Brien")).toBe('obrien');
      expect(normalizeAnswer('test@123!')).toBe('test123');
    });

    it('should handle edge cases', () => {
      expect(normalizeAnswer('')).toBe('');
      expect(normalizeAnswer(null)).toBe('');
      expect(normalizeAnswer(undefined)).toBe('');
    });

    it('should combine all normalizations', () => {
      expect(normalizeAnswer('Café-München')).toBe('cafemunchen');
      expect(normalizeAnswer('São Paulo 123')).toBe('saopaulo123');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(pluralize(1, 'seconde', 'seconden')).toBe('seconde');
      expect(pluralize(1, 'second', 'seconds')).toBe('second');
      expect(pluralize(1, 'item', 'items')).toBe('item');
    });

    it('should return plural for count of 0', () => {
      expect(pluralize(0, 'seconde', 'seconden')).toBe('seconden');
      expect(pluralize(0, 'second', 'seconds')).toBe('seconds');
    });

    it('should return plural for count > 1', () => {
      expect(pluralize(2, 'seconde', 'seconden')).toBe('seconden');
      expect(pluralize(10, 'second', 'seconds')).toBe('seconds');
      expect(pluralize(100, 'item', 'items')).toBe('items');
    });

    it('should return plural for negative numbers', () => {
      expect(pluralize(-1, 'item', 'items')).toBe('items');
      expect(pluralize(-5, 'second', 'seconds')).toBe('seconds');
    });
  });
});
