package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.PeerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PeerReviewRepository extends JpaRepository<PeerReview, UUID> {
    
    List<PeerReview> findByAssignmentId(UUID assignmentId);
    
    List<PeerReview> findByReviewerUserId(UUID reviewerUserId);
    
    List<PeerReview> findByRevieweeUserId(UUID revieweeUserId);
    
    List<PeerReview> findBySubmissionId(UUID submissionId);
    
    @Query("SELECT pr FROM PeerReview pr WHERE pr.assignmentId = :assignmentId AND pr.status = 'PENDING'")
    List<PeerReview> findPendingReviewsByAssignment(@Param("assignmentId") UUID assignmentId);
    
    @Query("SELECT COUNT(pr) FROM PeerReview pr WHERE pr.reviewerUserId = :userId AND pr.assignmentId = :assignmentId")
    Long countByReviewerAndAssignment(@Param("userId") UUID userId, @Param("assignmentId") UUID assignmentId);
}
