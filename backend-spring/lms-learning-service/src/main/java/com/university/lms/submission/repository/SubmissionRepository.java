package com.university.lms.submission.repository;

import com.university.lms.submission.domain.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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

    @Query("""
            SELECT s FROM Submission s
            WHERE s.assignmentId = :assignmentId
              AND (:status IS NULL OR s.status = UPPER(:status))
              AND (
                :search IS NULL
                OR LOWER(COALESCE(s.studentName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(s.studentEmail, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<Submission> findReviewQueue(
            @Param("assignmentId") UUID assignmentId,
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);

    List<Submission> findByAssignmentIdInAndUserId(Collection<UUID> assignmentIds, UUID userId);

    List<Submission> findByAssignmentIdIn(Collection<UUID> assignmentIds);

    List<Submission> findByIdIn(Collection<UUID> ids);
}
