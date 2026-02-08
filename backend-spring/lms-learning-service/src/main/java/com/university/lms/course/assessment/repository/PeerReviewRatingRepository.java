package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.PeerReviewRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PeerReviewRatingRepository extends JpaRepository<PeerReviewRating, Long> {
    
    List<PeerReviewRating> findByPeerReviewId(Long peerReviewId);
    
    void deleteByPeerReviewId(Long peerReviewId);
}
