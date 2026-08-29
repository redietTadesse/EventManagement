import React, { createContext, useContext, useReducer } from 'react';
import {
  users, vendors, initialInquiries, initialAssignments, initialNotifications,
  eventCategoryMap, checklistTemplates,
} from '../data/mockData';
import { canTransition } from '../engine/transitions';
import { autoAssignVendors, findBestVendor } from '../engine/autoAssign';
import { deriveChecklist } from '../engine/checklist';
import { createTimelineEntry } from '../engine/events';
import { hasConflict } from '../engine/conflict';

// Helper to build eventsMap for conflict detection
const buildEventsMap = (inquiries) => {
  const map = {};
  inquiries.forEach(i => {
    if (i.event) {
      map[i.event.id] = i.eventDate;
    }
  });
  return map;
};

const initialState = {
  users,
  vendors,
  inquiries: initialInquiries,
  assignments: initialAssignments,
  notifications: initialNotifications,
  currentUser: null,
  timeline: [],
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };

    case 'LOGOUT':
      return { ...state, currentUser: null };

    case 'CREATE_INQUIRY': {
      const { eventType, eventDate, expectedAttendees, requirements } = action.payload;
      const newInquiry = {
        id: state.inquiries.reduce((max, i) => Math.max(max, i.id), 0) + 1,
        clientId: state.currentUser.id,
        clientName: state.currentUser.fullName,
        eventType,
        eventDate,
        expectedAttendees: parseInt(expectedAttendees) || 0,
        requirements,
        status: 'INQUIRY_SUBMITTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const notif = {
        id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
        userId: 4, // coordinator
        title: 'New Inquiry',
        message: `${state.currentUser.fullName} submitted a ${eventType} inquiry`,
        isRead: false,
        type: 'INQUIRY',
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        inquiries: [...state.inquiries, newInquiry],
        notifications: [...state.notifications, notif],
      };
    }

    case 'SEND_PROPOSAL': {
      const { inquiryId, venue, price, terms } = action.payload;
      const inquiry = state.inquiries.find(i => i.id === inquiryId);
      if (!inquiry || !canTransition(inquiry.status, 'PROPOSAL_SENT', 'inquiry')) return state;
      const proposal = {
        id: (state.inquiries.reduce((max, i) => Math.max(max, i.proposal?.id || 0), 0)) + 1,
        venue,
        venueId: action.payload.venueId || null,
        venueDetails: action.payload.venueDetails || null,
        price: parseInt(price) || 0,
        terms,
        sentDate: new Date().toISOString(),
        vendorShortlist: action.payload.vendorShortlist,
        pricingTier: action.payload.pricingTier,
      };
      const updatedInquiry = {
        ...inquiry,
        status: 'PROPOSAL_SENT',
        proposal,
        updatedAt: new Date().toISOString(),
      };
      const notif = {
        id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
        userId: inquiry.clientId,
        title: 'Proposal Ready',
        message: `Your proposal for ${inquiry.eventType} is ready to review`,
        isRead: false,
        type: 'PROPOSAL',
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === inquiryId ? updatedInquiry : i),
        notifications: [...state.notifications, notif],
      };
    }

    case 'ACCEPT_PROPOSAL': {
      const inquiry = state.inquiries.find(i => i.id === action.payload.inquiryId);
      if (!inquiry) return state;
      // Create event
      const eventId = (state.inquiries.reduce((max, i) => Math.max(max, i.event?.id || 0), 0)) + 1;
      const checklist = checklistTemplates[inquiry.eventType]?.map((item, idx) => ({
        id: idx + 1,
        itemName: item,
        isComplete: false,
      })) || [];
      const event = {
        id: eventId,
        name: `${inquiry.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - ${inquiry.clientName}`,
        status: 'AWAITING_VENDORS',
        venue: inquiry.proposal?.venue || 'Not specified',
        venueId: inquiry.proposal?.venueId || null,
        venueDetails: inquiry.proposal?.venueDetails || null,
        checklist,
        unfilledCategories: [],
      };
      // Auto‑assign vendors
      const { assignments: newAssignments, event: updatedEvent } = autoAssignVendors(
        event,
        inquiry.eventDate,
        state.vendors,
        state.assignments,
        eventCategoryMap
      );
      // Create timeline entries
      const timelineEntries = [
        createTimelineEntry(event.id, 'System', 'EVENT_CREATED', 'Event created from accepted proposal'),
        createTimelineEntry(event.id, 'System', updatedEvent.status, 'Vendors auto‑assigned' + (updatedEvent.unfilledCategories?.length ? ' (some categories unfilled)' : '')),
      ];
      // Notifications
      const notifs = [
        {
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
          userId: inquiry.clientId,
          title: 'Event Created',
          message: `Your event "${event.name}" has been created and vendors are being assigned.`,
          isRead: false,
          type: 'EVENT',
          createdAt: new Date().toISOString(),
        },
        {
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 2,
          userId: 4,
          title: 'Event Created',
          message: `Event "${event.name}" created with ${newAssignments.length} vendor assignments.`,
          isRead: false,
          type: 'EVENT',
          createdAt: new Date().toISOString(),
        },
      ];
      // Notify vendors
      newAssignments.forEach(a => {
        notifs.push({
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 3,
          userId: state.vendors.find(v => v.id === a.vendorId)?.userId || 0,
          title: 'New Assignment',
          message: `You have been assigned to ${a.eventName} (${a.serviceCategory})`,
          isRead: false,
          type: 'ASSIGNMENT',
          referenceId: a.id,
          createdAt: new Date().toISOString(),
        });
      });

      // Update inquiry
      const updatedInquiry = {
        ...inquiry,
        status: 'EVENT_CREATED',
        event: updatedEvent,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === inquiry.id ? updatedInquiry : i),
        assignments: [...state.assignments, ...newAssignments],
        notifications: [...state.notifications, ...notifs],
        timeline: [...state.timeline, ...timelineEntries],
      };
    }

    case 'REJECT_PROPOSAL': {
      const inquiry = state.inquiries.find(i => i.id === action.payload.inquiryId);
      if (!inquiry) return state;
      if (!canTransition(inquiry.status, 'PROPOSAL_REJECTED', 'inquiry')) return state;
      const updated = { ...inquiry, status: 'PROPOSAL_REJECTED', updatedAt: new Date().toISOString() };
      const notif = {
        id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
        userId: 4,
        title: 'Proposal Rejected',
        message: `${inquiry.clientName} rejected the proposal for ${inquiry.eventType}`,
        isRead: false,
        type: 'PROPOSAL',
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === inquiry.id ? updated : i),
        notifications: [...state.notifications, notif],
      };
    }

    case 'RESPOND_TO_ASSIGNMENT': {
      const { assignmentId, status, declineReason } = action.payload;
      const assignment = state.assignments.find(a => a.id === assignmentId);
      if (!assignment) return state;
      const event = state.inquiries.find(i => i.event?.id === assignment.eventId)?.event;
      if (!event) return state;

      // Conflict check if accepting
      if (status === 'ACCEPTED') {
        const eventsMap = buildEventsMap(state.inquiries);
        const eventDate = state.inquiries.find(i => i.event?.id === assignment.eventId)?.eventDate;
        if (hasConflict(assignment.vendorId, eventDate, state.assignments, eventsMap)) {
          // Block – we'll handle in UI; but for safety we still reject the action
          alert('Conflict detected: you already have an assignment on this date.');
          return state;
        }
      }

      // Update assignment status
      const updatedAssignment = {
        ...assignment,
        status: status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED',
        respondedAt: new Date().toISOString(),
        declineReason: status === 'DECLINED' ? declineReason : null,
      };

      let newState = {
        ...state,
        assignments: state.assignments.map(a => a.id === assignmentId ? updatedAssignment : a),
      };

      // If accepted: update checklist and check if all categories confirmed
      if (status === 'ACCEPTED') {
        const updatedEvent = {
          ...event,
          checklist: deriveChecklist(event, state.assignments.map(a => a.id === assignmentId ? updatedAssignment : a)),
        };
        // Check if all required categories are now accepted
        const categoriesNeeded = eventCategoryMap[state.inquiries.find(i => i.event?.id === event.id)?.eventType] || [];
        const acceptedCategories = newState.assignments
          .filter(a => a.eventId === event.id && a.status === 'ACCEPTED')
          .map(a => a.serviceCategory);
        const allFilled = categoriesNeeded.every(cat => acceptedCategories.includes(cat));
        if (allFilled) {
          updatedEvent.status = 'CONFIRMED';
          // Add timeline entry
          const entry = createTimelineEntry(event.id, 'System', 'CONFIRMED', 'All vendor categories confirmed');
          newState.timeline = [...newState.timeline, entry];
        }
        // Update inquiry event
        newState.inquiries = newState.inquiries.map(i => i.event?.id === event.id ? { ...i, event: updatedEvent } : i);
      }

      // If declined: auto‑reassign
      if (status === 'DECLINED') {
        const eventDate = state.inquiries.find(i => i.event?.id === event.id)?.eventDate;
        // Find a new vendor for that category
        const newVendor = findBestVendor(
          assignment.serviceCategory,
          eventDate,
          state.vendors,
          newState.assignments,
          assignment.vendorId // exclude declining vendor
        );
        if (newVendor) {
          // Create new assignment
          const maxId = newState.assignments.reduce((max, a) => Math.max(max, a.id), 0);
          const newAssignment = {
            id: maxId + 1,
            eventId: event.id,
            eventName: event.name,
            vendorId: newVendor.id,
            vendorName: newVendor.companyName,
            serviceCategory: assignment.serviceCategory,
            status: 'PENDING',
            assignedAt: new Date().toISOString(),
            respondedAt: null,
            declineReason: null,
          };
          newState.assignments = [...newState.assignments, newAssignment];
          // Notify new vendor
          const notif = {
            id: newState.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
            userId: newVendor.userId || 0,
            title: 'New Assignment (reassignment)',
            message: `You have been assigned to ${event.name} (${assignment.serviceCategory})`,
            isRead: false,
            type: 'ASSIGNMENT',
            referenceId: newAssignment.id,
            createdAt: new Date().toISOString(),
          };
          newState.notifications = [...newState.notifications, notif];
          // Add timeline entry
          const entry = createTimelineEntry(event.id, 'System', 'AWAITING_VENDORS', `Reassigned ${assignment.serviceCategory} to ${newVendor.companyName}`);
          newState.timeline = [...newState.timeline, entry];
        } else {
          // No vendor available → mark NEEDS_COORDINATOR
          const updatedEvent = {
            ...event,
            status: 'NEEDS_COORDINATOR',
            unfilledCategories: event.unfilledCategories || [assignment.serviceCategory],
          };
          newState.inquiries = newState.inquiries.map(i => i.event?.id === event.id ? { ...i, event: updatedEvent } : i);
          // Notify coordinator
          const notif = {
            id: newState.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
            userId: 4,
            title: 'Needs Coordinator',
            message: `No vendor available for ${assignment.serviceCategory} in ${event.name}. Manual assignment required.`,
            isRead: false,
            type: 'EXCEPTION',
            createdAt: new Date().toISOString(),
          };
          newState.notifications = [...newState.notifications, notif];
          const entry = createTimelineEntry(event.id, 'System', 'NEEDS_COORDINATOR', `No vendor found for ${assignment.serviceCategory}`);
          newState.timeline = [...newState.timeline, entry];
        }
      }

      return newState;
    }

    case 'ACCEPT_OPEN_EVENT': {
      const { eventId, vendorId } = action.payload;
      const inquiry = state.inquiries.find(i => i.event?.id === eventId);
      if (!inquiry) return state;
      const event = inquiry.event;
      const vendor = state.vendors.find(v => v.id === vendorId);
      if (!vendor) return state;
      // Check if vendor already has accepted assignment for that category
      const existing = state.assignments.find(a => a.eventId === eventId && a.serviceCategory === vendor.serviceCategory);
      if (existing) return state; // already assigned

      // Check conflict
      const eventsMap = buildEventsMap(state.inquiries);
      if (hasConflict(vendorId, inquiry.eventDate, state.assignments, eventsMap)) {
        alert('Conflict detected: you already have an assignment on this date.');
        return state;
      }

      // Create new assignment with ACCEPTED status
      const maxId = state.assignments.reduce((max, a) => Math.max(max, a.id), 0);
      const newAssignment = {
        id: maxId + 1,
        eventId,
        eventName: event.name,
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        serviceCategory: vendor.serviceCategory,
        status: 'ACCEPTED',
        assignedAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        declineReason: null,
      };
      const newAssignments = [...state.assignments, newAssignment];

      // Update checklist
      const updatedEvent = {
        ...event,
        checklist: deriveChecklist(event, newAssignments),
      };

      // Check if all categories confirmed
      const categoriesNeeded = eventCategoryMap[inquiry.eventType] || [];
      const acceptedCategories = newAssignments
        .filter(a => a.eventId === eventId && a.status === 'ACCEPTED')
        .map(a => a.serviceCategory);
      const allFilled = categoriesNeeded.every(cat => acceptedCategories.includes(cat));
      if (allFilled) {
        updatedEvent.status = 'CONFIRMED';
        const entry = createTimelineEntry(eventId, 'System', 'CONFIRMED', 'All vendor categories confirmed after volunteer acceptance');
        state.timeline = [...state.timeline, entry];
      }

      // Update inquiry
      const updatedInquiry = { ...inquiry, event: updatedEvent, updatedAt: new Date().toISOString() };

      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === inquiry.id ? updatedInquiry : i),
        assignments: newAssignments,
        notifications: [
          ...state.notifications,
          {
            id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
            userId: vendor.userId || 0,
            title: 'Assignment Accepted',
            message: `You volunteered for ${event.name}`,
            isRead: false,
            type: 'ASSIGNMENT',
            createdAt: new Date().toISOString(),
          },
          {
            id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 2,
            userId: 4,
            title: 'Volunteer Assignment',
            message: `${vendor.companyName} volunteered for ${event.name}`,
            isRead: false,
            type: 'ASSIGNMENT',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    case 'MANUAL_ASSIGN': {
      const { eventId, category, vendorId } = action.payload;
      const inquiry = state.inquiries.find(i => i.event?.id === eventId);
      if (!inquiry) return state;
      const event = inquiry.event;
      const vendor = state.vendors.find(v => v.id === vendorId);
      if (!vendor) return state;

      // Create PENDING assignment
      const maxId = state.assignments.reduce((max, a) => Math.max(max, a.id), 0);
      const newAssignment = {
        id: maxId + 1,
        eventId,
        eventName: event.name,
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        serviceCategory: category,
        status: 'PENDING',
        assignedAt: new Date().toISOString(),
        respondedAt: null,
        declineReason: null,
      };

      // Remove category from unfilled
      const unfilled = (event.unfilledCategories || []).filter(c => c !== category);
      const updatedEvent = {
        ...event,
        unfilledCategories: unfilled.length > 0 ? unfilled : undefined,
        status: unfilled.length > 0 ? 'NEEDS_COORDINATOR' : 'AWAITING_VENDORS',
      };

      const updatedInquiry = { ...inquiry, event: updatedEvent, updatedAt: new Date().toISOString() };

      const notif = {
        id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
        userId: vendor.userId || 0,
        title: 'New Assignment (manual)',
        message: `Coordinator assigned you to ${event.name} (${category})`,
        isRead: false,
        type: 'ASSIGNMENT',
        referenceId: newAssignment.id,
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === inquiry.id ? updatedInquiry : i),
        assignments: [...state.assignments, newAssignment],
        notifications: [...state.notifications, notif],
        timeline: [...state.timeline, createTimelineEntry(eventId, 'Coordinator', 'AWAITING_VENDORS', `Manually assigned ${category} to ${vendor.companyName}`)],
      };
    }

    case 'MARK_NOTIFICATIONS_READ': {
      const { userId } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.userId === userId ? { ...n, isRead: true } : n
        ),
      };
    }

    case 'RATE_VENDOR': {
      const { eventId, vendorId, rating, comment } = action.payload;
      // Only allow rating for completed events
      const inquiry = state.inquiries.find(i => i.event?.id === eventId);
      if (!inquiry || inquiry.event?.status !== 'COMPLETED') return state;
      // Store rating on the vendor object
      const updatedVendors = state.vendors.map(v => {
        if (v.id === vendorId) {
          const oldRatings = v.ratings || [];
          return { ...v, ratings: [...oldRatings, { rating, comment, eventId, timestamp: new Date().toISOString() }] };
        }
        return v;
      });
      // Recalculate average rating for the vendor
      const finalVendors = updatedVendors.map(v => {
        if (v.id === vendorId && v.ratings?.length > 0) {
          const avgRating = v.ratings.reduce((sum, r) => sum + r.rating, 0) / v.ratings.length;
          return { ...v, rating: parseFloat(avgRating.toFixed(1)) };
        }
        return v;
      });
      return { ...state, vendors: finalVendors };
    }

    case 'COMPLETE_EVENT': {
      const { eventId } = action.payload;
      const inquiry = state.inquiries.find(i => i.event?.id === eventId);
      if (!inquiry || inquiry.event?.status !== 'CONFIRMED') return state;
      const updatedEvent = {
        ...inquiry.event,
        status: 'COMPLETED',
        checklist: inquiry.event.checklist.map(c => ({ ...c, isComplete: true })),
      };
      const updatedInquiry = { ...inquiry, event: updatedEvent, updatedAt: new Date().toISOString() };
      const notifs = [
        {
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
          userId: inquiry.clientId,
          title: 'Event Completed',
          message: `Your event "${inquiry.event.name}" is complete — rate your vendors!`,
          isRead: false,
          type: 'EVENT',
          createdAt: new Date().toISOString(),
        },
        {
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 2,
          userId: 4,
          title: 'Event Completed',
          message: `Event "${inquiry.event.name}" marked as completed.`,
          isRead: false,
          type: 'EVENT',
          createdAt: new Date().toISOString(),
        },
      ];
      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === inquiry.id ? updatedInquiry : i),
        notifications: [...state.notifications, ...notifs],
        timeline: [...state.timeline, createTimelineEntry(eventId, 'Coordinator', 'COMPLETED', 'Event marked as completed')],
      };
    }

    case 'REPLACE_ASSIGNMENT': {
      const { assignmentId, vendorId } = action.payload;
      const old = state.assignments.find(a => a.id === assignmentId);
      const newVendor = state.vendors.find(v => v.id === vendorId);
      if (!old || !newVendor) return state;
      const now = new Date().toISOString();
      const maxId = state.assignments.reduce((max, a) => Math.max(max, a.id), 0);

      const updatedOld = {
        ...old,
        status: 'DECLINED',
        respondedAt: now,
        declineReason: 'Replaced — scheduling conflict on the event date',
      };
      const newAssignment = {
        id: maxId + 1,
        eventId: old.eventId,
        eventName: old.eventName,
        vendorId: newVendor.id,
        vendorName: newVendor.companyName,
        serviceCategory: old.serviceCategory,
        status: 'PENDING',
        assignedAt: now,
        respondedAt: null,
        declineReason: null,
      };
      const notifs = [
        {
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1,
          userId: 4,
          title: 'Assignment Replaced',
          message: `${old.vendorName} replaced with ${newVendor.companyName} for ${old.eventName} (${old.serviceCategory})`,
          isRead: false,
          type: 'ASSIGNMENT',
          createdAt: now,
        },
        {
          id: state.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 2,
          userId: newVendor.userId || 0,
          title: 'New Assignment (swap)',
          message: `You have been assigned to ${old.eventName} (${old.serviceCategory}) after a swap`,
          isRead: false,
          type: 'ASSIGNMENT',
          referenceId: maxId + 1,
          createdAt: now,
        },
      ];
      return {
        ...state,
        assignments: state.assignments.map(a => a.id === old.id ? updatedOld : a).concat(newAssignment),
        notifications: [...state.notifications, ...notifs],
        timeline: [...state.timeline, createTimelineEntry(old.eventId, 'System', 'AWAITING_VENDORS', `Replaced ${old.vendorName} with ${newVendor.companyName} (${old.serviceCategory}) due to conflict`)]
      };
    }

    case 'MARK_NOTIFICATION_READ': {
      const { notificationId } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
      };
    }

    default:
      return state;
  }
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};