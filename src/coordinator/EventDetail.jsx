import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import EventVendorTable from './EventVendorTable';
import AuditTimeline from '../components/AuditTimeline';
import VendorDecisionHistory from '../components/VendorTrailDrawer';
import ManualAssignModal from '../components/ManualAssignModal';
import EventReadinessWidget from '../components/EventReadinessWidget';
import ChangeDateModal from '../components/ChangeDateModal';
import EventIssues from '../components/EventIssues';
import CoordinatorOwnership from '../components/CoordinatorOwnership';

import { useApp } from '../context/AppContext';
import api from '../api/axios';
import { buildServiceRows, eventActions, formatEventDate, formatEventRange, getEventStatusReason, nextEventAction, serviceLabel, venueReservation } from './eventDetailModel';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    state,
    fetchAssignmentsForEvent,
    forceAssign,
    manuallyAssignForEvent,
    fetchChecklist,
    createChecklist,
    updateChecklist,
    regenerateChecklist,
    toggleChecklistItem,
  } = useApp();

  const [event, setEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState('');
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'issues' ? 'issues' : 'overview');
  const [highlightedCategory, setHighlightedCategory] = useState(null);
  const [vendorReviewVersion, setVendorReviewVersion] = useState(0);
  const [historyCategory, setHistoryCategory] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [lifecycleSaving, setLifecycleSaving] = useState('');
  const [lifecycleFeedback, setLifecycleFeedback] = useState(null);
  const [dateFeedback, setDateFeedback] = useState('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [vendorFeedback, setVendorFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceAssignModal, setForceAssignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [checklistError, setChecklistError] = useState('');
  const [checklistNotice, setChecklistNotice] = useState('');
  const [checklistEditor, setChecklistEditor] = useState(null);
  const [checklistForm, setChecklistForm] = useState({
    itemName: '', dueDate: '', ownerRole: 'COORDINATOR', dependencyIds: [],
  });
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistGenerating, setChecklistGenerating] = useState(false);
  const [taskSavingId, setTaskSavingId] = useState(null);
  const [taskFeedback, setTaskFeedback] = useState(null);
  const [alternativesByCategory, setAlternativesByCategory] = useState({});
  const [excludedVendorsByCategory, setExcludedVendorsByCategory] = useState({});
  const [decisionLoadingByCategory, setDecisionLoadingByCategory] = useState({});
  const [decisionErrorByCategory, setDecisionErrorByCategory] = useState({});
  const [showDateModal, setShowDateModal] = useState(false);
  const [readinessRefresh, setReadinessRefresh] = useState(0);
  const [venueOptions, setVenueOptions] = useState([]);
  const [venueOptionsLoading, setVenueOptionsLoading] = useState(false);
  const [venueOptionsError, setVenueOptionsError] = useState('');
  const [venueOptionsExpanded, setVenueOptionsExpanded] = useState(false);
  const [venueNotice, setVenueNotice] = useState('');
  const [venueBookings, setVenueBookings] = useState([]);
  const [venueBookingsLoaded, setVenueBookingsLoaded] = useState(false);
  const [venueBookingsLoading, setVenueBookingsLoading] = useState(false);
  const [venueBookingsError, setVenueBookingsError] = useState('');
  const [assigningVenueId, setAssigningVenueId] = useState(null);
  const [refreshingOperations, setRefreshingOperations] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const isMounted = useRef(true);
  const venueRequestId = useRef(0);
  const bookingRequestId = useRef(0);
  const operationRequestId = useRef(0);
  const tabRefs = useRef({});

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      venueRequestId.current += 1;
      bookingRequestId.current += 1;
      operationRequestId.current += 1;
    };
  }, []);

  const loadVenueBookings = useCallback(async (record) => {
    const request = ++bookingRequestId.current;
    setVenueBookingsLoading(true);
    try {
      const response = record.venueId ? await api.get(`/venues/${record.venueId}/bookings`) : { data: [] };
      if (isMounted.current && request === bookingRequestId.current) {
        setVenueBookings((response.data || []).filter(booking => String(booking.eventId) === String(record.id)));
        setVenueBookingsLoaded(true);
        setVenueBookingsError('');
      }
    } catch (requestError) {
      if (isMounted.current && request === bookingRequestId.current) setVenueBookingsError(requestError.response?.data?.message || 'The venue reservation could not be verified.');
    } finally {
      if (isMounted.current && request === bookingRequestId.current) setVenueBookingsLoading(false);
    }
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
  const categories = event.requiredCategories || [];
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
      setEvent(null);
      setAssignments([]);
      setAssignmentsLoaded(false);
      setCategoriesLoaded(false);
      setChecklist([]);
      setChecklistLoaded(false);
      setVenueBookings([]);
      setVenueBookingsLoaded(false);
      setActiveTab(new URLSearchParams(window.location.search).get('tab') === 'issues' ? 'issues' : 'overview');
      setLifecycleFeedback(null);
      setDateFeedback('');
      setVendorFeedback({});
      try {
        const eventResponse = await api.get(`/events/${id}`);
        if (cancelled) return;
        const eventRecord = eventResponse.data;
        const [assignmentResult, categoryResult] = await Promise.allSettled([
          fetchAssignmentsForEvent(id),
          api.get(`/events/${id}/categories`),
        ]);
        if (cancelled) return;
        const assignmentsData = assignmentResult.status === 'fulfilled' ? assignmentResult.value : [];
        setAssignmentsLoaded(assignmentResult.status === 'fulfilled');
        setAssignmentsError(assignmentResult.status === 'fulfilled' ? '' : 'Vendor offers could not be loaded. Retry event data to verify their status.');
        setCategoriesLoaded(categoryResult.status === 'fulfilled');
        setCategoriesError(categoryResult.status === 'fulfilled' ? '' : 'Required services could not be verified. Retry before assigning a vendor.');
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
          date: eventRecord.eventDate || inquiry.eventDate || currentAssignments[0]?.eventDate,
          endDate: eventRecord.endDate || inquiry.endDate,
          venue: eventRecord.venue,
          venueId: eventRecord.venueId,
          requiredCategories: categoryResult.status === 'fulfilled' ? categoryResult.value.data : eventRecord.requiredCategories || [],
          clientName: eventRecord.clientName || inquiry.clientName || currentAssignments[0]?.eventClientName,
          expectedAttendees: inquiry.expectedAttendees || currentAssignments[0]?.expectedAttendees,
        };
        setEvent(nextEvent);
        void loadVenueOptions(nextEvent);
        void loadVenueBookings(nextEvent);

        // Checklist is an independent section: its failure should not hide event details.
        setChecklistLoading(true);
        try {
          const checklistData = await fetchChecklist(eventRecord.id || id);
          if (cancelled) return;
          setChecklist(checklistData || []);
          setChecklistLoaded(true);
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
    return () => {
      cancelled = true;
      venueRequestId.current += 1;
      bookingRequestId.current += 1;
      operationRequestId.current += 1;
    };
  }, [id, fetchAssignmentsForEvent, fetchChecklist, loadVenueOptions, loadVenueBookings]);

  const handleForceAssign = async (assignmentId, vendorId, category, reason) => {
    const overrideReason = reason?.trim();
    if (!overrideReason) return;
    setAssignmentSaving(true);
    setVendorFeedback(previous => ({ ...previous, [category]: null }));
    try {
      const targetAssignment = assignmentId || selectedAssignment?.id
        || assignments.find(assignment => assignment.serviceCategory === category && assignment.status === 'OPEN')?.id;
      const targetIsOpen = assignments.some(assignment =>
        String(assignment.id) === String(targetAssignment) && assignment.status === 'OPEN'
      );
      const result = targetAssignment && targetIsOpen
        ? await forceAssign(targetAssignment, vendorId, category, overrideReason)
        : await manuallyAssignForEvent(event?.id || id, vendorId, category, overrideReason);
      if (!isMounted.current) return;
      if (result?.id) setAssignments(previous => [...previous.filter(assignment => assignment.id !== result.id), result]);
      setVendorFeedback(previous => ({ ...previous, [category]: { type: 'success', message: 'Vendor offer sent. Waiting for their response.' } }));
      setForceAssignModal(false);
      setSelectedAssignment(null);
      await refreshAfterAction();
    } catch (err) {
      if (isMounted.current) setVendorFeedback(previous => ({ ...previous, [category]: { type: 'error', message: err.response?.data?.message || 'Vendor assignment failed.' } }));
    } finally {
      if (isMounted.current) setAssignmentSaving(false);
    }
  };


  const services = buildServiceRows(event?.requiredCategories || [], assignments);
  const statusReason = getEventStatusReason(event?.status, services);
  const vendorsKnown = assignmentsLoaded && categoriesLoaded && !assignmentsError && !categoriesError;
  const confirmedServices = services.filter(service => service.state === 'resolved').length;
  const pendingServices = services.filter(service => service.state === 'pending').length;
  const blockedServices = services.filter(service => service.state === 'exhausted').length;
  const completedTasks = checklist.filter(task => task.isComplete).length;
  const reservation = venueReservation(venueBookings, event?.id, event?.date, event?.endDate);
  const actions = eventActions(event?.status, state.currentUser?.role);
  const nextAction = nextEventAction({
    status: event?.status, rows: services, vendorsKnown,
    venueNeedsAttention: !event?.venueId || (venueBookingsLoaded && !venueBookingsError && !reservation.complete),
    venueKnown: venueBookingsLoaded && !venueBookingsError && !venueBookingsLoading,
    tasksKnown: checklistLoaded && !checklistError, tasksRemaining: checklist.length - completedTasks,
  });

  const selectTab = (tab, category = null) => {
    setActiveTab(tab);
    setHighlightedCategory(tab === 'vendors' ? category : null);
    if (tab === 'vendors' && category) setVendorReviewVersion(value => value + 1);
    setHistoryCategory(tab === 'history' ? category : null);
    tabRefs.current[tab]?.focus();
  };

  const reloadAll = async () => {
    const request = ++operationRequestId.current;
    const eventResponse = await api.get(`/events/${id}`);
    const [assignmentResult, categoryResult] = await Promise.allSettled([
      fetchAssignmentsForEvent(id),
      api.get(`/events/${id}/categories`),
    ]);
    if (!isMounted.current || request !== operationRequestId.current) return;
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
    if (!isMounted.current || request !== operationRequestId.current) return;
    const currentAssignments = assignmentResult.status === 'fulfilled' ? assignmentResult.value || [] : assignments;
    if (assignmentResult.status === 'fulfilled') {
      setAssignments(currentAssignments);
      setAssignmentsLoaded(true);
      setAssignmentsError('');
    } else setAssignmentsError('Vendor offers could not be refreshed. Previously loaded offers may be out of date.');
    if (categoryResult.status === 'fulfilled') {
      setCategoriesLoaded(true);
      setCategoriesError('');
    } else setCategoriesError('Required services could not be verified. Retry before assigning a vendor.');
    const nextEvent = {
      id: eventRecord.id,
      inquiryId: eventRecord.inquiryId,
      name: eventRecord.name,
      status: eventRecord.status,
      date: eventRecord.eventDate || inquiry.eventDate || currentAssignments[0]?.eventDate || event?.date,
      endDate: eventRecord.endDate || inquiry.endDate || event?.endDate,
      venue: eventRecord.venue,
      venueId: eventRecord.venueId,
      requiredCategories: categoryResult.status === 'fulfilled' ? categoryResult.value.data : event?.requiredCategories || eventRecord.requiredCategories || [],
      clientName: eventRecord.clientName || inquiry.clientName || currentAssignments[0]?.eventClientName || event?.clientName,
      expectedAttendees: inquiry.expectedAttendees || currentAssignments[0]?.expectedAttendees || event?.expectedAttendees,
    };
    setEvent(nextEvent);
    setError('');
    void loadVenueOptions(nextEvent);
    void loadVenueBookings(nextEvent);
    setChecklistLoading(true);
    try {
      const checklistData = await fetchChecklist(id);
      if (!isMounted.current || request !== operationRequestId.current) return;
      setChecklist(checklistData || []);
      setChecklistLoaded(true);
      setChecklistError('');
    } catch {
      if (isMounted.current && request === operationRequestId.current) setChecklistError('Could not refresh the event checklist. Your previous data is still shown.');
    } finally {
      if (isMounted.current && request === operationRequestId.current) setChecklistLoading(false);
    }
  };

  const refreshDerivedData = () => {
    setReadinessRefresh(value => value + 1);
    setHistoryRefresh(value => value + 1);
  };

  const refreshAfterAction = async () => {
    refreshDerivedData();
    try {
      await reloadAll();
      if (isMounted.current) setRefreshError('');
    } catch {
      if (isMounted.current) setRefreshError('The action succeeded, but some details could not be refreshed. Use Refresh event data to retry.');
    }
  };

  const handleRefreshOperations = async () => {
    setRefreshingOperations(true);
    setRefreshError('');
    try {
      await reloadAll();
      if (isMounted.current) refreshDerivedData();
    } catch (err) {
      if (isMounted.current) setRefreshError(err.response?.data?.message || 'Event and assignment data could not be refreshed. Previously loaded data remains visible.');
    } finally {
      if (isMounted.current) setRefreshingOperations(false);
    }
  };

  const handleLifecycleAction = async (status) => {
    const cancelling = status === 'CANCELLED';
    if (!window.confirm(cancelling ? 'Cancel this event? Active vendor assignments and venue bookings will be cancelled.' : 'Record this event as completed?')) return;
    setLifecycleSaving(status);
    setLifecycleFeedback(null);
    try {
      const response = await api.patch(`/events/${id}/status`, null, { params: { status } });
      if (!isMounted.current) return;
      setEvent(previous => ({ ...previous, status: response.data.status }));
      setLifecycleFeedback({ type: 'success', message: cancelling ? 'Event cancelled. Active vendor assignments and venue bookings were released.' : 'Event completed. Accepted vendor assignments were marked completed.' });
      await refreshAfterAction();
    } catch (requestError) {
      if (isMounted.current) setLifecycleFeedback({ type: 'error', message: requestError.response?.data?.message || 'The event status could not be updated.' });
    } finally {
      if (isMounted.current) setLifecycleSaving('');
    }
  };

  const reloadChecklist = async () => {
    setChecklistLoading(true);
    try {
      const data = await fetchChecklist(id);
      if (!isMounted.current) return;
      setChecklist(data || []);
      setChecklistLoaded(true);
      setChecklistError('');
      setReadinessRefresh(value => value + 1);
    } catch {
      if (isMounted.current) setChecklistError('Could not load the checklist. Previously loaded tasks remain visible.');
    } finally {
      if (isMounted.current) setChecklistLoading(false);
    }
  };

  const handleChecklistToggle = async (item) => {
    setTaskSavingId(item.id);
    setTaskFeedback(null);
    try {
      const updated = await toggleChecklistItem(item.id, !item.isComplete);
      if (!isMounted.current) return;
      setChecklist(previous => previous.map(task => task.id === item.id ? updated : task));
      setTaskFeedback({ id: item.id, type: 'success', message: updated.isComplete ? 'Task completed.' : 'Task reopened.' });
      refreshDerivedData();
    } catch (requestError) {
      if (isMounted.current) setTaskFeedback({ id: item.id, type: 'error', message: requestError.response?.data?.message || 'Could not update this task.' });
    } finally {
      if (isMounted.current) setTaskSavingId(null);
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
      refreshDerivedData();
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
      setChecklistLoaded(true);
      setChecklistNotice('Missing template tasks were added. Existing tasks were preserved.');
      refreshDerivedData();
    } catch (err) {
      setChecklistError(err.response?.data?.message || 'Could not add missing template tasks.');
    } finally {
      setChecklistGenerating(false);
    }
  };

  const handleVenueAssign = async (venueOption) => {
    setAssigningVenueId(venueOption.venueId);
    setVenueOptionsError('');
    setVenueNotice('');
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
      setVenueNotice(`Venue updated to ${venueOption.name}.`);
      await refreshAfterAction();
    } catch (err) {
      setVenueOptionsError(err.response?.data?.message || 'The venue could not be assigned. Recheck availability and try again.');
    } finally {
      setAssigningVenueId(null);
    }
  };

  if (loading) return <Layout title="Event Detail"><p role="status" className="py-10 text-center text-slate-500">Loading event…</p></Layout>;
  if (!event) return (
    <Layout title="Event Detail">
      <div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
        {refreshError || error || 'Event details are unavailable.'}
        <button type="button" disabled={refreshingOperations} onClick={handleRefreshOperations} className="ml-3 underline">{refreshingOperations ? 'Retrying…' : 'Retry'}</button>
      </div>
      <button type="button" onClick={() => navigate('/coordinator/events')} className="mt-4 text-sm text-indigo-700">← Back to events</button>
    </Layout>
  );

  const noEligibleAlternative = nextAction.category && !decisionLoadingByCategory[nextAction.category]
    && !decisionErrorByCategory[nextAction.category] && Object.hasOwn(alternativesByCategory, nextAction.category)
    && alternativesByCategory[nextAction.category].length === 0;
  const tabs = [
    { id: 'overview', label: 'Overview' }, { id: 'vendors', label: 'Vendors' },
    { id: 'tasks', label: 'Tasks' }, { id: 'issues', label: 'Issues' }, { id: 'history', label: 'History' },
  ];

  return (
    <Layout title="Event Detail">
      <div className="space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <button type="button" onClick={() => navigate('/coordinator/events')} className="mb-3 text-sm text-indigo-700 hover:underline">← Events</button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
                <StatusBadge status={event.status} size="lg" showIcon />
              </div>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div><dt className="text-xs text-slate-500">Event dates</dt><dd className="mt-1 font-medium text-slate-800">{formatEventRange(event.date, event.endDate)}</dd></div>
                <div><dt className="text-xs text-slate-500">Venue</dt><dd className="mt-1 font-medium text-slate-800">{event.venue || 'Not assigned'}</dd></div>
                <div><dt className="text-xs text-slate-500">Client</dt><dd className="mt-1 font-medium text-slate-800">{event.clientName || 'Client unavailable'}</dd></div>
              </dl>
            </div>
            <div className="max-w-md space-y-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={refreshingOperations || Boolean(lifecycleSaving)} onClick={handleRefreshOperations} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">{refreshingOperations ? 'Refreshing…' : 'Refresh event data'}</button>
                {actions.reschedule && <button type="button" disabled={Boolean(lifecycleSaving)} onClick={() => { setDateFeedback(''); setShowDateModal(true); }} className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 disabled:opacity-50">Change date</button>}
                {actions.complete && <button type="button" disabled={Boolean(lifecycleSaving)} onClick={() => handleLifecycleAction('COMPLETED')} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 disabled:opacity-50">{lifecycleSaving === 'COMPLETED' ? 'Completing…' : 'Complete event'}</button>}
                {actions.cancel && <button type="button" disabled={Boolean(lifecycleSaving)} onClick={() => handleLifecycleAction('CANCELLED')} className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:opacity-50">{lifecycleSaving === 'CANCELLED' ? 'Cancelling…' : 'Cancel event'}</button>}
              </div>
              {lifecycleFeedback && <p role={lifecycleFeedback.type === 'error' ? 'alert' : 'status'} className={`text-sm ${lifecycleFeedback.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{lifecycleFeedback.message}</p>}
              {dateFeedback && <p role="status" className="text-sm text-emerald-700">{dateFeedback}</p>}
              {refreshError && <p role="alert" className="text-sm text-amber-800">{refreshError}</p>}
            </div>
          </div>
        </header>

        <section aria-labelledby="next-action-title" className={`rounded-xl border p-4 md:p-5 ${['intervene', 'venue'].includes(nextAction.kind) ? 'border-amber-200 bg-amber-50' : 'border-indigo-100 bg-indigo-50'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</p>
              <h2 id="next-action-title" className="font-semibold text-slate-900">{nextAction.title}</h2>
              <p className="mt-1 text-sm text-slate-700">{nextAction.description}</p>
              {noEligibleAlternative && <p className="mt-2 text-sm font-medium text-amber-900">No eligible alternative currently passes the checks for {serviceLabel(nextAction.category)}. Review the exclusion reasons.</p>}
              {vendorsKnown && nextAction.kind !== 'closed' && <p className="mt-3 text-xs text-slate-600">{confirmedServices}/{services.length} required services confirmed · {pendingServices} awaiting response · {blockedServices} {blockedServices === 1 ? 'needs' : 'need'} review</p>}
            </div>
            <button type="button" disabled={refreshingOperations} onClick={() => {
              if (nextAction.target === 'refresh') handleRefreshOperations();
              else { selectTab(nextAction.target, nextAction.category); if (nextAction.kind === 'venue') setVenueOptionsExpanded(true); }
            }} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{nextAction.action}</button>
          </div>
        </section>

        <div role="tablist" aria-label="Event detail sections" className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab, index) => (
            <button key={tab.id} ref={node => { tabRefs.current[tab.id] = node; }} type="button" role="tab" id={`event-tab-${tab.id}`} aria-controls={`event-panel-${tab.id}`} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => selectTab(tab.id)} onKeyDown={keyEvent => {
              const nextIndex = keyEvent.key === 'ArrowRight' ? (index + 1) % tabs.length : keyEvent.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : keyEvent.key === 'Home' ? 0 : keyEvent.key === 'End' ? tabs.length - 1 : null;
              if (nextIndex != null) { keyEvent.preventDefault(); selectTab(tabs[nextIndex].id); }
            }} className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab.label}</button>
          ))}
        </div>

        <section role="tabpanel" id={`event-panel-${activeTab}`} aria-labelledby={`event-tab-${activeTab}`} className="space-y-6">
          {activeTab === 'overview' && <>
            <CoordinatorOwnership key={event.inquiryId} inquiryId={event.inquiryId}
              closed={['COMPLETED', 'CANCELLED', 'CLOSED'].includes(event.status)}
              onChanged={(coordinator) => setEvent((previous) => ({ ...previous, coordinator }))} />
            <EventReadinessWidget eventId={id} refreshKey={readinessRefresh} />
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-semibold text-slate-900">Venue reservation</h2><p className="mt-1 text-sm text-slate-600">{event.venue || 'No venue assigned'} · {formatEventRange(event.date, event.endDate)}</p></div>
                <button type="button" onClick={() => setVenueOptionsExpanded(value => !value)} aria-expanded={venueOptionsExpanded} className="text-sm font-medium text-indigo-700 hover:underline">{venueOptionsExpanded ? 'Hide venue fit' : 'Review venue fit and alternatives'}</button>
              </div>
              {venueBookingsLoading && <p role="status" className="mt-3 text-sm text-slate-500">Checking reservation…</p>}
              {venueBookingsError && <p role="alert" className="mt-3 text-sm text-rose-700">{venueBookingsError} <button type="button" onClick={() => loadVenueBookings(event)} className="underline">Retry</button></p>}
              {!venueBookingsLoading && !venueBookingsError && venueBookingsLoaded && <p className={`mt-3 text-sm font-medium ${reservation.complete ? 'text-emerald-700' : 'text-amber-800'}`}>
                {reservation.complete ? `Confirmed for all ${reservation.requiredDays} event ${reservation.requiredDays === 1 ? 'day' : 'days'}.` : event.status === 'CANCELLED' ? 'No active reservation; event cancelled.' : `${reservation.confirmedDates.length} of ${reservation.requiredDays ?? 'unknown'} event days have a confirmed booking.`}
              </p>}
              {venueNotice && <p role="status" className="mt-3 text-sm text-emerald-700">{venueNotice}</p>}
              {venueOptionsExpanded && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">Capacity and availability include configured setup and teardown buffers. This event is excluded from its own conflict check.</p>
                {venueOptionsError && <p role="alert" className="text-sm text-rose-700">{venueOptionsError} <button type="button" onClick={() => loadVenueOptions(event)} className="underline">Retry</button></p>}
                {venueOptionsLoading && <p role="status" className="text-sm text-slate-500">Checking venue fit…</p>}
                {!venueOptionsLoading && !venueOptionsError && !venueOptions.length && <p className="text-sm text-slate-500">No venues are registered.</p>}
                {[...venueOptions].sort((a, b) => Number(String(b.venueId) === String(event.venueId)) - Number(String(a.venueId) === String(event.venueId)) || Number(b.eligible) - Number(a.eligible)).map(option => {
                  const isCurrent = String(option.venueId) === String(event.venueId);
                  return <div key={option.venueId} className={`rounded-lg border p-3 ${option.eligible ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-semibold text-slate-800">{option.name}{isCurrent ? ' · Current venue' : ''}</p><p className="mt-1 text-xs text-slate-500">{option.capacity == null ? 'Capacity not configured' : `Capacity ${option.capacity}`}{event.expectedAttendees ? ` · ${event.expectedAttendees} attendees` : ''}{option.location ? ` · ${option.location}` : ''}</p><p className="mt-1 text-xs text-slate-500">Block window: {option.blockedFrom} to {option.blockedThrough}</p></div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${option.eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{option.eligible ? 'Eligible' : 'Unavailable'}</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">{(option.explanation || []).map((reason, index) => <li key={index}>• {reason}</li>)}</ul>
                    {actions.reschedule && option.eligible && !isCurrent && <button type="button" disabled={assigningVenueId != null || Boolean(lifecycleSaving)} onClick={() => handleVenueAssign(option)} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{assigningVenueId === option.venueId ? 'Assigning…' : event.venueId ? 'Move event to this venue' : 'Assign this venue'}</button>}
                  </div>;
                })}
              </div>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Vendor coordination</h2><p className="mt-2 text-sm text-slate-600">{vendorsKnown ? statusReason : 'Vendor status has not been verified.'}</p><button type="button" onClick={() => selectTab('vendors')} className="mt-3 text-sm font-medium text-indigo-700">View required services →</button></div>
              <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Preparation tasks</h2><p className="mt-2 text-sm text-slate-600">{checklistLoaded ? `${completedTasks} of ${checklist.length} tasks complete. Owners, deadlines and prerequisites are in Tasks.` : 'Task progress is unavailable.'}</p><button type="button" onClick={() => selectTab('tasks')} className="mt-3 text-sm font-medium text-indigo-700">View tasks →</button></div>
            </div>
          </>}

          {activeTab === 'vendors' && <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold text-slate-900">Required vendor services</h2><p className="mt-1 text-sm text-slate-500">See the latest offer, previous outcomes, and current alternatives for each service.</p></div>
              <button type="button" className="btn-outline" disabled={refreshingOperations} onClick={handleRefreshOperations}>
                {refreshingOperations ? 'Refreshing…' : 'Refresh offers and eligibility'}
              </button>
            </div>
            {(assignmentsError || categoriesError) && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{assignmentsError || categoriesError} <button type="button" onClick={handleRefreshOperations} className="underline">Retry</button></p>}
            {assignmentsLoaded && categoriesLoaded && <EventVendorTable rows={services} alternatives={alternativesByCategory} excluded={excludedVendorsByCategory} loading={decisionLoadingByCategory} errors={decisionErrorByCategory} highlightedCategory={highlightedCategory} reviewVersion={vendorReviewVersion} canAssign={actions.assign && vendorsKnown && !assignmentSaving && !lifecycleSaving} feedbackByCategory={vendorFeedback} onAssign={row => {
              setSelectedAssignment(row.current || { serviceCategory: row.category });
              setVendorFeedback(previous => ({ ...previous, [row.category]: null }));
              setForceAssignModal(true);
            }} onHistory={category => selectTab('history', category)} />}
          </>}

          {activeTab === 'tasks' && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4"><h2 className="font-semibold text-slate-900">Event tasks</h2><span className="text-sm text-slate-500">{checklistLoaded ? `${completedTasks} of ${checklist.length} complete` : checklistLoading ? 'Loading tasks…' : 'Task progress unavailable'}</span></div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    onClick={startChecklistCreate}
                    disabled={!checklistLoaded}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg disabled:opacity-50"
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
                      onClick={reloadChecklist}
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
                ) : checklistError && checklist.length === 0 ? null : checklist.length === 0 ? (
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
                              disabled={taskSavingId != null || (!item.isComplete && incompletePrerequisites.length > 0) || (item.isComplete && hasCompletedDependents)}
                              onChange={() => handleChecklistToggle(item)}
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

                          {taskFeedback?.id === item.id && (
                            <p role={taskFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs ${taskFeedback.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{taskFeedback.message}</p>
                          )}

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
          </section>}

          {activeTab === 'issues' && <EventIssues key={id} eventId={id} staff assignments={assignments} tasks={checklist} canReport={!['CANCELLED', 'CLOSED', 'COMPLETED'].includes(event.status)} />}
          {activeTab === 'history' && <>
            <AuditTimeline referenceType="EVENT" referenceId={id} refreshKey={historyRefresh} title="Lifecycle history" />
            <VendorDecisionHistory eventId={id} refreshKey={historyRefresh} expandedCategory={historyCategory} />
          </>}
        </section>
      </div>

      <ManualAssignModal
        isOpen={forceAssignModal}
        onClose={() => { if (!assignmentSaving) { setForceAssignModal(false); setSelectedAssignment(null); } }}
        onAssign={(vendorId, reason) => handleForceAssign(selectedAssignment?.id, vendorId, selectedAssignment?.serviceCategory, reason)}
        availableVendors={selectedAssignment ? alternativesByCategory[selectedAssignment.serviceCategory] || [] : []}
        loading={Boolean(selectedAssignment && decisionLoadingByCategory[selectedAssignment.serviceCategory])}
        submitting={assignmentSaving}
        error={selectedAssignment && vendorFeedback[selectedAssignment.serviceCategory]?.type === 'error' ? vendorFeedback[selectedAssignment.serviceCategory].message : ''}
        loadError={selectedAssignment ? decisionErrorByCategory[selectedAssignment.serviceCategory] || '' : ''}
        serviceCategory={selectedAssignment?.serviceCategory}
      />
      <ChangeDateModal isOpen={showDateModal} onClose={() => setShowDateModal(false)} eventId={id} currentDate={event.date} onDateChanged={async (newDate, record) => {
        setEvent(previous => ({ ...previous, status: record?.status || previous.status, date: record?.eventDate || newDate, endDate: record?.endDate || previous.endDate }));
        setDateFeedback(`Event rescheduled to ${formatEventDate(newDate)}. Template task deadlines were refreshed where applicable.`);
        await refreshAfterAction();
      }} />
    </Layout>
  );
}
