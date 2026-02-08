package com.university.lms.deadline.scheduler;

import com.university.lms.deadline.deadline.service.DeadlineIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Scheduled ingestion of deadlines from course/assessment services.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeadlineIngestionScheduler {

    private final DeadlineIngestionService ingestionService;

    @Scheduled(cron = "${deadline.ingestion.cron:0 */10 * * * *}")
    public void ingestDeadlines() {
        log.debug("Starting deadline ingestion cron");
        // TODO: Fetch active course IDs from course service
        // Placeholder: ingest for test course
        // ingestionService.ingestFromCourse(UUID.randomUUID());
        log.debug("Deadline ingestion cron completed");
    }
}

