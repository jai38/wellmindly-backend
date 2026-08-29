import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../utils/escapeHtml';

describe('escapeHtml', () => {
  it('neutralises markup that would otherwise land in an email body', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('<a href="http://phish.example">click</a>')).toBe(
      '&lt;a href=&quot;http://phish.example&quot;&gt;click&lt;/a&gt;'
    );
  });

  it('escapes the ampersand first, so an entity is not double-decoded', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml('&lt;b&gt;')).toBe('&amp;lt;b&amp;gt;');
  });

  it('escapes both quote styles', () => {
    expect(escapeHtml(`he said "hi" and 'bye'`)).toBe(
      'he said &quot;hi&quot; and &#39;bye&#39;'
    );
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Anxiety and academic stress')).toBe('Anxiety and academic stress');
    expect(escapeHtml('multi\nline')).toBe('multi\nline');
  });

  it('renders null and undefined as an empty string rather than the word', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
});
