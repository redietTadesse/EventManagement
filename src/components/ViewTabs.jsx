import { useRef } from 'react';

export default function ViewTabs({ items, value, onChange, label, id }) {
  const buttons = useRef({});
  return <div role="tablist" aria-label={label} className="view-tabs">{items.map(([key, text, count], index) =>
    <button key={key} type="button" role="tab" id={`${id}-tab-${key}`} aria-controls={`${id}-panel-${key}`}
      aria-selected={value === key} tabIndex={value === key ? 0 : -1} ref={node => { buttons.current[key] = node; }}
      onClick={() => onChange(key)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index + items.length - 1) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
        if (next != null) { event.preventDefault(); onChange(items[next][0]); buttons.current[items[next][0]]?.focus(); }
      }}>{text}{count != null && <span>{count}</span>}</button>)}</div>;
}
