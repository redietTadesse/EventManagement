export const EVENT_TYPES = [
  ['conference', 'Conference'], ['meeting', 'Meeting'], ['exhibition', 'Exhibition'],
  ['wedding', 'Wedding'], ['trade_show', 'Trade show'], ['concert', 'Concert'],
  ['gala', 'Gala'], ['seminar', 'Seminar'],
];

export const MAX_ATTENDEES = 2147483647;

export function tomorrowDateKey(now = new Date()) {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-');
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}

export function readEventPlan(params, earliestDate = tomorrowDateKey()) {
  const type = params.get('eventType');
  const start = params.get('date') || '';
  const end = params.get('endDate') || '';
  const count = params.get('attendees') || '';
  const date = isDate(start) && start >= earliestDate ? start : '';
  return {
    eventType: EVENT_TYPES.some(([value]) => value === type) ? type : 'conference',
    date,
    endDate: date && isDate(end) && end >= date ? end : '',
    attendees: /^[1-9]\d*$/.test(count) && Number(count) <= MAX_ATTENDEES ? count : '',
  };
}
