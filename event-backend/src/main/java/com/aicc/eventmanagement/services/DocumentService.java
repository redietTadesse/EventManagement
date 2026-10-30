package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.VenueRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Generates the client-facing rental agreement PDF for an event.
 *
 * Everything the document needs is loaded inside one read-only transaction with
 * explicit fetch joins, because open-in-view is false: touching a lazy
 * association while rendering would throw outside the transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    @PersistenceContext
    private EntityManager entityManager;

    private final VenueRepository venueRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d MMMM yyyy");

    private static final Color AICC_NAVY = new Color(26, 44, 82);
    private static final Color RULE_GREY = new Color(200, 200, 200);
    private static final Color LABEL_GREY = new Color(110, 110, 110);

    private static final String FOOTER_TEXT =
            "This is a system-generated agreement. 30% deposit required to confirm.";

    /**
     * Builds the agreement as PDF bytes.
     *
     * Returns bytes rather than streaming so the transaction can close before the
     * response is written, and so a rendering failure surfaces as a clean error
     * rather than a half-sent document.
     */
    @Transactional(readOnly = true)
    public byte[] generateRentalAgreement(Long eventId) {
        Event event = loadEvent(eventId);
        Inquiry inquiry = event.getInquiry();

        if (inquiry == null) {
            throw new BusinessException(
                    "Event " + eventId + " has no inquiry, so no client details are available",
                    "NO_INQUIRY");
        }

        Venue venue = resolveVenue(event);
        List<VendorAssignment> acceptedVendors = loadAcceptedVendors(eventId);
        BigDecimal totalPrice = extractTotalPrice(inquiry);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 56, 56, 56, 72);

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterEvent());
            document.addTitle("Facility Rental Agreement - " + event.getName());
            document.addCreator("AICC Event Management System");
            document.open();

            addLetterhead(document);
            addTitleBlock(document, event);
            addPartiesBlock(document, inquiry);
            addDetailsTable(document, event, inquiry, venue, totalPrice);
            addVendorTable(document, acceptedVendors);
            addSignatureBlock(document);

            document.close();
        } catch (DocumentException e) {
            log.error("Failed to render agreement for event {}", eventId, e);
            throw new BusinessException("Could not generate the agreement document",
                    "PDF_GENERATION_FAILED");
        }

        log.info("Generated rental agreement for event {} ({} accepted vendors)",
                eventId, acceptedVendors.size());
        return out.toByteArray();
    }

    /** A sensible download filename, safe for Content-Disposition. */
    public String agreementFileName(Long eventId) {
        return "AICC-Rental-Agreement-Event-" + eventId + ".pdf";
    }

    // --- Data loading ---

    private Event loadEvent(Long eventId) {
        return entityManager.createQuery("""
                        SELECT e FROM Event e
                        JOIN FETCH e.inquiry
                        WHERE e.id = :id
                        """, Event.class)
                .setParameter("id", eventId)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));
    }

    /**
     * Venue resolution goes through venueId rather than the denormalised venue
     * string or the venueDetails JSON, both of which are frequently null.
     */
    private Venue resolveVenue(Event event) {
        if (event.getVenueId() == null) {
            return null;
        }
        return venueRepository.findById(event.getVenueId()).orElse(null);
    }

    /**
     * Queried through the EntityManager rather than a repository method so this
     * feature adds no surface to VendorAssignmentRepository, which other work
     * is actively changing.
     */
    private List<VendorAssignment> loadAcceptedVendors(Long eventId) {
        return entityManager.createQuery("""
                        SELECT va FROM VendorAssignment va
                        LEFT JOIN FETCH va.vendor
                        WHERE va.event.id = :eventId
                          AND va.status = :status
                        ORDER BY va.serviceCategory
                        """, VendorAssignment.class)
                .setParameter("eventId", eventId)
                .setParameter("status", VendorAssignmentStatus.ACCEPTED)
                .getResultList();
    }

    /**
     * There is no price column anywhere on the model, so the figure is read from
     * the proposal JSON when the coordinator has quoted one. Several key spellings
     * are accepted because the proposal shape is not yet fixed. A null result
     * renders as "To be confirmed" rather than a fabricated number.
     */
    private BigDecimal extractTotalPrice(Inquiry inquiry) {
        String proposal = inquiry.getProposal();
        if (proposal == null || proposal.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(proposal);
            for (String key : List.of("totalPrice", "total", "totalAmount", "amount", "price")) {
                JsonNode node = root.get(key);
                if (node != null && node.isNumber()) {
                    return node.decimalValue();
                }
                if (node != null && node.isTextual()) {
                    try {
                        return new BigDecimal(node.asText().replaceAll("[^0-9.]", ""));
                    } catch (NumberFormatException ignored) {
                        // fall through to the next key
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not read a total price from the proposal on inquiry {}",
                    inquiry.getId());
        }
        return null;
    }

    // --- Rendering ---

    /**
     * Uses the logo at static/aicc-logo.png when it is present, and falls back to
     * a text wordmark so the document still renders on a machine without it.
     */
    private void addLetterhead(Document document) throws DocumentException {
        try {
            ClassPathResource logo = new ClassPathResource("static/aicc-logo.png");
            if (logo.exists()) {
                Image image = Image.getInstance(logo.getContentAsByteArray());
                image.scaleToFit(140f, 70f);
                image.setAlignment(Element.ALIGN_LEFT);
                document.add(image);
                document.add(wordmarkSubtitle());
                document.add(rule());
                return;
            }
        } catch (Exception e) {
            log.warn("Logo could not be loaded, falling back to the text wordmark", e);
        }

        Paragraph wordmark = new Paragraph("AICC",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 26, AICC_NAVY));
        wordmark.setSpacingAfter(2f);
        document.add(wordmark);
        document.add(wordmarkSubtitle());
        document.add(rule());
    }

    private Paragraph wordmarkSubtitle() {
        Paragraph subtitle = new Paragraph("Addis International Convention Centre",
                FontFactory.getFont(FontFactory.HELVETICA, 10, LABEL_GREY));
        subtitle.setSpacingAfter(10f);
        return subtitle;
    }

    private Paragraph rule() {
        Paragraph spacer = new Paragraph();
        spacer.setSpacingAfter(14f);
        return spacer;
    }

    private void addTitleBlock(Document document, Event event) throws DocumentException {
        Paragraph title = new Paragraph("FACILITY RENTAL AGREEMENT",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, AICC_NAVY));
        title.setSpacingAfter(4f);
        document.add(title);

        Paragraph reference = new Paragraph(
                "Agreement reference: AICC-" + event.getId()
                        + "   |   Issued: " + LocalDate.now().format(DATE_FORMAT),
                FontFactory.getFont(FontFactory.HELVETICA, 9, LABEL_GREY));
        reference.setSpacingAfter(18f);
        document.add(reference);
    }

    private void addPartiesBlock(Document document, Inquiry inquiry) throws DocumentException {
        document.add(sectionHeading("Parties"));

        PdfPTable parties = new PdfPTable(2);
        parties.setWidthPercentage(100);
        parties.setSpacingAfter(18f);

        parties.addCell(partyCell("Venue", "Addis International Convention Centre\nAddis Ababa, Ethiopia"));
        parties.addCell(partyCell("Client", safe(inquiry.getClientName())));

        document.add(parties);
    }

    private void addDetailsTable(Document document, Event event, Inquiry inquiry,
                                 Venue venue, BigDecimal totalPrice) throws DocumentException {
        document.add(sectionHeading("Event details"));

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.1f, 2.4f});
        table.setSpacingAfter(18f);

        addRow(table, "Event", safe(event.getName()));
        addRow(table, "Event type", safe(inquiry.getEventType()));
        addRow(table, "Date", inquiry.getEventDate() != null
                ? inquiry.getEventDate().format(DATE_FORMAT) : "To be confirmed");
        addRow(table, "Expected attendees", inquiry.getExpectedAttendees() != null
                ? String.valueOf(inquiry.getExpectedAttendees()) : "To be confirmed");
        addRow(table, "Venue", venue != null ? venue.getName() : "To be assigned");
        addRow(table, "Location", venue != null ? safe(venue.getLocation()) : "To be assigned");
        addRow(table, "Capacity", venue != null && venue.getCapacity() != null
                ? venue.getCapacity() + " guests" : "To be confirmed");
        addRow(table, "Total price", totalPrice != null
                ? "ETB " + totalPrice.toPlainString() : "To be confirmed");

        document.add(table);
    }

    private void addVendorTable(Document document, List<VendorAssignment> assignments)
            throws DocumentException {
        document.add(sectionHeading("Confirmed vendors"));

        if (assignments.isEmpty()) {
            Paragraph none = new Paragraph("No vendors have confirmed for this event yet.",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, LABEL_GREY));
            none.setSpacingAfter(18f);
            document.add(none);
            return;
        }

        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.2f, 2f, 1.6f});
        table.setSpacingAfter(18f);
        table.setHeaderRows(1);

        table.addCell(headerCell("Service"));
        table.addCell(headerCell("Vendor"));
        table.addCell(headerCell("Contact"));

        for (VendorAssignment assignment : assignments) {
            Vendor vendor = assignment.getVendor();

            table.addCell(bodyCell(titleCase(assignment.getServiceCategory())));
            table.addCell(bodyCell(vendor != null && vendor.getCompanyName() != null
                    ? vendor.getCompanyName()
                    : safe(assignment.getVendorName())));
            table.addCell(bodyCell(vendor != null ? contactLine(vendor) : "Not provided"));
        }

        document.add(table);
    }

    private void addSignatureBlock(Document document) throws DocumentException {
        document.add(sectionHeading("Acceptance"));

        Paragraph terms = new Paragraph(
                "By signing below the client accepts the booking described above and agrees "
                        + "to pay the deposit stated in the footer of this document. The venue "
                        + "reserves the right to release the booking if the deposit is not "
                        + "received.",
                FontFactory.getFont(FontFactory.HELVETICA, 9.5f, Color.BLACK));
        terms.setSpacingAfter(28f);
        document.add(terms);

        PdfPTable signatures = new PdfPTable(2);
        signatures.setWidthPercentage(100);
        signatures.addCell(signatureCell("For the client"));
        signatures.addCell(signatureCell("For AICC"));
        document.add(signatures);
    }

    // --- Small rendering helpers ---

    private Paragraph sectionHeading(String text) {
        Paragraph heading = new Paragraph(text.toUpperCase(),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, AICC_NAVY));
        heading.setSpacingAfter(6f);
        return heading;
    }

    private void addRow(PdfPTable table, String label, String value) {
        table.addCell(labelCell(label));
        table.addCell(bodyCell(value));
    }

    private PdfPCell labelCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                FontFactory.getFont(FontFactory.HELVETICA, 10, LABEL_GREY)));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(RULE_GREY);
        cell.setPadding(7f);
        return cell;
    }

    private PdfPCell bodyCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK)));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(RULE_GREY);
        cell.setPadding(7f);
        return cell;
    }

    private PdfPCell headerCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE)));
        cell.setBackgroundColor(AICC_NAVY);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(7f);
        return cell;
    }

    private PdfPCell partyCell(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPaddingRight(18f);

        Paragraph labelPara = new Paragraph(label.toUpperCase(),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, LABEL_GREY));
        labelPara.setSpacingAfter(3f);
        cell.addElement(labelPara);
        cell.addElement(new Paragraph(value,
                FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK)));
        return cell;
    }

    private PdfPCell signatureCell(String label) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPaddingRight(24f);

        Paragraph line = new Paragraph("_______________________________",
                FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK));
        line.setSpacingAfter(4f);
        cell.addElement(line);
        cell.addElement(new Paragraph(label + "   |   Date",
                FontFactory.getFont(FontFactory.HELVETICA, 8.5f, LABEL_GREY)));
        return cell;
    }

    private String contactLine(Vendor vendor) {
        if (vendor.getPhone() != null && !vendor.getPhone().isBlank()) {
            return vendor.getPhone();
        }
        if (vendor.getEmail() != null && !vendor.getEmail().isBlank()) {
            return vendor.getEmail();
        }
        return "Not provided";
    }

    private String titleCase(String value) {
        if (value == null || value.isBlank()) {
            return "Other";
        }
        return value.substring(0, 1).toUpperCase() + value.substring(1).toLowerCase();
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "Not recorded" : value;
    }

    /** Stamps the deposit notice and a page number on every page. */
    private static class FooterEvent extends PdfPageEventHelper {

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            Font font = FontFactory.getFont(FontFactory.HELVETICA, 8, LABEL_GREY);

            PdfPTable footer = new PdfPTable(2);
            try {
                footer.setWidths(new float[]{4f, 1f});
                footer.setTotalWidth(document.right() - document.left());

                PdfPCell notice = new PdfPCell(new Phrase(FOOTER_TEXT, font));
                notice.setBorder(Rectangle.TOP);
                notice.setBorderColor(RULE_GREY);
                notice.setPaddingTop(6f);
                footer.addCell(notice);

                PdfPCell page = new PdfPCell(
                        new Phrase("Page " + writer.getPageNumber(), font));
                page.setBorder(Rectangle.TOP);
                page.setBorderColor(RULE_GREY);
                page.setPaddingTop(6f);
                page.setHorizontalAlignment(Element.ALIGN_RIGHT);
                footer.addCell(page);

                footer.writeSelectedRows(0, -1, document.left(),
                        document.bottom() - 6f, writer.getDirectContent());
            } catch (DocumentException e) {
                // A footer failure must never abort the document.
            }
        }
    }
}