package com.university.lms.plugin.api.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Read-only projection of a student submission exposed to plugins.
 *
 * @param id           Unique submission identifier.
 * @param assignmentId The assignment this submission answers.
 * @param userId       The student who made the submission.
 * @param textAnswer   Plain-text or HTML answer body; may be {@code null} for file-only submissions.
 * @param submittedAt  UTC timestamp when the submission was recorded.
 */
public record SubmissionInfo(
        UUID id,
        UUID assignmentId,
        UUID userId,
        String textAnswer,
        Instant submittedAt
) {}
