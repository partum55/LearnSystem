package com.university.lms.submission.repository;

import com.university.lms.submission.domain.Submission;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for submissions.
 */
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    Optional<Submission> findByAssignmentIdAndUserId(UUID assignmentId, UUID userId);

    @EntityGraph(attributePaths = {"files", "comments"})
    Optional<Submission> findById(UUID id);

    @EntityGraph(attributePaths = {"files", "comments"})
    List<Submission> findByAssignmentIdOrderByCreatedAtAsc(UUID assignmentId);

    @EntityGraph(attributePaths = {"files", "comments"})
    List<Submission> findByAssignmentIdAndUserIdOrderByCreatedAtAsc(UUID assignmentId, UUID userId);
}
