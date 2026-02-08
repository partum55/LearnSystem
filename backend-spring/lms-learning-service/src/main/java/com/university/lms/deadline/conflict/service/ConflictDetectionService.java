package com.university.lms.deadline.conflict.service;

import com.university.lms.deadline.conflict.dto.ConflictDto;
import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.entity.DeadlineType;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConflictDetectionService {

    private final DeadlineRepository deadlineRepository;

    @Value("${notification.thresholds.overload-minutes:240}")
    private int overloadMinutes;

    public List<ConflictDto> detectConflicts(Long studentGroupId) {
        List<Deadline> deadlines = deadlineRepository.findByStudentGroupId(studentGroupId);
        Map<LocalDate, List<Deadline>> byDate = deadlines.stream()
                .collect(Collectors.groupingBy(d -> d.getDueAt().toLocalDate()));

        List<ConflictDto> conflicts = new ArrayList<>();
        byDate.forEach((date, dateDeadlines) -> {
            int totalEffort = dateDeadlines.stream().mapToInt(Deadline::getEstimatedEffort).sum();
            long majorCount = dateDeadlines.stream()
                    .filter(d -> d.getType() == DeadlineType.ASSIGNMENT || d.getType() == DeadlineType.EXAM)
                    .count();
            boolean sameTimestamp = dateDeadlines.stream()
                    .collect(Collectors.groupingBy(Deadline::getDueAt, Collectors.counting()))
                    .values().stream().anyMatch(count -> count > 1);

            if (totalEffort > overloadMinutes) {
                conflicts.add(buildConflict(date, "OVERLOAD", "Workload exceeds threshold", dateDeadlines));
            }
            if (majorCount > 3) {
                conflicts.add(buildConflict(date, "MAJOR_OVERFLOW", "More than 3 major deadlines", dateDeadlines));
            }
            if (sameTimestamp) {
                conflicts.add(buildConflict(date, "SIMULTANEOUS", "Multiple deadlines share same due time", dateDeadlines));
            }
        });
        return conflicts;
    }

    private ConflictDto buildConflict(LocalDate date, String type, String message, List<Deadline> deadlines) {
        return ConflictDto.builder()
                .date(date)
                .type(type)
                .message(message)
                .deadlineIds(deadlines.stream().map(Deadline::getId).toList())
                .build();
    }
}

