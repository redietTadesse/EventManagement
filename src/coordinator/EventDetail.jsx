import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import PipelineLadder from '../components/PipelineLadder';
import AuditTimeline from '../components/AuditTimeline';
import VendorDecisionHistory from '../components/VendorTrailDrawer';
import ManualAssignModal from '../components/ManualAssignModal';
import VendorSuggestions from '../components/VendorSuggestions';
import EventReadinessWidget from '../components/EventReadinessWidget';
import ChangeDateModal from '../components/ChangeDateModal';

import { useApp } from '../context/AppContext';
import api from '../api/axios';

const RESOLVED_ASSIGNMENT_STATUSES = new Set(['ACCEPTED', 'COMPLETED']);
const EXHAUSTED_ASSIGNMENT_STATUSES = new Set(['DECLINED', 'EXPIRED', 'OPEN', 'CANCELLED']);

function getCategoryRollup(category, assignmentsByCategory) {
  const attempts = [...(assignmentsByCategory[category] || [])]
    .sort((left, right) => Number(left.id || 0) - Number(right.id || 0));
  const resolvedAttempt = attempts.find(attempt => RESOLVED_ASSIGNMENT_STATUSES.has(attempt.status));
  if (resolvedAttempt) return { category, state: 'resolved' };

  const latest = attempts.at(-1);
  if (!latest) return { category, state: 'exhausted', reason: 'no vendor offer exists' };
  if (latest.status === 'PENDING') {
    return { category, state: 'pending', vendorName: latest.vendorName || 'a vendor' };
  }

  const reasonByStatus = {
    OPEN: 'the vendor-pool offer is unclaimed',
    DECLINED: `the latest offer${latest.vendorName ? ` to ${latest.vendorName}` : ''} was declined`,
    EXPIRED: `the latest offer${latest.vendorName ? ` to ${latest.vendorName}` : ''} expired`,
    CANCELLED: 'the latest vendor offer was cancelled',
  };
  return {
    category,
    state: 'exhausted',
    reason: reasonByStatus[latest.status] || 'there is no active vendor offer',
  };
}

function getEventStatusReason(status, categoryRollups) {
  const exhausted = categoryRollups.filter(category => category.state === 'exhausted');
  const pending = categoryRollups.filter(category => category.state === 'pending');
  const total = categoryRollups.length;
  const list = values => values.length === 1
    ? values[0]
    : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
  const label = value => value.replace(/_/g, ' ');

  if (status === 'NEEDS_COORDINATOR') {
    const blockers = exhausted.map(category => `${label(category.category)}: ${category.reason}`);
    const waiting = pending.map(category => `${label(category.category)} is awaiting a response from ${category.vendorName}`);
    const detail = blockers.length ? list(blockers) : 'one or more required categories have no active offer';
    const waitingText = waiting.length ? ` ${list(waiting)}.` : '';
    return `Needs coordinator because ${detail}.${waitingText} Confirmation requires an accepted or completed assignment in every required service category.`;
  }
  if (status === 'AWAITING_VENDORS') {
    const waiting = pending.map(category => `${label(category.category)} is awaiting a response from ${category.vendorName}`);
    const detail = waiting.length ? list(waiting) : 'vendor coordination is still in progress';
    return `Awaiting vendors because ${detail}. Confirmation requires every required service category to have an accepted or completed assignment.`;
  }
  if (status === 'CONFIRMED') {
    return total
      ? `Confirmed because all ${total} required service ${total === 1 ? 'category has' : 'categories have'} an accepted or completed assignment.`
      : 'Confirmed; no unresolved external vendor categories are recorded for this event.';
  }
  if (status === 'EVENT_CREATED') return 'The event exists, but vendor coordination has not yet reached its final rollup.';
  if (status === 'COMPLETED') return 'The event is recorded as completed.';
  if (status === 'CANCELLED') return 'The event is cancelled; its active vendor assignments and venue booking have been released.';
  if (status === 'CLOSED') return 'The event workflow is closed.';
  return 'Review the event lifecycle and required services below.';
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    fetchAssignmentsForEvent,
    forceAssign,
    manuallyAssignForEvent,
    fetchEventHistory,
    fetchChecklist,
    createChecklist,
    updateChecklist,
    regenerateChecklist,
    toggleChecklistItem,
  } = useApp();

  const [event, setEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceAssignModal, setForceAssignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [checklistError, setChecklistError] = useState('');
  const [checklistNotice, setChecklistNotice] = useState('');
  const [checklistEditor, setChecklistEditor] = useState(null);
  const [checklistForm, setChecklistForm] = useState({
    itemName: '', dueDate: '', ownerRole: 'COORDINATOR', dependencyIds: [],
  });
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistGenerating, setChecklistGenerating] = useState(false);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [alternativesByCategory, setAlternativesByCategory] = useState({});
  const [excludedVendorsByCategory, setExcludedVendorsByCategory] = useState({});
  const [decisionLoadingByCategory, setDecisionLoadingByCategory] = useState({});
  const [decisionErrorByCategory, setDecisionErrorByCategory] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategoryForSuggestions, setSelectedCategoryForSuggestions] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [readinessRefresh, setReadinessRefresh] = useState(0);
  const [venueOptions, setVenueOptions] = useState([]);
  const [venueOptionsLoading, setVenueOptionsLoading] = useState(false);
  const [venueOptionsError, setVenueOptionsError] = useState('');
  const [venueOptionsExpanded, setVenueOptionsExpanded] = useState(true);
  const [assigningVenueId, setAssigningVenueId] = useState(null);
  const [refreshingOperations, setRefreshingOperations] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const isMounted = useRef(true);
  const venueRequestId = useRef(0);
  const decisionHistoryRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      venueRequestId.current += 1;
    };
  }, []);

  const loadVenueOptions = useCallback(async (eventRecord) => {
    const requestId = ++venueRequestId.current;
    if (!eventRecord?.date) {
      if (isMounted.current && requestId === venueRequestId.current) {
        setVenueOptions([]);
        setVenueOptionsError('An event date is required to evaluate venue availability.');
      }
      return;
    }
    if (isMounted.current) setVenueOptionsLoading(true);
    try {
      const response = await api.get('/venues/availability/explanations', {
        params: {
          date: eventRecord.date,
          endDate: eventRecord.endDate || eventRecord.date,
          attendees: eventRecord.expectedAttendees,
          excludeEventId: eventRecord.id,
        },
      });
      if (isMounted.current && requestId === venueRequestId.current) {
        setVenueOptions(response.data || []);
        setVenueOptionsError('');
      }
    } catch (err) {
      if (isMounted.current && requestId === venueRequestId.current) {
        setVenueOptionsError(err.response?.data?.message || 'Venue fit could not be evaluated.');
      }
    } finally {
      if (isMounted.current && requestId === venueRequestId.current) setVenueOptionsLoading(false);
    }
  }, []);

