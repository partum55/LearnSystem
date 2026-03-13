package com.university.lms.plugin.api.service;

import java.util.Optional;
import java.util.UUID;

/**
 * Read/write access to gradebook entries on behalf of a plugin.
 *
 * <p>Reading grades requires the {@code "grades.read"} permission; writing (setting) grades
 * requires {@code "grades.write"}. Grades set by a plugin are attributed to the plugin id in
 * the audit log.
 *
 * <p>Score values must be in the range {@code [0.0, maxScore]} where {@code maxScore} is
 * defined by the assignment; the runtime does not enforce the upper bound at the SDK level but
 * the LMS UI will flag out-of-range scores.
 */
public interface GradeService {

    /**
     * Creates or overwrites the grade for a specific student on a specific assignment.
     *
     * @param courseId     the course that owns the assignment
     * @param userId       the student being graded
     * @param assignmentId the target assignment
     * @param score        numeric score (must be &ge; 0)
     * @param feedback     optional qualitative feedback; may be {@code null} or empty
     */
    void setGrade(UUID courseId, UUID userId, UUID assignmentId, double score, String feedback);

    /**
     * Returns the current grade for a student on an assignment, if one exists.
     *
     * @param courseId     the course that owns the assignment
     * @param userId       the student
     * @param assignmentId the assignment
     * @return the recorded score, or {@link Optional#empty()} if no grade has been set yet
     */
    Optional<Double> getGrade(UUID courseId, UUID userId, UUID assignmentId);
}
