package com.university.lms.plugin.api;

/**
 * Well-known LMS domain events that plugins can subscribe to via {@link PluginEventBus}.
 *
 * <p>Each constant corresponds to a specific lifecycle transition in the LMS. The payload
 * delivered to subscribers is a {@code Map<String, Object>} whose keys depend on the event;
 * the SDK javadoc for each constant documents the expected keys.
 *
 * <ul>
 *   <li>{@link #COURSE_CREATED}          — payload: {@code courseId}, {@code instructorId}</li>
 *   <li>{@link #COURSE_UPDATED}          — payload: {@code courseId}, {@code changedFields}</li>
 *   <li>{@link #ASSIGNMENT_SUBMITTED}    — payload: {@code submissionId}, {@code assignmentId}, {@code userId}</li>
 *   <li>{@link #ASSIGNMENT_GRADED}       — payload: {@code submissionId}, {@code assignmentId}, {@code userId}, {@code score}</li>
 *   <li>{@link #USER_ENROLLED}           — payload: {@code courseId}, {@code userId}</li>
 *   <li>{@link #USER_COMPLETED_COURSE}   — payload: {@code courseId}, {@code userId}</li>
 *   <li>{@link #GRADE_UPDATED}           — payload: {@code courseId}, {@code userId}, {@code assignmentId}, {@code score}</li>
 *   <li>{@link #DEADLINE_APPROACHING}    — payload: {@code assignmentId}, {@code courseId}, {@code hoursRemaining}</li>
 * </ul>
 */
public enum LmsEvent {
    COURSE_CREATED,
    COURSE_UPDATED,
    ASSIGNMENT_SUBMITTED,
    ASSIGNMENT_GRADED,
    USER_ENROLLED,
    USER_COMPLETED_COURSE,
    GRADE_UPDATED,
    DEADLINE_APPROACHING
}
