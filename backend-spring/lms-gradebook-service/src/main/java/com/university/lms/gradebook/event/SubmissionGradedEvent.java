package com.university.lms.gradebook.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Event published when a submission is graded.
 * Triggers gradebook entry update.
 */
@Getter
public class SubmissionGradedEvent extends ApplicationEvent {

    private final UUID submissionId;
    private final UUID assignmentId;
    private final UUID studentId;
    private final UUID courseId;
    private final BigDecimal grade;
    private final boolean isLate;

    public SubmissionGradedEvent(Object source, UUID submissionId, UUID assignmentId,
                                UUID studentId, UUID courseId, BigDecimal grade, boolean isLate) {
        super(source);
        this.submissionId = submissionId;
        this.assignmentId = assignmentId;
        this.studentId = studentId;
        this.courseId = courseId;
        this.grade = grade;
        this.isLate = isLate;
    }
}

