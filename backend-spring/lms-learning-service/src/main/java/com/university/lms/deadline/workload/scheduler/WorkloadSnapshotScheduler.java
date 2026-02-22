package com.university.lms.deadline.workload.scheduler;

import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.workload.service.WorkloadEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Scheduled workload snapshot recomputation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WorkloadSnapshotScheduler {

    private final DeadlineRepository deadlineRepository;
    private final WorkloadEngineService workloadEngineService;

    @Scheduled(cron = "${workload.snapshot.cron:0 0 * * * *}")
    public void recomputeWorkloads() {
        log.debug("Starting workload snapshot recomputation");
        List<Long> studentGroupIds = deadlineRepository.findDistinctStudentGroupIds();

        if (studentGroupIds.isEmpty()) {
            log.debug("Workload snapshot recomputation skipped: no student groups with deadlines");
            return;
        }

        int processedGroups = 0;
        for (Long studentGroupId : studentGroupIds) {
            try {
                workloadEngineService.recomputeForGroup(studentGroupId);
                processedGroups++;
            } catch (Exception exception) {
                log.warn(
                        "Failed to recompute workload for group {}: {}",
                        studentGroupId,
                        exception.getMessage(),
                        exception);
            }
        }

        log.info(
                "Workload snapshot recomputation completed for {} of {} student groups",
                processedGroups,
                studentGroupIds.size());
    }
}
