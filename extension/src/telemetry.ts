const API_ORIGIN = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';
const API_BASE = `${String(API_ORIGIN).replace(/\/+$/g, '')}/api`;

export const getClientId = () => {
  const key = 'excel_cleaner_client_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + '_' + Math.random().toString(16).slice(2);
  localStorage.setItem(key, id);
  return id;
};

export const trackEvent = async (type: string, props?: Record<string, unknown>) => {
  try {
    const payload = {
      type,
      ts: new Date().toISOString(),
      clientId: getClientId(),
      props: props || undefined,
    };
    await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
  }
};

export const submitFeedback = async (rating: number, comment: string, email?: string) => {
  const payload = {
    rating,
    comment,
    email,
    clientId: getClientId(),
  };
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const message = typeof json?.error === 'string' ? json.error : 'Request failed';
    throw new Error(message);
  }
};
