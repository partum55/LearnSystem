package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.PeerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PeerReviewRepository extends JpaRepository<PeerReview, Long> {
    
    List<PeerReview> findByAssignmentId(Long assignmentId);
    
    List<PeerReview> findByReviewerUserId(Long reviewerUserId);
    
    List<PeerReview> findByRevieweeUserId(Long revieweeUserId);
    
    List<PeerReview> findBySubmissionId(Long submissionId);
    
    @Query("SELECT pr FROM PeerReview pr WHERE pr.assignmentId = :assignmentId AND pr.status = 'PENDING'")
    List<PeerReview> findPendingReviewsByAssignment(@Param("assignmentId") Long assignmentId);
    
    @Query("SELECT COUNT(pr) FROM PeerReview pr WHERE pr.reviewerUserId = :userId AND pr.assignmentId = :assignmentId")
    Long countByReviewerAndAssignment(@Param("userId") Long userId, @Param("assignmentId") Long assignmentId);
}
