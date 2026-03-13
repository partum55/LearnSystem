package com.university.lms.plugin.api.service;

import com.university.lms.plugin.api.model.SubmissionInfo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read-only access to student submission data for plugin use.
 *
 * <p>Access to this service requires the {@code "submissions.read"} permission in the plugin
 * manifest. Submission content (student text answers) is included in the returned projections
 * only when this permission is present; otherwise the runtime redacts {@link SubmissionInfo#textAnswer()}.
 */
public interface SubmissionQueryService {

    /**
     * Returns all submissions made for a specific assignment, across all students.
     *
     * @param assignmentId the assignment UUID
     * @return list of submissions; empty if none have been made
     */
    List<SubmissionInfo> getByAssignment(UUID assignmentId);

    /**
     * Looks up a single submission by its unique identifier.
     *
     * @param submissionId the submission UUID
     * @return the submission projection, or {@link Optional#empty()} if not found
     */
    Optional<SubmissionInfo> getById(UUID submissionId);
}
