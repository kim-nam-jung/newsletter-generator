import { describe, it, expect } from 'vitest';
import { escapeHtml, isValidUrl, isValidFilename, isValidId } from './index';

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('should handle multiple special characters', () => {
    expect(escapeHtml('<a href="x&y">')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;');
  });

  it('should return same string if nothing to escape', () => {
    expect(escapeHtml('plain text')).toBe('plain text');
  });
});

describe('isValidUrl', () => {
  it('should accept http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should accept https URLs', () => {
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('should accept mailto URLs', () => {
    expect(isValidUrl('mailto:user@example.com')).toBe(true);
  });

  it('should reject javascript: URLs', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('should reject ftp URLs', () => {
    expect(isValidUrl('ftp://server.com')).toBe(false);
  });

  it('should reject invalid strings', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('isValidFilename', () => {
  it('should accept normal filenames', () => {
    expect(isValidFilename('newsletter_01')).toBe(true);
  });

  it('should accept filenames with dots', () => {
    expect(isValidFilename('my.file.html')).toBe(true);
  });

  it('should reject filenames with backslash', () => {
    expect(isValidFilename('path\\file')).toBe(false);
  });

  it('should reject filenames with forward slash', () => {
    expect(isValidFilename('path/file')).toBe(false);
  });

  it('should reject filenames with colon', () => {
    expect(isValidFilename('file:name')).toBe(false);
  });

  it('should reject filenames with asterisk', () => {
    expect(isValidFilename('file*name')).toBe(false);
  });

  it('should reject filenames with question mark', () => {
    expect(isValidFilename('file?name')).toBe(false);
  });

  it('should reject filenames with angle brackets', () => {
    expect(isValidFilename('file<name>')).toBe(false);
  });

  it('should reject filenames with pipe', () => {
    expect(isValidFilename('file|name')).toBe(false);
  });

  it('should reject filenames with double quotes', () => {
    expect(isValidFilename('file"name')).toBe(false);
  });

  it('should reject path traversal (..)', () => {
    expect(isValidFilename('..hack')).toBe(false);
  });
});

describe('isValidId', () => {
  it('should accept alphanumeric IDs', () => {
    expect(isValidId('abc123')).toBe(true);
  });

  it('should accept IDs with underscores and hyphens', () => {
    expect(isValidId('my-id_01')).toBe(true);
  });

  it('should reject IDs with spaces', () => {
    expect(isValidId('has space')).toBe(false);
  });

  it('should reject IDs with special characters', () => {
    expect(isValidId('id@#$')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isValidId('')).toBe(false);
  });
});
