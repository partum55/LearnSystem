package com.university.lms.deadline.conflict.service;

import com.university.lms.deadline.conflict.dto.ConflictDto;
import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.entity.DeadlineType;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConflictDetectionServiceTest {

    @Mock
    private DeadlineRepository deadlineRepository;

    @InjectMocks
    private ConflictDetectionService conflictDetectionService;

    @Test
    void detectConflicts_shouldDetectOverload() {
        ReflectionTestUtils.setField(conflictDetectionService, "overloadMinutes", 240);

        LocalDate date = LocalDate.now();

        List<Deadline> deadlines = List.of(
                createDeadline(1L, "Assignment 1", 120, DeadlineType.ASSIGNMENT, date.atTime(10, 0).atOffset(ZoneOffset.UTC)),
                createDeadline(2L, "Assignment 2", 120, DeadlineType.ASSIGNMENT, date.atTime(14, 0).atOffset(ZoneOffset.UTC)),
                createDeadline(3L, "Quiz", 30, DeadlineType.QUIZ, date.atTime(18, 0).atOffset(ZoneOffset.UTC))
        );

        when(deadlineRepository.findByStudentGroupId(1L)).thenReturn(deadlines);

        List<ConflictDto> conflicts = conflictDetectionService.detectConflicts(1L);

        assertThat(conflicts).hasSizeGreaterThanOrEqualTo(1);
        assertThat(conflicts.stream().anyMatch(c -> c.getType().equals("OVERLOAD"))).isTrue();
    }

    @Test
    void detectConflicts_shouldDetectMajorOverflow() {
        LocalDate date = LocalDate.now();
        OffsetDateTime dueTime = date.atTime(23, 59).atOffset(ZoneOffset.UTC);

        List<Deadline> deadlines = List.of(
                createDeadline(1L, "Assignment 1", 60, DeadlineType.ASSIGNMENT, dueTime),
                createDeadline(2L, "Assignment 2", 60, DeadlineType.ASSIGNMENT, dueTime),
                createDeadline(3L, "Assignment 3", 60, DeadlineType.ASSIGNMENT, dueTime),
                createDeadline(4L, "Exam", 60, DeadlineType.EXAM, dueTime)
        );

        when(deadlineRepository.findByStudentGroupId(1L)).thenReturn(deadlines);

        List<ConflictDto> conflicts = conflictDetectionService.detectConflicts(1L);

        assertThat(conflicts).hasSizeGreaterThanOrEqualTo(1);
        assertThat(conflicts.stream().anyMatch(c -> c.getType().equals("MAJOR_OVERFLOW"))).isTrue();
    }

    private Deadline createDeadline(Long id, String title, int effort, DeadlineType type, OffsetDateTime dueAt) {
        return Deadline.builder()
                .id(id)
                .courseId(1L)
                .studentGroupId(1L)
                .title(title)
                .estimatedEffort(effort)
                .type(type)
                .dueAt(dueAt)
                .createdAt(OffsetDateTime.now())
                .build();
    }
}

