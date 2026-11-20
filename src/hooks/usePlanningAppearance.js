import { useSyncExternalStore } from 'react';

const key = 'aicc.appearance';
const changed = 'aicc-appearance-change';
let sessionChoice;
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');
const valid = value => ['light', 'dark', 'system'].includes(value);

function preference() {
  if (sessionChoice !== undefined) return sessionChoice;
  try {
    const saved = localStorage.getItem(key) ?? localStorage.getItem('aicc.planningAppearance');
    return valid(saved) ? saved : 'system';
  } catch { return 'system'; }
}

function snapshot() {
  const choice = preference();
  const resolved = choice === 'system' ? (media()?.matches ? 'dark' : 'light') : choice;
  return choice + '/' + resolved;
}

function subscribe(update) {
  const query = media();
  query?.addEventListener('change', update);
  window.addEventListener(changed, update);
  window.addEventListener('storage', update);
  return () => {
    query?.removeEventListener('change', update);
    window.removeEventListener(changed, update);
    window.removeEventListener('storage', update);
  };
}

function choose(value) {
  if (!valid(value)) return;
  try { localStorage.setItem(key, value); sessionChoice = undefined; }
  catch { sessionChoice = value; }
  window.dispatchEvent(new window.Event(changed));
}

export default function usePlanningAppearance() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'system/light');
  const [choice, appearance] = value.split('/');
  return { choice, appearance, choose };
}
