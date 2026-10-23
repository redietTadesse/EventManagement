package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.VendorBookedDate;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.payload.AvailabilityGridResponse;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AvailabilityService {

    private final VendorRepository vendorRepository;
    private final VendorAssignmentRepository assignmentRepository;
    private final VendorBookedDateRepository bookedDateRepository;

    public AvailabilityGridResponse getAvailabilityGrid(String category, int daysAhead) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(daysAhead -1);

        // 1. Fetch all active vendors for this category
        List<Vendor> vendors = vendorRepository.findActiveByCategory(category);

        // 2. Fetch all assignments and manual booked dates in this range
        List<VendorAssignment> assignments = assignmentRepository.findActiveAssignmentsInDateRange(startDate, endDate);
        List<VendorBookedDate> bookedDates = bookedDateRepository.findAllBookedDatesInRange(startDate, endDate);

        // 3. Group them by Vendor ID for fast lookup
        Map<Long, List<VendorAssignment>> assignmentsByVendor = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getVendor().getId()));

        Map<Long, List<LocalDate>> bookedDatesByVendor = bookedDates.stream()
                .collect(Collectors.groupingBy(
                        bd -> bd.getVendor().getId(),
                        Collectors.mapping(VendorBookedDate::getBookedDate, Collectors.toList())
                ));

        // 4. Build the grid
        List<AvailabilityGridResponse.VendorRow> vendorRows = new ArrayList<>();

        for (Vendor vendor : vendors) {
            List<AvailabilityGridResponse.DayCell> days = new ArrayList<>();

            List<VendorAssignment> vendorAssignments = assignmentsByVendor.getOrDefault(vendor.getId(), List.of());
            List<LocalDate> vendorBlockedDates = bookedDatesByVendor.getOrDefault(vendor.getId(), List.of());

            for (int i = 0; i < daysAhead; i++) {
                LocalDate currentDate = startDate.plusDays(i);
                AvailabilityGridResponse.DayCell cell = buildCellForDate(currentDate, vendorAssignments, vendorBlockedDates);
                days.add(cell);
            }

            vendorRows.add(AvailabilityGridResponse.VendorRow.builder()
                    .vendorId(vendor.getId())
                    .companyName(vendor.getCompanyName())
                    .serviceCategory(vendor.getServiceCategory())
                    .days(days)
                    .build());
        }

        return AvailabilityGridResponse.builder()
                .startDate(startDate)
                .endDate(endDate)
                .vendors(vendorRows)
                .build();
    }

    private AvailabilityGridResponse.DayCell buildCellForDate(
            LocalDate date,
            List<VendorAssignment> assignments,
            List<LocalDate> blockedDates) {

        // Check 1: Manual Blocked Date (RED)
        if (blockedDates.contains(date)) {
            return AvailabilityGridResponse.DayCell.builder()
                    .date(date)
                    .status("BOOKED")
                    .eventName("Blocked by Admin") // No event associated
                    .build();
        }

        // Check 2: Assignment (RED or YELLOW)
        for (VendorAssignment va : assignments) {
            LocalDate eventDate = va.getEvent().getInquiry().getEventDate();
            if (eventDate.equals(date)) {
                String status = (va.getStatus() == VendorAssignmentStatus.PENDING) ? "PENDING" : "BOOKED";
                return AvailabilityGridResponse.DayCell.builder()
                        .date(date)
                        .status(status)
                        .eventName(va.getEvent().getName())
                        .eventId(va.getEvent().getId())
                        .assignmentId(va.getId())
                        .build();
            }
        }

        // Check 3: FREE (GREEN)
        return AvailabilityGridResponse.DayCell.builder()
                .date(date)
                .status("FREE")
                .build();
    }
}