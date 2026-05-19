package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.PeerReviewDto;
import com.university.lms.course.assessment.dto.SubmitPeerReviewRequest;
import com.university.lms.course.assessment.service.PeerReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for peer review operations
 */
@RestController
@RequestMapping("/peer-reviews")
@RequiredArgsConstructor
@Slf4j
public class PeerReviewController {

    private final PeerReviewService peerReviewService;

    /**
     * Automatically assign peer reviewers
     */
    @PostMapping("/assignments/{assignmentId}/assign")
    public ResponseEntity<List<PeerReviewDto>> assignReviewers(
            @PathVariable Long assignmentId,
            @RequestParam List<Long> submitterUserIds,
            @RequestParam(defaultValue = "2") Integer reviewsPerSubmission) {
        log.info("Auto-assigning reviewers for assignment {}", assignmentId);
        List<PeerReviewDto> reviews = peerReviewService.assignPeerReviewers(
                assignmentId, submitterUserIds, reviewsPerSubmission);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Get all peer reviews for an assignment
     */
    @GetMapping("/assignments/{assignmentId}")
    public ResponseEntity<List<PeerReviewDto>> getAssignmentReviews(@PathVariable Long assignmentId) {
        log.info("Getting peer reviews for assignment {}", assignmentId);
        List<PeerReviewDto> reviews = peerReviewService.getPeerReviewsByAssignment(assignmentId);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Get peer reviews assigned to a reviewer
     */
    @GetMapping("/reviewer/{reviewerUserId}")
    public ResponseEntity<List<PeerReviewDto>> getReviewerReviews(@PathVariable Long reviewerUserId) {
        log.info("Getting peer reviews for reviewer {}", reviewerUserId);
        List<PeerReviewDto> reviews = peerReviewService.getPeerReviewsByReviewer(reviewerUserId);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Get peer reviews for a reviewee
     */
    @GetMapping("/reviewee/{revieweeUserId}")
    public ResponseEntity<List<PeerReviewDto>> getRevieweeReviews(@PathVariable Long revieweeUserId) {
        log.info("Getting peer reviews for reviewee {}", revieweeUserId);
        List<PeerReviewDto> reviews = peerReviewService.getPeerReviewsByReviewee(revieweeUserId);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Submit a peer review
     */
    @PostMapping("/submit")
    public ResponseEntity<PeerReviewDto> submitReview(@Valid @RequestBody SubmitPeerReviewRequest request) {
        log.info("Submitting peer review {}", request.getPeerReviewId());
        PeerReviewDto review = peerReviewService.submitPeerReview(request);
        return ResponseEntity.ok(review);
    }

    /**
     * Calculate aggregate score for a submission
     */
    @GetMapping("/submissions/{submissionId}/aggregate-score")
    public ResponseEntity<Double> getAggregateScore(@PathVariable Long submissionId) {
        log.info("Calculating aggregate score for submission {}", submissionId);
        Double score = peerReviewService.calculateAggregateScore(submissionId);
        return ResponseEntity.ok(score);
    }
}
