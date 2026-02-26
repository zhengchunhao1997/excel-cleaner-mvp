import { describe, expect, it } from 'vitest';
import { getDocsContent } from './docsContent';

describe('docsContent', () => {
  it('provides core sections in zh', () => {
    const d = getDocsContent('zh');
    const ids = d.sections.map((s) => s.id);
    expect(ids).toContain('quick_start');
    expect(ids).toContain('privacy');
    expect(ids).toContain('export');
  });

  it('provides core sections in en', () => {
    const d = getDocsContent('en');
    const ids = d.sections.map((s) => s.id);
    expect(ids).toContain('quick_start');
    expect(ids).toContain('privacy');
    expect(ids).toContain('export');
  });
});

