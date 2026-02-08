package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.PeerReviewRubric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PeerReviewRubricRepository extends JpaRepository<PeerReviewRubric, Long> {
    
    List<PeerReviewRubric> findByAssignmentIdOrderByPosition(Long assignmentId);
    
    void deleteByAssignmentId(Long assignmentId);
}
