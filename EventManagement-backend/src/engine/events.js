let timelineId = 0;

export const createTimelineEntry = (eventId, actor, toStatus, description, fromStatus) => ({
  id: ++timelineId,
  eventId,
  timestamp: new Date().toISOString(),
  actor,
  fromStatus,
  toStatus,
  description,
});