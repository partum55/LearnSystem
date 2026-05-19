package com.university.lms.submission.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.submission.domain.Submission;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubmissionLateStatusServiceTest {

    @Mock
    private AssignmentRepository assignmentRepository;

    @InjectMocks
    private SubmissionLateStatusService lateStatusService;

    @Test
    void applyLateFlagsShouldMarkOneDayLateForAnyPastDueSubmission() {
        UUID assignmentId = UUID.randomUUID();
        Submission submission = Submission.builder()
                .assignmentId(assignmentId)
                .build();

        LocalDateTime dueDate = LocalDateTime.of(2026, 2, 7, 10, 0);
        LocalDateTime submittedAt = LocalDateTime.of(2026, 2, 7, 10, 5);

        when(assignmentRepository.findById(assignmentId))
                .thenReturn(Optional.of(Assignment.builder().id(assignmentId).dueDate(dueDate).build()));

        lateStatusService.applyLateFlags(submission, submittedAt);

        assertThat(submission.getIsLate()).isTrue();
        assertThat(submission.getDaysLate()).isEqualTo(1);
    }

    @Test
    void applyLateFlagsShouldResetFlagsWhenOnTime() {
        UUID assignmentId = UUID.randomUUID();
        Submission submission = Submission.builder()
                .assignmentId(assignmentId)
                .build();

        LocalDateTime dueDate = LocalDateTime.of(2026, 2, 8, 12, 0);
        LocalDateTime submittedAt = LocalDateTime.of(2026, 2, 8, 11, 45);

        when(assignmentRepository.findById(assignmentId))
                .thenReturn(Optional.of(Assignment.builder().id(assignmentId).dueDate(dueDate).build()));

        lateStatusService.applyLateFlags(submission, submittedAt);

        assertThat(submission.getIsLate()).isFalse();
        assertThat(submission.getDaysLate()).isEqualTo(0);
    }

    @Test
    void applyLateFlagsShouldResetFlagsWhenDueDateMissing() {
        UUID assignmentId = UUID.randomUUID();
        Submission submission = Submission.builder()
                .assignmentId(assignmentId)
                .build();

        when(assignmentRepository.findById(assignmentId))
                .thenReturn(Optional.of(Assignment.builder().id(assignmentId).dueDate(null).build()));

        lateStatusService.applyLateFlags(submission, LocalDateTime.now());

        assertThat(submission.getIsLate()).isFalse();
        assertThat(submission.getDaysLate()).isEqualTo(0);
    }
}
