export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

export const shouldAutoShowTutorial = (localStorage: StorageLike, sessionStorage: StorageLike) => {
  const never = String(localStorage.getItem('tutorial_never_show') || '').trim();
  if (never === '1' || never.toLowerCase() === 'true') return false;

  const shown = String(sessionStorage.getItem('tutorial_shown_session') || '').trim();
  if (shown === '1' || shown.toLowerCase() === 'true') return false;

  return true;
};

export const markTutorialShownSession = (sessionStorage: StorageLike) => {
  sessionStorage.setItem('tutorial_shown_session', '1');
};

export const setTutorialNeverShow = (localStorage: StorageLike) => {
  localStorage.setItem('tutorial_never_show', '1');
};

