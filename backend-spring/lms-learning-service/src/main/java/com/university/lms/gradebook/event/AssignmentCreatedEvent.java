package com.university.lms.gradebook.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Event published when a new assignment is created.
 * Triggers automatic gradebook entry creation for all students.
 */
@Getter
public class AssignmentCreatedEvent extends ApplicationEvent {

    private final UUID assignmentId;
    private final UUID courseId;
    private final boolean isPublished;

    public AssignmentCreatedEvent(Object source, UUID assignmentId, UUID courseId, boolean isPublished) {
        super(source);
        this.assignmentId = assignmentId;
        this.courseId = courseId;
        this.isPublished = isPublished;
    }
}

