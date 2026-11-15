export function eventPage(events, page = 1) {
  const sorted = [...events].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '') || Number(b.id) - Number(a.id));
  const pages = Math.max(1, Math.ceil(sorted.length / 15));
  const current = Math.max(1, Math.min(page, pages));
  return { rows: sorted.slice((current - 1) * 15, current * 15), current, pages, total: sorted.length };
}
