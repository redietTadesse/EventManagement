package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuotePdfService {

    private static final Color AICC_NAVY = new Color(30, 41, 59);
    private static final Color AICC_ICE = new Color(224, 242, 254);
    private static final Color AICC_GREEN = new Color(5, 150, 105);
    private static final Color BORDER = new Color(203, 213, 225);
    private static final Color MUTED = new Color(71, 85, 105);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    private static final Set<VendorAssignmentStatus> CURRENT_ASSIGNMENT_STATUSES = EnumSet.of(
            VendorAssignmentStatus.PENDING,
            VendorAssignmentStatus.ACCEPTED,
            VendorAssignmentStatus.COMPLETED,
            VendorAssignmentStatus.OPEN
    );

    private final InquiryRepository inquiryRepository;
    private final VenueRepository venueRepository;
    private final VendorAssignmentRepository vendorAssignmentRepository;
    private final ObjectMapper objectMapper;

    public byte[] generateQuotePdf(Long inquiryId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new BusinessException("Inquiry not found", "INQUIRY_NOT_FOUND"));
        JsonNode proposal = readProposal(inquiry);
        BigDecimal quoteTotal = readQuoteTotal(proposal);

        String venueName = resolveVenueName(inquiry, proposal);
        List<VendorAssignment> assignments = inquiry.getEvent() == null
                ? List.of()
                : vendorAssignmentRepository.findByEventId(inquiry.getEvent().getId()).stream()
                        .filter(assignment -> CURRENT_ASSIGNMENT_STATUSES.contains(assignment.getStatus()))
                        .sorted(Comparator.comparing(
                                VendorAssignment::getServiceCategory,
                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                        .toList();

        return renderPdf(inquiry, proposal, venueName, assignments, quoteTotal);
    }

    private JsonNode readProposal(Inquiry inquiry) {
        if (inquiry.getProposal() == null || inquiry.getProposal().isBlank()) {
            throw new BusinessException("This inquiry does not have a proposal to quote", "PROPOSAL_NOT_FOUND");
        }
        try {
            return objectMapper.readTree(inquiry.getProposal());
        } catch (IOException e) {
            throw new BusinessException("The stored proposal could not be read", "INVALID_PROPOSAL");
        }
    }

    private BigDecimal readQuoteTotal(JsonNode proposal) {
        JsonNode price = proposal.path("price");
        if (price.isNumber()) return price.decimalValue();
        if (price.isTextual()) {
            try {
                return new BigDecimal(price.asText());
            } catch (NumberFormatException ignored) {
                // Use the same clear error for absent and malformed stored prices.
            }
        }
        throw new BusinessException("The proposal does not have a valid quote price", "QUOTE_PRICE_NOT_FOUND");
    }

    private String resolveVenueName(Inquiry inquiry, JsonNode proposal) {
        Long venueId = readLong(proposal.path("venueId"));
        if (venueId == null && inquiry.getEvent() != null) venueId = inquiry.getEvent().getVenueId();

        if (venueId != null) {
            Venue venue = venueRepository.findById(venueId).orElse(null);
            if (venue != null) return venue.getName();
        }

        String proposedName = textOrNull(proposal.path("venue"));
        if (proposedName != null) {
            Venue venue = venueRepository.findByNameIgnoreCase(proposedName).orElse(null);
            if (venue != null) return venue.getName();
            return proposedName;
        }

        if (inquiry.getEvent() != null && inquiry.getEvent().getVenue() != null) {
            return inquiry.getEvent().getVenue();
        }
        return "Venue to be confirmed";
    }

    private byte[] renderPdf(Inquiry inquiry, JsonNode proposal, String venueName,
                             List<VendorAssignment> assignments, BigDecimal quoteTotal) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 42, 42, 42, 42);

        try {
            PdfWriter.getInstance(document, output);
            document.addTitle("AICC Official Quote - Inquiry " + inquiry.getId());
            document.addAuthor("Addis International Convention Center");
            document.open();

            addHeader(document, proposal, inquiry.getId());
            addInquiryDetails(document, inquiry);
            addLineItems(document, venueName, assignments, quoteTotal);
            addPricingNote(document, assignments);
            addFooter(document);

            document.close();
            return output.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("Could not generate quote PDF", e);
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private void addHeader(Document document, JsonNode proposal, Long inquiryId) throws DocumentException {
        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        PdfPCell bannerCell = new PdfPCell();
        bannerCell.setBackgroundColor(AICC_NAVY);
        bannerCell.setBorderColor(AICC_NAVY);
        bannerCell.setPadding(18);
        bannerCell.addElement(new Paragraph(
                "Addis International Convention Center - Official Quote",
                new Font(Font.HELVETICA, 17, Font.BOLD, Color.WHITE)));
        Paragraph quoteNumber = new Paragraph(
                "Quote " + firstText(proposal.path("proposalNumber"), "AICC-Q-" + inquiryId),
                new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(224, 242, 254)));
        quoteNumber.setSpacingBefore(5);
        bannerCell.addElement(quoteNumber);
        banner.addCell(bannerCell);
        document.add(banner);

        Paragraph issued = new Paragraph("Issued " + LocalDate.now().format(DATE_FORMAT),
                new Font(Font.HELVETICA, 9, Font.NORMAL, MUTED));
        issued.setAlignment(Element.ALIGN_RIGHT);
        issued.setSpacingBefore(8);
        issued.setSpacingAfter(14);
        document.add(issued);
    }

    private void addInquiryDetails(Document document, Inquiry inquiry) throws DocumentException {
        PdfPTable details = new PdfPTable(new float[]{1.0f, 2.3f, 1.0f, 2.3f});
        details.setWidthPercentage(100);
        details.setSpacingAfter(20);
        addDetail(details, "Client", valueOr(inquiry.getClientName(), "Not provided"));
        addDetail(details, "Event type", valueOr(inquiry.getEventType(), "Not provided"));
        addDetail(details, "Event date", formatDate(inquiry.getEventDate()));
        addDetail(details, "Attendees", inquiry.getExpectedAttendees() == null
                ? "Not provided" : inquiry.getExpectedAttendees().toString());
        document.add(details);
    }

    private void addLineItems(Document document, String venueName,
                              List<VendorAssignment> assignments, BigDecimal quoteTotal) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[]{4.2f, 1.4f});
        table.setWidthPercentage(100);
        table.setWidths(new float[]{4.2f, 1.4f});

        addTableHeader(table, "Description", Element.ALIGN_LEFT);
        addTableHeader(table, "Amount (ETB)", Element.ALIGN_RIGHT);

        addItem(table, "Venue Rental: " + venueName, quoteTotal);
        for (VendorAssignment assignment : assignments) {
            String category = valueOr(assignment.getServiceCategory(), "Vendor service").replace('_', ' ');
            addItem(table, category + " - included; no separate amount recorded", BigDecimal.ZERO);
        }

        PdfPCell totalLabel = new PdfPCell(new Phrase("Total Price",
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE)));
        totalLabel.setBackgroundColor(AICC_NAVY);
        totalLabel.setBorderColor(AICC_NAVY);
        totalLabel.setPadding(10);
        table.addCell(totalLabel);

        PdfPCell totalAmount = new PdfPCell(new Phrase(formatAmount(quoteTotal),
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE)));
        totalAmount.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalAmount.setBackgroundColor(AICC_NAVY);
        totalAmount.setBorderColor(AICC_NAVY);
        totalAmount.setPadding(10);
        table.addCell(totalAmount);

        document.add(table);
    }

    private void addPricingNote(Document document, List<VendorAssignment> assignments) throws DocumentException {
        Paragraph note;
        if (assignments.isEmpty()) {
            note = new Paragraph("No vendor assignments have been recorded for this inquiry yet.",
                    new Font(Font.HELVETICA, 9, Font.ITALIC, MUTED));
        } else {
            note = new Paragraph(
                    "Vendor assignment prices are not stored separately. Their ETB 0.00 rows are informational; "
                            + "the total above is the proposal's stored price.",
                    new Font(Font.HELVETICA, 9, Font.ITALIC, MUTED));
        }
        note.setSpacingBefore(10);
        document.add(note);
    }

    private void addFooter(Document document) throws DocumentException {
        Paragraph footer = new Paragraph("Addis International Convention Center | Quote prepared for the named client",
                new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED));
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(28);
        document.add(footer);
    }

    private void addDetail(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label,
                new Font(Font.HELVETICA, 9, Font.BOLD, AICC_NAVY)));
        labelCell.setBackgroundColor(AICC_ICE);
        labelCell.setBorderColor(BORDER);
        labelCell.setPadding(8);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value,
                new Font(Font.HELVETICA, 9, Font.NORMAL, AICC_NAVY)));
        valueCell.setBorderColor(BORDER);
        valueCell.setPadding(8);
        table.addCell(valueCell);
    }

    private void addTableHeader(PdfPTable table, String text, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE)));
        cell.setBackgroundColor(AICC_GREEN);
        cell.setBorderColor(AICC_GREEN);
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(9);
        table.addCell(cell);
    }

    private void addItem(PdfPTable table, String description, BigDecimal amount) {
        PdfPCell descriptionCell = new PdfPCell(new Phrase(description,
                new Font(Font.HELVETICA, 10, Font.NORMAL, AICC_NAVY)));
        descriptionCell.setBorderColor(BORDER);
        descriptionCell.setPadding(9);
        table.addCell(descriptionCell);

        PdfPCell amountCell = new PdfPCell(new Phrase(formatAmount(amount),
                new Font(Font.HELVETICA, 10, Font.NORMAL, AICC_NAVY)));
        amountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        amountCell.setBorderColor(BORDER);
        amountCell.setPadding(9);
        table.addCell(amountCell);
    }

    private Long readLong(JsonNode value) {
        if (value == null || value.isNull() || value.isMissingNode()) return null;
        if (value.isNumber()) return value.longValue();
        try {
            return Long.valueOf(value.asText());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String textOrNull(JsonNode value) {
        if (value == null || value.isNull() || value.isMissingNode()) return null;
        String text = value.asText().trim();
        return text.isEmpty() ? null : text;
    }

    private String firstText(JsonNode value, String fallback) {
        String text = textOrNull(value);
        return text == null ? fallback : text;
    }

    private String formatDate(LocalDate date) {
        return date == null ? "Not provided" : DATE_FORMAT.format(date);
    }

    private String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String formatAmount(BigDecimal amount) {
        NumberFormat format = NumberFormat.getNumberInstance(Locale.US);
        format.setMinimumFractionDigits(2);
        format.setMaximumFractionDigits(2);
        return format.format(amount);
    }
}
