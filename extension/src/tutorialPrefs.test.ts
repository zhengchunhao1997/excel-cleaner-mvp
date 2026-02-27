import { describe, expect, it } from 'vitest';
import { shouldAutoShowTutorial, setTutorialNeverShow } from './tutorialPrefs';

const makeStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

describe('tutorialPrefs', () => {
  it('auto shows when not dismissed', () => {
    const ls = makeStorage();
    const ss = makeStorage();
    expect(shouldAutoShowTutorial(ls, ss)).toBe(true);
  });

  it('does not auto show again within same session', () => {
    const ls = makeStorage();
    const ss = makeStorage();
    expect(shouldAutoShowTutorial(ls, ss)).toBe(true);
    ss.setItem('tutorial_shown_session', '1');
    expect(shouldAutoShowTutorial(ls, ss)).toBe(false);
  });

  it('never shows when user selected never show', () => {
    const ls = makeStorage();
    const ss = makeStorage();
    setTutorialNeverShow(ls);
    expect(shouldAutoShowTutorial(ls, ss)).toBe(false);
  });
});