useEffect(() => {
  let active = true;
  if (!event?.date || !event?.id) {
    setAlternativesByCategory({});
    setExcludedVendorsByCategory({});
    setDecisionLoadingByCategory({});
    setDecisionErrorByCategory({});
    return () => { active = false; };
  }
  const byCat = assignments.reduce((acc, a) => {
    (acc[a.serviceCategory] = acc[a.serviceCategory] || []).push(a);
    return acc;
  }, {});
  const categories = [...new Set([...(event.requiredCategories || []), ...Object.keys(byCat)])];
  setAlternativesByCategory(prev => ({ ...prev, ...Object.fromEntries(categories.map(cat => [cat, []])) }));
  setExcludedVendorsByCategory(prev => ({ ...prev, ...Object.fromEntries(categories.map(cat => [cat, []])) }));
  setDecisionLoadingByCategory(prev => ({ ...prev, ...Object.fromEntries(categories.map(cat => [cat, true])) }));
  setDecisionErrorByCategory(prev => ({ ...prev, ...Object.fromEntries(categories.map(cat => [cat, ''])) }));

  Promise.all(categories.map(async category => {
    try {
      const response = await api.get(
        `/vendor-suggestions/event/${event.id}/category/${encodeURIComponent(category)}/decision-preview`
      );
      if (!active) return;
      const eligible = (response.data?.eligible || []).map(candidate => ({
        ...candidate,
        id: candidate.vendorId,
        score: candidate.score,
        rating: candidate.rating,
      }));
      setAlternativesByCategory(prev => ({ ...prev, [category]: eligible }));
      setExcludedVendorsByCategory(prev => ({ ...prev, [category]: response.data?.excluded || [] }));
    } catch {
      if (!active) return;
      setDecisionErrorByCategory(prev => ({ ...prev, [category]: 'Eligibility could not be refreshed. Retry the event data before assigning.' }));
    } finally {
      if (active) setDecisionLoadingByCategory(prev => ({ ...prev, [category]: false }));
    }
  }));
  return () => { active = false; };
}, [assignments, event?.date, event?.id, event?.requiredCategories]);

