
        switch (event.getNewStatus()) {

            case PROPOSAL_SENT -> notifications.notifyUser(
                    inquiry.getClientId(),
                    Destination.CLIENT_INQUIRY,
                    inquiry.getId(),
                    event.getOldStatus() == EventStatus.PROPOSAL_SENT
                            ? "Proposal updated"
                            : "Your event proposal is ready",
                    "Open inquiry #" + inquiry.getId()
                            + " to review the venue, quote, and terms."
            );

            case PROPOSAL_ACCEPTED -> {
                bookingAgreements.prepareForAcceptedProposal(inquiry);

                notifyCoordinator(
                        inquiry,
                        "Client accepted the proposal",
                        "Open inquiry #" + inquiry.getId()
                                + " to review the booking agreement."
                );
            }

            case PROPOSAL_REJECTED -> notifyCoordinator(
                    inquiry,
                    "Client declined the proposal",
                    "Open inquiry #" + inquiry.getId()
                            + " to review the outcome."
            );

            default -> { }
        }
