package com.university.lms.submission.service;

import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.submission.domain.Submission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Resolves late submission indicators from assignment due date.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubmissionLateStatusService {

    private final AssignmentRepository assignmentRepository;

    public void applyLateFlags(Submission submission, LocalDateTime submittedAt) {
        try {
            LocalDateTime dueDate = assignmentRepository.findById(submission.getAssignmentId())
                    .map(assignment -> assignment.getDueDate())
                    .orElse(null);

            if (dueDate == null || submittedAt == null) {
                submission.setIsLate(false);
                submission.setDaysLate(0);
                return;
            }

            if (submittedAt.isAfter(dueDate)) {
                long minutesLate = Duration.between(dueDate, submittedAt).toMinutes();
                int daysLate = (int) Math.max(1, Math.ceil(minutesLate / 1440.0));
                submission.setIsLate(true);
                submission.setDaysLate(daysLate);
            } else {
                submission.setIsLate(false);
                submission.setDaysLate(0);
            }
        } catch (Exception ex) {
            log.debug("Unable to resolve assignment due date for late calculation: {}", ex.getMessage());
            submission.setIsLate(false);
            submission.setDaysLate(0);
        }
    }
}
