package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.repositories.*;
import com.aicc.eventmanagement.util.CategoryUtils;
import com.aicc.eventmanagement.util.VenueBookingWindow;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingAgreementService {
    private final InquiryRepository inquiries;
    private final BookingAgreementRepository agreements;
    private final UserRepository users;
    private final VenueService venues;
    private final InquiryService inquiryService;
    private final ObjectMapper json;

    public record Terms(String proposalNumber, String client, String eventType, LocalDate eventDate,
                        LocalDate endDate, Integer attendees, Long venueId, String venue, String venueDetails,
                        LocalDate bookedFrom, LocalDate bookedThrough, int totalEtb,
                        List<String> services, String proposalTerms) {}
    public record View(String state, Terms terms, String revision, String clientSignature, Instant clientSignedAt,
                       String coordinatorSignature, Instant coordinatorSignedAt, Instant receiptUploadedAt,
                       String rejectionReason, Instant verifiedAt, boolean client, boolean canManage,
                       String availabilityWarning) {}
    public record Receipt(byte[] contents, String type) {}

    @Transactional(readOnly = true)
    public View view(Long id, String username) {
        Inquiry inquiry = inquiries.findById(id).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
        User user = authorized(inquiry, username);
        return view(inquiry, user, agreements.findById(id).orElse(null));
    }

    public View sign(Long id, String username, String signature, String revision) {
        Inquiry inquiry = lock(id);
        User user = authorized(inquiry, username);
        requireAccepted(inquiry);
        String name = signature == null ? "" : signature.strip();
        if (name.length() < 2 || name.length() > 120) throw error("Enter your full name to sign.");
        Terms terms = currentTerms(inquiry);
        if (terms.bookedFrom().isBefore(LocalDate.now())) throw error("The venue booking window has already started.");
        String snapshot = encode(terms);
        if (!Objects.equals(revision, revision(snapshot))) throw error("The terms changed. Refresh and review them before signing.");
        BookingAgreement agreement = agreements.findById(id).orElseGet(BookingAgreement::new);
        if (agreement.getInquiryId() == null) {
            agreement.setInquiryId(id);
            agreement.setTermsSnapshot(snapshot);
        }
        if (!snapshot.equals(agreement.getTermsSnapshot())) {
            throw error("The signed terms differ from the current proposal. Ask the coordinator to review the booking.");
        }
        if (user.getRole() == Role.CLIENT && agreement.getClientSignedAt() == null) {
            agreement.setClientSignature(name);
            agreement.setClientSignedAt(Instant.now());
        } else if (user.getRole() == Role.COORDINATOR && agreement.getCoordinatorSignedAt() == null) {
            agreement.setCoordinatorSignature(name);
            agreement.setCoordinatorSignedBy(user.getId());
            agreement.setCoordinatorSignedAt(Instant.now());
        }
        agreements.save(agreement);
        return view(inquiry, user, agreement);
    }

    public View upload(Long id, String username, byte[] contents) {
        Inquiry inquiry = lock(id);
        User user = authorized(inquiry, username);
        if (user.getRole() != Role.CLIENT) throw new AccessDeniedException("Only the client may upload a receipt.");
        BookingAgreement agreement = signed(inquiry);
        if (agreement.getReceiptUploadedAt() != null && agreement.getRejectionReason() == null) {
            throw error("A receipt is already awaiting review.");
        }
        agreement.setReceiptType(fileType(contents));
        agreement.setReceipt(contents);
        agreement.setReceiptUploadedAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        agreement.setRejectionReason(null);
        return view(inquiry, user, agreement);
    }

    @Transactional(readOnly = true)
    public Receipt receipt(Long id, String username) {
        Inquiry inquiry = inquiries.findById(id).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
        authorized(inquiry, username);
        BookingAgreement agreement = agreements.findById(id).orElseThrow(() -> new EntityNotFoundException("Receipt", id));
        if (agreement.getReceipt() == null) throw new EntityNotFoundException("Receipt", id);
        return new Receipt(agreement.getReceipt(), agreement.getReceiptType());
    }

    public View reject(Long id, String username, String reason, String expectedReceipt) {
        Inquiry inquiry = lock(id);
        User user = requireCoordinator(inquiry, username);
        BookingAgreement agreement = signed(inquiry);
        requireCurrentReceipt(agreement, expectedReceipt);
        if (reason == null || reason.isBlank() || reason.length() > 1000) {
            throw error("Give the client a reason of up to 1,000 characters.");
        }
        agreement.setRejectionReason(reason.strip());
        return view(inquiry, user, agreement);
    }

    public Event verifyAndBook(Long id, String username, String expectedReceipt) {
        Inquiry inquiry = lock(id);
        User coordinator = requireCoordinator(inquiry, username);
        BookingAgreement existing = agreements.findById(id)
                .orElseThrow(() -> error("Both parties must sign the contract first."));
        Terms signedTerms = decode(existing.getTermsSnapshot());
        venues.getByIdForUpdate(signedTerms.venueId());
        BookingAgreement agreement = signed(inquiry);
        requireCurrentReceipt(agreement, expectedReceipt);
        Terms terms = signedTerms;
        if (terms.bookedFrom().isBefore(LocalDate.now())) throw error("The venue booking window has already started.");
        ConvertToEventRequest request = new ConvertToEventRequest();
        request.setVenueId(terms.venueId());
        request.setVenue(terms.venue());
        request.setVenueDetails(terms.venueDetails());
        request.setCategories(terms.services());
        Event event = inquiryService.convertToEvent(id, request);
        agreement.setVerifiedBy(coordinator.getId());
        agreement.setVerifiedAt(Instant.now());
        return event;
    }

    private View view(Inquiry inquiry, User user, BookingAgreement agreement) {
        boolean client = user.getRole() == Role.CLIENT;
        if (agreement == null && inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED) {
            return new View("NOT_AVAILABLE", null, null, null, null, null, null, null, null, null, client, !client, null);
        }
        Terms terms = agreement == null ? currentTerms(inquiry) : decode(agreement.getTermsSnapshot());
        String revision = revision(agreement == null ? encode(terms) : agreement.getTermsSnapshot());
        if (agreement == null) {
            return new View("AWAITING_SIGNATURES", terms, revision, null, null, null, null, null, null, null, client, !client,
                    availabilityWarning(terms));
        }
        String state = agreement.getVerifiedAt() != null ? "BOOKED"
                : !matchesCurrentTerms(inquiry, agreement) ? "TERMS_CHANGED"
                : agreement.getRejectionReason() != null ? "RECEIPT_REJECTED"
                : agreement.getReceiptUploadedAt() != null ? "AWAITING_REVIEW"
                : agreement.getClientSignedAt() != null && agreement.getCoordinatorSignedAt() != null
                    ? "AWAITING_RECEIPT" : "AWAITING_SIGNATURES";
        return new View(state, terms, revision, agreement.getClientSignature(), agreement.getClientSignedAt(),
                agreement.getCoordinatorSignature(), agreement.getCoordinatorSignedAt(), agreement.getReceiptUploadedAt(),
                agreement.getRejectionReason(), agreement.getVerifiedAt(), client, !client,
                state.equals("BOOKED") || state.equals("TERMS_CHANGED") ? null : availabilityWarning(terms));
    }

    private boolean matchesCurrentTerms(Inquiry inquiry, BookingAgreement agreement) {
        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED || inquiry.getEvent() != null) return false;
        try {
            return encode(currentTerms(inquiry)).equals(agreement.getTermsSnapshot());
        } catch (BusinessException | EntityNotFoundException e) {
            return false;
        }
    }

    private String availabilityWarning(Terms terms) {
        if (terms.bookedFrom().isBefore(LocalDate.now())) return "The venue booking window has already started.";
        return venues.explainVenueFit(terms.eventDate(), terms.endDate(), terms.attendees(), null, terms.eventType())
                .stream().filter(fit -> fit.venueId().equals(terms.venueId()) && !fit.eligible())
                .findFirst().map(fit -> String.join(" ", fit.blockers())).orElse(null);
    }

    private BookingAgreement signed(Inquiry inquiry) {
        requireAccepted(inquiry);
        BookingAgreement agreement = agreements.findById(inquiry.getId())
                .orElseThrow(() -> error("Both parties must sign the contract first."));
        if (agreement.getClientSignedAt() == null || agreement.getCoordinatorSignedAt() == null) {
            throw error("Both parties must sign the contract first.");
        }
        if (!encode(currentTerms(inquiry)).equals(agreement.getTermsSnapshot())) {
            throw error("The signed terms differ from the current proposal.");
        }
        return agreement;
    }

    private Terms currentTerms(Inquiry inquiry) {
        try {
            var proposal = json.readTree(inquiry.getProposal());
            var venueId = proposal.path("venueId");
            var price = proposal.path("price");
            if (!venueId.isIntegralNumber() || !price.isIntegralNumber() || !price.canConvertToInt() || price.asInt() <= 0) {
                throw error("The accepted proposal must include a venue and a positive total in ETB.");
            }
            Venue venue = venues.getById(venueId.asLong());
            LocalDate start = inquiry.getEventDate();
            LocalDate end = inquiry.getEndDate() == null ? start : inquiry.getEndDate();
            if (end.isBefore(start)) throw error("The event end date cannot precede the start date.");
            var window = VenueBookingWindow.forEvent(inquiry.getEventType(), start, end,
                    venue.getSetupBufferDays(), venue.getTeardownBufferDays());
            var services = CategoryUtils.split(inquiry.getCategories());
            if (services.isEmpty()) services = CategoryUtils.split(inquiry.getRequestedCategories());
            if (services.isEmpty()) services = CategoryUtils.categoriesForEventType(inquiry.getEventType());
            return new Terms(proposal.path("proposalNumber").asText(), inquiry.getClientName(), inquiry.getEventType(),
                    start, end, inquiry.getExpectedAttendees(), venue.getId(), proposal.path("venue").asText(venue.getName()),
                    proposal.path("venueDetails").asText(null), window.from(), window.through(), price.asInt(),
                    services, proposal.path("terms").asText(""));
        } catch (IOException | IllegalArgumentException e) {
            throw error("The accepted proposal has no readable contract terms.");
        }
    }

    private static void requireCurrentReceipt(BookingAgreement agreement, String expectedReceipt) {
        if (agreement.getReceiptUploadedAt() == null || agreement.getRejectionReason() != null) {
            throw error("There is no receipt awaiting review.");
        }
        if (!agreement.getReceiptUploadedAt().toString().equals(expectedReceipt)) {
            throw error("The receipt changed. Download and review the current receipt.");
        }
    }

    private Inquiry lock(Long id) {
        return inquiries.findForCoordinatorUpdate(id).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
    }

    private User requireCoordinator(Inquiry inquiry, String username) {
        User user = authorized(inquiry, username);
        if (user.getRole() != Role.COORDINATOR) throw new AccessDeniedException("Only the assigned coordinator may review payment.");
        return user;
    }

    private User authorized(Inquiry inquiry, String username) {
        User user = users.findByUsername(username).orElseThrow(() -> new AccessDeniedException("Account unavailable."));
        if (user.getRole() == Role.CLIENT && user.getId().equals(inquiry.getClientId())) return user;
        if (user.getRole() == Role.COORDINATOR && inquiry.getCoordinator() != null
                && user.getId().equals(inquiry.getCoordinator().getId())) return user;
        throw new AccessDeniedException("Only the client and the assigned coordinator can access this contract.");
    }

    private static void requireAccepted(Inquiry inquiry) {
        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED || inquiry.getEvent() != null) {
            throw error("An accepted proposal without a booking is required.");
        }
    }

    private String encode(Terms terms) {
        try { return json.writeValueAsString(terms); }
        catch (IOException e) { throw new IllegalStateException("Could not save contract terms", e); }
    }

    private Terms decode(String snapshot) {
        try { return json.readValue(snapshot, Terms.class); }
        catch (IOException e) { throw new IllegalStateException("Could not read saved contract terms", e); }
    }

    private static String revision(String snapshot) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(snapshot.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private static String fileType(byte[] bytes) {
        if (bytes != null && bytes.length >= 8 && bytes.length <= 5 * 1024 * 1024) {
            if (bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F' && bytes[4] == '-') return "application/pdf";
            if ((bytes[0] & 255) == 137 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                    && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10) return "image/png";
            if ((bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255) return "image/jpeg";
        }
        throw error("Upload a PDF, PNG, or JPEG receipt up to 5 MB.");
    }

    private static BusinessException error(String message) {
        return new BusinessException(message, "BOOKING_AGREEMENT_REQUIRED");
    }
}
