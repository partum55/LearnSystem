package com.university.lms.deadline.workload.scheduler;

import com.university.lms.deadline.workload.service.WorkloadEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled workload snapshot recomputation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WorkloadSnapshotScheduler {

    private final WorkloadEngineService workloadEngineService;

    @Scheduled(cron = "${workload.snapshot.cron:0 0 * * * *}")
    public void recomputeWorkloads() {
        log.debug("Starting workload snapshot recomputation");
        // TODO: Iterate over all active student groups
        // workloadEngineService.recomputeForGroup(groupId);
        log.debug("Workload snapshot recomputation completed");
    }
}

