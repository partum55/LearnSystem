package com.university.lms.deadline.workload.service;

import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.workload.entity.WorkloadSnapshot;
import com.university.lms.deadline.workload.repository.WorkloadSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkloadEngineService {

    private final DeadlineRepository deadlineRepository;
    private final WorkloadSnapshotRepository snapshotRepository;

    @Transactional
    public void recomputeForGroup(Long studentGroupId) {
        var now = OffsetDateTime.now();
        var from = now.minusDays(30);
        var deadlines = deadlineRepository.findByStudentGroupIdAndDueAtBetween(studentGroupId, from, now.plusDays(30));

        Map<LocalDate, Integer> workloadByDay = deadlines.stream()
                .collect(Collectors.groupingBy(d -> d.getDueAt().toLocalDate(), Collectors.summingInt(d -> d.getEstimatedEffort())));

        workloadByDay.forEach((date, minutes) -> {
            WorkloadSnapshot snapshot = snapshotRepository
                    .findByStudentIdAndDate(studentGroupId, date)
                    .map(existing -> {
                        existing.setTotalEffort(minutes);
                        existing.setGeneratedAt(OffsetDateTime.now());
                        return existing;
                    })
                    .orElseGet(() -> WorkloadSnapshot.builder()
                            .studentId(studentGroupId)
                            .date(date)
                            .totalEffort(minutes)
                            .build());
            snapshotRepository.save(snapshot);
        });
        log.info("Recomputed workload for group {}", studentGroupId);
    }
}

