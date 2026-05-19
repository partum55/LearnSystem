package com.university.lms.deadline.calendar.service;

import com.university.lms.deadline.calendar.dto.CalendarDayDto;
import com.university.lms.deadline.conflict.dto.ConflictDto;
import com.university.lms.deadline.conflict.service.ConflictDetectionService;
import com.university.lms.deadline.deadline.dto.DeadlineDto;
import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.mapper.DeadlineMapper;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.workload.repository.WorkloadSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final DeadlineRepository deadlineRepository;
    private final DeadlineMapper deadlineMapper;
    private final WorkloadSnapshotRepository snapshotRepository;
    private final ConflictDetectionService conflictDetectionService;

    @Value("${notification.thresholds.overload-minutes:240}")
    private int overloadMinutes;

    public List<CalendarDayDto> getStudentMonth(Long studentGroupId, YearMonth month) {
        OffsetDateTime from = month.atDay(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime to = month.atEndOfMonth().plusDays(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        List<Deadline> deadlines = deadlineRepository.findByStudentGroupIdAndDueAtBetween(studentGroupId, from, to);
        Map<LocalDate, List<Deadline>> byDate = deadlines.stream().collect(Collectors.groupingBy(d -> d.getDueAt().toLocalDate()));

        return byDate.entrySet().stream().map(entry -> {
            int workload = entry.getValue().stream().mapToInt(Deadline::getEstimatedEffort).sum();
            List<DeadlineDto> dtos = entry.getValue().stream().map(deadlineMapper::toDto).toList();
            return CalendarDayDto.builder()
                    .date(entry.getKey())
                    .workloadMinutes(workload)
                    .isOverloaded(workload > overloadMinutes)
                    .deadlines(dtos)
                    .build();
        }).toList();
    }

    public List<ConflictDto> getConflicts(Long studentGroupId) {
        return conflictDetectionService.detectConflicts(studentGroupId);
    }
}

