package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.AvailabilityWatch;
import com.aicc.eventmanagement.repositories.AvailabilityWatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;

@Component @RequiredArgsConstructor @Slf4j
@ConditionalOnProperty(name="app.availability-watch.enabled", havingValue="true", matchIfMissing=true)
public class AvailabilityWatchScheduler {
    private final AvailabilityWatchRepository watches;
    private final AvailabilityWatchService service;
    @Scheduled(initialDelayString="${app.availability-watch.scan-ms:60000}", fixedDelayString="${app.availability-watch.scan-ms:60000}")
    public void scan() {
        for (Long id : watches.due(AvailabilityWatch.Status.WAITING, Instant.now(), PageRequest.of(0, 100))) {
            try { service.process(id, Instant.now()); }
            catch (Exception ex) { log.error("Availability waiting-list check failed for record {}", id, ex); }
        }
    }
}
