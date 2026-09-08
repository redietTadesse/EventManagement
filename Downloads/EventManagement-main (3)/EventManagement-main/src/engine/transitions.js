export const inquiryTransitions = {
  INQUIRY_SUBMITTED: ['PROPOSAL_SENT', 'CLOSED'],
  PROPOSAL_SENT: ['PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'],
  PROPOSAL_ACCEPTED: ['EVENT_CREATED'],
  PROPOSAL_REJECTED: ['CLOSED'],
  EVENT_CREATED: ['CLOSED'],
  CLOSED: [],
};

export const eventStatusTransitions = {
  AWAITING_VENDORS: ['CONFIRMED', 'NEEDS_COORDINATOR', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  NEEDS_COORDINATOR: ['AWAITING_VENDORS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const actionRoles = {
  submitInquiry: ['CLIENT'],
  createProposal: ['COORDINATOR'],
  acceptProposal: ['CLIENT'],
  rejectProposal: ['CLIENT'],
  respondToAssignment: ['VENDOR'],
  acceptOpenEvent: ['VENDOR'],
  manualAssign: ['COORDINATOR'],
  completeEvent: ['SYSTEM', 'COORDINATOR'],
  cancelEvent: ['CLIENT', 'COORDINATOR'],
};

export const canTransition = (current, target, type) => {
  if (type === 'inquiry') {
    return (inquiryTransitions[current] || []).includes(target);
  } else {
    return (eventStatusTransitions[current] || []).includes(target);
  }
};