useEffect(() => {
    let cancelled = false;
    const loadEvent = async () => {
      setLoading(true);
      try {
        const eventResponse = await api.get(`/events/${id}`);
        if (cancelled) return;
        const eventRecord = eventResponse.data;
        const assignmentsData = await fetchAssignmentsForEvent(id);
        if (cancelled) return;
        let inquiry = {};
        if (eventRecord.inquiryId) {
          try {
            const inquiryResponse = await api.get(`/inquiries/${eventRecord.inquiryId}`);
            inquiry = inquiryResponse.data || {};
          } catch {
            // Inquiry context is useful but optional; keep the event and assignment sections available.
          }
        }
        if (cancelled) return;
        const currentAssignments = assignmentsData || [];
        setAssignments(currentAssignments);
        const nextEvent = {
          id: eventRecord.id,
          inquiryId: eventRecord.inquiryId,
          name: eventRecord.name,
          status: eventRecord.status,
          date: inquiry.eventDate || currentAssignments[0]?.eventDate,
          endDate: inquiry.endDate,
          venue: eventRecord.venue,
          venueId: eventRecord.venueId,
          requiredCategories: eventRecord.requiredCategories || [],
          clientName: inquiry.clientName || currentAssignments[0]?.eventClientName,
          expectedAttendees: inquiry.expectedAttendees || currentAssignments[0]?.expectedAttendees,
        };
        setEvent(nextEvent);
        void loadVenueOptions(nextEvent);

        // Checklist is an independent section: its failure should not hide event details.
        setChecklistLoading(true);
        try {
          const checklistData = await fetchChecklist(eventRecord.id || id);
          if (cancelled) return;
          setChecklist(checklistData || []);
          setChecklistError('');
        } catch {
          if (cancelled) return;
          setChecklistError('Could not load the event checklist. Try again.');
        } finally {
          if (!cancelled) setChecklistLoading(false);
        }


        setError('');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load event details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEvent();
    return () => { cancelled = true; };
  }, [id, fetchAssignmentsForEvent, fetchChecklist, loadVenueOptions]);

  const handleForceAssign = async (assignmentId, vendorId, category, reason) => {
    const overrideReason = reason?.trim() || window.prompt('Why are you choosing this vendor?')?.trim();
    if (!overrideReason) return;

    try {
      const targetAssignment = assignmentId || selectedAssignment?.id
        || assignments.find(assignment => assignment.serviceCategory === category && assignment.status === 'OPEN')?.id;
      const targetIsOpen = assignments.some(assignment =>
        String(assignment.id) === String(targetAssignment) && assignment.status === 'OPEN'
      );
      if (targetAssignment && targetIsOpen) {
        await forceAssign(targetAssignment, vendorId, category, overrideReason);
      } else {
        await manuallyAssignForEvent(event?.id || id, vendorId, category, overrideReason);
      }
      setForceAssignModal(false);
      setSelectedAssignment(null);
      await reloadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to force assign vendor');
    }
  };


  // Group assignments by service category
  const assignmentsByCategory = assignments.reduce((acc, assignment) => {
    const category = assignment.serviceCategory || 'Unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(assignment);
    return acc;
  }, {});

  // Check for unfilled categories
  const requiredCategories = [...new Set([...(event?.requiredCategories || []), ...Object.keys(assignmentsByCategory)])];
  const unfilledCategories = requiredCategories.filter(category => {
    const categoryAssignments = assignmentsByCategory[category] || [];
    return !categoryAssignments.some(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED');
  });

  const acceptedCount = assignments.filter(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED').length;
  const totalCategories = requiredCategories.length;
  const statusReason = getEventStatusReason(
    event?.status,
    requiredCategories.map(category => getCategoryRollup(category, assignmentsByCategory)),
  );

  const scrollToDecisionHistory = () => decisionHistoryRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });

  if (loading) {
    return (
      <Layout title="Event Detail">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  if (error && !event) {
    return (
      <Layout title="Event Detail">
        <div className="bg-rose-100 text-rose-700 p-4 rounded-lg">{error}</div>
        <button onClick={() => navigate('/coordinator/events')} className="mt-4 text-indigo-600 text-sm">
          ← Back to events
        </button>
      </Layout>
    );
  }

  const reloadAll = async () => {
    const [eventResponse, assignmentsData] = await Promise.all([
      api.get(`/events/${id}`),
      fetchAssignmentsForEvent(id),
    ]);
    const eventRecord = eventResponse.data;
    let inquiry = {};
    if (eventRecord.inquiryId) {
      try {
        const inquiryResponse = await api.get(`/inquiries/${eventRecord.inquiryId}`);
        inquiry = inquiryResponse.data || {};
      } catch {
        // Keep the current inquiry-derived context if that optional endpoint is temporarily unavailable.
      }
    }
    const currentAssignments = assignmentsData || [];
    setAssignments(currentAssignments);
    const nextEvent = {
      id: eventRecord.id,
      inquiryId: eventRecord.inquiryId,
      name: eventRecord.name,
      status: eventRecord.status,
      date: inquiry.eventDate || currentAssignments[0]?.eventDate || event?.date,
      endDate: inquiry.endDate || event?.endDate,
      venue: eventRecord.venue,
      venueId: eventRecord.venueId,
      requiredCategories: eventRecord.requiredCategories || [],
      clientName: inquiry.clientName || currentAssignments[0]?.eventClientName,
      expectedAttendees: inquiry.expectedAttendees || currentAssignments[0]?.expectedAttendees || event?.expectedAttendees,
    };
    setEvent(nextEvent);
    void loadVenueOptions(nextEvent);
    setChecklistLoading(true);
    try {
      const checklistData = await fetchChecklist(id);
      setChecklist(checklistData || []);
      setChecklistError('');
    } catch {
      setChecklistError('Could not refresh the event checklist. Your previous data is still shown.');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleRefreshOperations = async () => {
    setRefreshingOperations(true);
    setRefreshError('');
    try {
      await reloadAll();
      setReadinessRefresh(value => value + 1);
    } catch (err) {
      setRefreshError(err.response?.data?.message || 'Event and assignment data could not be refreshed. Previously loaded data remains visible.');
    } finally {
      setRefreshingOperations(false);
    }
  };

  const startChecklistCreate = () => {
    setChecklistNotice('');
    setChecklistEditor('new');
    setChecklistForm({ itemName: '', dueDate: '', ownerRole: 'COORDINATOR', dependencyIds: [] });
  };

  const startChecklistEdit = (item) => {
    setChecklistNotice('');
    setChecklistEditor(item.id);
    setChecklistForm({
      itemName: item.itemName || '',
      dueDate: item.dueDate || '',
      ownerRole: item.ownerRole || 'COORDINATOR',
      dependencyIds: item.dependencyIds || [],
    });
  };

  const handleChecklistSave = async (eventObject) => {
    eventObject.preventDefault();
    setChecklistSaving(true);
    setChecklistError('');
    try {
      if (checklistEditor === 'new') {
        const created = await createChecklist({
          eventId: event?.id || id,
          itemName: checklistForm.itemName.trim(),
          dueDate: checklistForm.dueDate || null,
          ownerRole: checklistForm.ownerRole,
          dependencyIds: checklistForm.dependencyIds,
        });
        setChecklist(prev => [...prev, created]);
      } else {
        const updated = await updateChecklist(checklistEditor, {
          itemName: checklistForm.itemName.trim(),
          dueDate: checklistForm.dueDate || null,
          clearDueDate: !checklistForm.dueDate,
          ownerRole: checklistForm.ownerRole,
          dependencyIds: checklistForm.dependencyIds,
        });
        setChecklist(prev => prev.map(task => task.id === updated.id ? updated : task));
      }
      setChecklistError('');
      setChecklistEditor(null);
      setChecklistNotice(checklistEditor === 'new' ? 'Task added.' : 'Task updated.');
    } catch (err) {
      setChecklistError(err.response?.data?.message || 'Could not save this checklist task.');
    } finally {
      setChecklistSaving(false);
    }
  };

  const handleChecklistRegenerate = async () => {
    setChecklistGenerating(true);
    setChecklistError('');
    setChecklistNotice('');
    try {
      const refreshed = await regenerateChecklist(event?.id || id);
      setChecklist(refreshed || []);
      setChecklistNotice('Missing template tasks were added. Existing tasks were preserved.');
    } catch (err) {
      setChecklistError(err.response?.data?.message || 'Could not add missing template tasks.');
    } finally {
      setChecklistGenerating(false);
    }
  };

  const handleVenueAssign = async (venueOption) => {
    setAssigningVenueId(venueOption.venueId);
    setVenueOptionsError('');
    try {
      const response = await api.put(`/events/${event.id}`, {
        venueId: venueOption.venueId,
        venue: venueOption.name,
      });
      setEvent(current => current ? {
        ...current,
        venue: response.data?.venue || venueOption.name,
        venueId: response.data?.venueId || venueOption.venueId,
      } : current);
      setReadinessRefresh(value => value + 1);
      try {
        await reloadAll();
      } catch {
        setRefreshError('Venue assigned successfully, but some event details could not be refreshed. Use “Refresh event data” to retry.');
      }
    } catch (err) {
      setVenueOptionsError(err.response?.data?.message || 'The venue could not be assigned. Recheck availability and try again.');
    } finally {
      setAssigningVenueId(null);
    }
  };

  return (
    <Layout title="Event Detail">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <EventReadinessWidget eventId={event?.id || id} refreshKey={readinessRefresh} />
          {/* Event Header Card */}
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                  <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 self-start">
                    ← Back
                  </button>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">{event?.name}</h1>
                  {event?.status && <StatusBadge status={event.status} size="lg" showIcon />}
                </div>
                <p className="text-sm text-gray-600">
                  {acceptedCount} vendor offers accepted. {unfilledCategories.length} service categor{unfilledCategories.length === 1 ? 'y needs' : 'ies need'} attention.
                </p>
                <p role="status" className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
                  {statusReason}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!['CANCELLED', 'COMPLETED', 'CLOSED'].includes(event?.status) && (
                <button
                  onClick={() => setShowDateModal(true)}
                  className="text-sm text-indigo-700 hover:text-indigo-800 px-3 py-2 border border-indigo-300 rounded-lg"
                >
                  Change date
                </button>
                )}
<button
                          onClick={async () => {
                            if (!confirm('Cancel this event? This cannot be undone.')) return;
                            try {
                              await api.patch(`/events/${event.id}/status`, null, {
                                params: { status: 'CANCELLED' }
                              });
                              window.location.reload();
                            } catch (err) {
                              setError(err.response?.data?.message || 'Failed to cancel event');
                            }
                          }}
                          className="text-sm text-rose-600 hover:text-rose-700 px-3 py-2 border border-rose-300 rounded-lg"
                        >
                          Cancel event
                        </button>
                        {event?.status === 'CONFIRMED' && (
                          <button
                            onClick={async () => {
                              if (!confirm('Mark this event as COMPLETED?')) return;
                              try {
                                await api.patch(`/events/${event.id}/status`, null, {
                                  params: { status: 'COMPLETED' }
                                });
                                window.location.reload();
                              } catch (err) {
                                setError(err.response?.data?.message || 'Failed to complete event');
                              }
                            }}
                            className="text-sm text-emerald-600 hover:text-emerald-700 px-3 py-2 border border-emerald-300 rounded-lg"
                          >
                            Complete event
                          </button>
                        )}
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setVenueOptionsExpanded(value => !value)}
                aria-expanded={venueOptionsExpanded}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Venue fit and alternatives</span>
                  <span className="block text-xs text-gray-500">
                    Current: {event?.venue || 'No venue assigned'}
                    {event?.expectedAttendees ? ` · ${event.expectedAttendees} attendees · ${event.date}` : event?.date ? ` · ${event.date}` : ''}
                  </span>
                </span>
                <span className="text-xs text-indigo-700">
                  {venueOptionsLoading ? 'Checking…' : `${venueOptions.filter(option => option.eligible).length} eligible`}
                  {' · '}{venueOptionsExpanded ? 'Hide' : 'Review'}
                </span>
              </button>
              {venueOptionsExpanded && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-gray-500">
                    Availability includes the configured setup and teardown buffer. The current event is excluded from its own conflict check.
                  </p>
                  {venueOptionsError && (
                    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                      <span>{venueOptionsError}</span>
                      <button type="button" onClick={() => loadVenueOptions(event)} className="underline">Retry</button>
                    </div>
                  )}
                  {venueOptionsLoading && venueOptions.length === 0 && <p role="status" className="text-sm text-gray-500">Checking venue capacity and calendar…</p>}
                  {!venueOptionsLoading && venueOptions.length === 0 && !venueOptionsError && (
                    <p className="text-sm text-gray-500">No venues are registered yet.</p>
                  )}
                  {[...venueOptions]
                    .sort((a, b) => Number(b.eligible) - Number(a.eligible)
                      || Number(String(b.venueId) === String(event?.venueId)) - Number(String(a.venueId) === String(event?.venueId)))
                    .map(option => {
                      const isCurrent = String(option.venueId) === String(event?.venueId);
                      return (
                        <div key={option.venueId} className={`rounded-lg border p-3 ${option.eligible ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {option.name}{isCurrent ? ' · Current venue' : ''}
                              </p>
                              <p className="text-xs text-gray-500">
                                {option.capacity == null ? 'Capacity not configured' : `Capacity ${option.capacity}`}
                                {option.location ? ` · ${option.location}` : ''}
                                {` · Block window ${option.blockedFrom} to ${option.blockedThrough}`}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${option.eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {option.eligible ? 'Eligible' : 'Unavailable'}
                            </span>
                          </div>
                          <ul className="mt-2 space-y-1 text-xs text-gray-600">
                            {(option.explanation || []).map((reason, index) => <li key={`${option.venueId}-${index}`}>• {reason}</li>)}
                          </ul>
                          {option.eligible && !isCurrent && !['CANCELLED', 'COMPLETED', 'CLOSED'].includes(event?.status) && (
                            <button
                              type="button"
                              onClick={() => handleVenueAssign(option)}
                              disabled={assigningVenueId != null}
                              className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {assigningVenueId === option.venueId ? 'Assigning venue…' : event?.venueId ? 'Move event to this venue' : 'Assign this venue'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg">{error}</div>}
          {refreshError && <div role="alert" className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm">{refreshError}</div>}

          {/* Pipeline Visualization */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-800">Vendor Pipeline</h3>
                <p className="mt-1 text-xs text-gray-500">Eligible vendors pass the event-specific checks. Match score weights quality 50%, workload 40%, and rotation 10%.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRefreshOperations}
                  disabled={refreshingOperations}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {refreshingOperations ? 'Refreshing…' : 'Refresh event data'}
                </button>
                <button
                  type="button"
                  onClick={scrollToDecisionHistory}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Decision history
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {requiredCategories.map(category => (
                <PipelineLadder
                  key={category}
                  category={category}
                  assignments={assignmentsByCategory[category] || []}
                  alternativeVendors={alternativesByCategory[category] || []}
                  excludedVendors={excludedVendorsByCategory[category] || []}
                  decisionLoading={Boolean(decisionLoadingByCategory[category])}
                  decisionError={decisionErrorByCategory[category] || ''}
                  onForceAssign={handleForceAssign}
                />
              ))}
            </div>
          </div>

          <div ref={decisionHistoryRef} className="scroll-mt-6">
            <VendorDecisionHistory eventId={event?.id || id} />
          </div>

          {/* Checklist Section */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <button
              onClick={() => setChecklistExpanded(!checklistExpanded)}
              className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50"
              aria-expanded={checklistExpanded}
            >
              <h3 className="font-medium text-gray-800">Event Checklist</h3>
              <span className="text-sm text-gray-500">
                {checklistLoading && checklist.length === 0
                  ? 'Loading tasks…'
                  : `${checklist.filter(c => c.isComplete).length} of ${checklist.length} complete`}
              </span>
            </button>
            {checklistExpanded && (
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    onClick={startChecklistCreate}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg"
                  >
                    Add task
                  </button>
                  <button
                    type="button"
                    onClick={handleChecklistRegenerate}
                    disabled={checklistGenerating}
                    className="text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 px-3 py-2 rounded-lg"
                  >
                    {checklistGenerating ? 'Checking templates…' : 'Add missing template tasks'}
                  </button>
                  {checklistLoading && checklist.length > 0 && (
                    <span className="self-center text-xs text-gray-500" role="status">Refreshing; current tasks remain visible.</span>
                  )}
                </div>

                {checklistError && (
                  <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                    {checklistError}
                    <button
                      type="button"
                      onClick={reloadAll}
                      className="ml-2 underline"
                    >Retry</button>
                  </div>
                )}
                {checklistNotice && <p className="mb-3 text-sm text-emerald-700" role="status">{checklistNotice}</p>}

                {checklist.length > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4" aria-label="Checklist completion">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(checklist.filter(c => c.isComplete).length / checklist.length) * 100}%`
                      }}
                    />
                  </div>
                )}

                {checklistLoading && checklist.length === 0 ? (
                  <p className="py-4 text-sm text-gray-500" role="status">Loading checklist tasks…</p>
                ) : checklist.length === 0 ? (
                  <p className="py-4 text-sm text-gray-500">No checklist tasks yet. Add a task or add the missing template tasks.</p>
                ) : (
                  <ul className="space-y-3">
                    {checklist.map(item => {
                      const prerequisiteIds = item.dependencyIds || [];
                      const prerequisites = prerequisiteIds.map(dependencyId => checklist.find(task => task.id === dependencyId)).filter(Boolean);
                      const incompletePrerequisites = prerequisites.filter(task => !task.isComplete);
                      const hasCompletedDependents = checklist.some(task =>
                        task.isComplete && (task.dependencyIds || []).includes(item.id)
                      );
                      const isEditing = checklistEditor === item.id;
                      return (
                        <li key={item.id} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(item.isComplete)}
                              disabled={(!item.isComplete && incompletePrerequisites.length > 0) || (item.isComplete && hasCompletedDependents)}
                              onChange={async () => {
                                setChecklistError('');
                                try {
                                  const updated = await toggleChecklistItem(item.id, !item.isComplete);
                                  setChecklist(prev => prev.map(task => task.id === item.id ? updated : task));
                                } catch (err) {
                                  setChecklistError(err.response?.data?.message || 'Failed to update checklist task.');
                                }
                              }}
                              aria-label={`${item.isComplete ? 'Mark incomplete' : 'Mark complete'}: ${item.itemName}`}
                              className="mt-1 w-4 h-4 text-emerald-600 rounded disabled:opacity-40"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={`text-sm font-medium ${item.isComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {item.itemName}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-xs ${item.isComplete ? 'bg-emerald-50 text-emerald-700' : incompletePrerequisites.length ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.isComplete ? 'Complete' : incompletePrerequisites.length ? 'Blocked' : 'Pending'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => isEditing ? setChecklistEditor(null) : startChecklistEdit(item)}
                                    className="text-xs text-indigo-700 hover:underline"
                                  >
                                    {isEditing ? 'Cancel edit' : 'Edit'}
                                  </button>
                                </div>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                <span>Due: {item.dueDate || 'No due date'}</span>
                                <span>Owner role: {item.ownerRole || 'COORDINATOR'}</span>
                                <span>{item.generated ? 'Generated task' : 'Manual task'}</span>
                              </div>
                              {prerequisites.length > 0 && (
                                <p className="mt-1 text-xs text-gray-600">
                                  Prerequisites: {prerequisites.map(task => task.itemName).join(', ')}
                                </p>
                              )}
                              {incompletePrerequisites.length > 0 && (
                                <p className="mt-1 text-xs text-amber-800">
                                  Blocked until complete: {incompletePrerequisites.map(task => task.itemName).join(', ')}
                                </p>
                              )}
                              {item.isComplete && hasCompletedDependents && (
                                <p className="mt-1 text-xs text-gray-600">Mark completed dependent tasks incomplete before reopening this prerequisite.</p>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <form onSubmit={handleChecklistSave} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 md:grid-cols-2">
                              <label className="text-xs font-medium text-gray-600 md:col-span-2">
                                Task name
                                <input
                                  required
                                  maxLength={255}
                                  value={checklistForm.itemName}
                                  onChange={eventObject => setChecklistForm(form => ({ ...form, itemName: eventObject.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-800"
                                />
                              </label>
                              <label className="text-xs font-medium text-gray-600">
                                Due date
                                <input
                                  type="date"
                                  value={checklistForm.dueDate}
                                  onChange={eventObject => setChecklistForm(form => ({ ...form, dueDate: eventObject.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-800"
                                />
                              </label>
                              <label className="text-xs font-medium text-gray-600">
                                Responsible role
                                <select
                                  value={checklistForm.ownerRole}
                                  onChange={eventObject => setChecklistForm(form => ({ ...form, ownerRole: eventObject.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-800"
                                >
                                  {['COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR'].map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                              </label>
                              <label className="text-xs font-medium text-gray-600 md:col-span-2">
                                Prerequisites (optional)
                                <select
                                  multiple
                                  value={checklistForm.dependencyIds.map(String)}
                                  onChange={eventObject => setChecklistForm(form => ({
                                    ...form,
                                    dependencyIds: Array.from(eventObject.target.selectedOptions, option => Number(option.value)),
                                  }))}
                                  className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-800"
                                >
                                  {checklist.filter(task => task.id !== item.id).map(task => (
                                    <option key={task.id} value={task.id}>{task.itemName}</option>
                                  ))}
                                </select>
                                <span className="mt-1 block font-normal text-gray-500">Hold Ctrl (Windows) or Command (Mac) to select more than one. Circular or cross-event dependencies are rejected by the server.</span>
                              </label>
                              <div className="flex gap-2 md:col-span-2">
                                <button type="submit" disabled={checklistSaving} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">
                                  {checklistSaving ? 'Saving…' : 'Save task'}
                                </button>
                                <button type="button" onClick={() => setChecklistEditor(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
                              </div>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {checklistEditor === 'new' && (
                  <form onSubmit={handleChecklistSave} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 md:grid-cols-2">
                    <h4 className="text-sm font-semibold text-gray-800 md:col-span-2">New checklist task</h4>
                    <label className="text-xs font-medium text-gray-600 md:col-span-2">
                      Task name
                      <input
                        required
                        maxLength={255}
                        value={checklistForm.itemName}
                        onChange={eventObject => setChecklistForm(form => ({ ...form, itemName: eventObject.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Due date
                      <input type="date" value={checklistForm.dueDate} onChange={eventObject => setChecklistForm(form => ({ ...form, dueDate: eventObject.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800" />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Responsible role
                      <select value={checklistForm.ownerRole} onChange={eventObject => setChecklistForm(form => ({ ...form, ownerRole: eventObject.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800">
                        {['COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR'].map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-gray-600 md:col-span-2">
                      Prerequisites (optional)
                      <select multiple value={checklistForm.dependencyIds.map(String)} onChange={eventObject => setChecklistForm(form => ({ ...form, dependencyIds: Array.from(eventObject.target.selectedOptions, option => Number(option.value)) }))} className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800">
                        {checklist.map(task => <option key={task.id} value={task.id}>{task.itemName}</option>)}
                      </select>
                      <span className="mt-1 block font-normal text-gray-500">Select a task that must be completed first.</span>
                    </label>
                    <div className="flex gap-2 md:col-span-2">
                      <button type="submit" disabled={checklistSaving} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{checklistSaving ? 'Saving…' : 'Add task'}</button>
                      <button type="button" onClick={() => setChecklistEditor(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <AuditTimeline referenceType="EVENT" referenceId={id} expandedByDefault={true} />

        </div>

        {/* Right Sidebar - Assignments Needing Action */}
        <div className="lg:sticky lg:top-6 space-y-6">
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Needs Attention</h3>
            {unfilledCategories.length === 0 ? (
              <p className="text-sm text-gray-500">All categories filled</p>
            ) : (
              <div className="space-y-3">
                {unfilledCategories.map(category => {
                  const categoryAssignments = assignmentsByCategory[category] || [];
                  const openAssignment = categoryAssignments.find(a => a.status === 'OPEN');
                  const pendingAssignment = categoryAssignments.find(a => a.status === 'PENDING');
                  const declinedCount = categoryAssignments.filter(a => a.status === 'DECLINED').length;

                  return (
                    <div key={category} className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                      <p className="font-medium text-rose-800 text-sm">{category}</p>
                      <p className="text-xs text-rose-600 mt-1">
                        {pendingAssignment
                          ? `Offer sent to ${pendingAssignment.vendorName || 'a vendor'}; waiting for a response.`
                          : `${declinedCount > 0 ? `${declinedCount} vendor${declinedCount === 1 ? '' : 's'} declined. ` : ''}${openAssignment ? 'Open vendor-pool offer; no claim yet.' : 'No active vendor offer. Coordinator action is available.'}`}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {!pendingAssignment && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedAssignment(openAssignment || { serviceCategory: category, status: 'UNASSIGNED' });
                                setForceAssignModal(true);
                              }}
                              className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded font-medium"
                            >
                              Assign vendor
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategoryForSuggestions(category);
                                setShowSuggestions(true);
                              }}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded font-medium"
                            >
                              Review suggestions
                            </button>
                          </>
                        )}
                        {pendingAssignment && (
                          <button type="button" onClick={scrollToDecisionHistory} className="text-xs text-indigo-700 underline">
                            View decision history
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vendor Suggestions Panel */}
          {showSuggestions && selectedCategoryForSuggestions && (
            <div className="bg-white rounded-xl shadow p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  Vendor Suggestions for {selectedCategoryForSuggestions}
                </h3>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <VendorSuggestions
                category={selectedCategoryForSuggestions}
                eventDate={event?.date}
                eventId={event?.id || id}
                excludeVendorId={assignmentsByCategory[selectedCategoryForSuggestions]?.find(a => a.status === 'ACCEPTED')?.vendorId}
                onSelectVendor={(vendor) => {
                  const assignment = (assignmentsByCategory[selectedCategoryForSuggestions] || []).find(a => a.status === 'OPEN');
                  const reason = window.prompt('Why are you choosing this vendor?');
                  if (reason?.trim()) {
                    handleForceAssign(assignment?.id, vendor.id, selectedCategoryForSuggestions, reason.trim());
                    setShowSuggestions(false);
                  }
                }}
                actionLabel="Assign vendor"
              />
            </div>
          )}

          {/* Assignment Status Summary */}
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Status Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Open</span>
                <span className="text-sm font-bold text-orange-600">
                  {assignments.filter(a => a.status === 'OPEN').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-sm font-bold text-amber-600">
                  {assignments.filter(a => a.status === 'PENDING').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accepted</span>
                <span className="text-sm font-bold text-emerald-600">
                  {assignments.filter(a => a.status === 'ACCEPTED').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Declined</span>
                <span className="text-sm font-bold text-rose-600">
                  {assignments.filter(a => a.status === 'DECLINED').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ManualAssignModal
        isOpen={forceAssignModal}
        onClose={() => {
          setForceAssignModal(false);
          setSelectedAssignment(null);
        }}
        onAssign={async (vendorId, reason) => {
          await handleForceAssign(
            selectedAssignment?.id,
            vendorId,
            selectedAssignment?.serviceCategory,
            reason
          );
        }}
        availableVendors={selectedAssignment ? alternativesByCategory[selectedAssignment.serviceCategory] || [] : []}
        loading={Boolean(selectedAssignment && decisionLoadingByCategory[selectedAssignment.serviceCategory])}
        loadError={selectedAssignment ? decisionErrorByCategory[selectedAssignment.serviceCategory] || '' : ''}
        serviceCategory={selectedAssignment?.serviceCategory}
      />

      <ChangeDateModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        eventId={event?.id || id}
        currentDate={event?.date}
        onDateChanged={async () => {
          await reloadAll();
          setReadinessRefresh(value => value + 1);
        }}
      />
    </Layout>
  );
}
