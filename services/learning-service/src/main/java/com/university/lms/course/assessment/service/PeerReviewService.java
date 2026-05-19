package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.PeerReview;
import com.university.lms.course.assessment.dto.PeerReviewDto;
import com.university.lms.course.assessment.dto.SubmitPeerReviewRequest;
import com.university.lms.course.assessment.repository.PeerReviewRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for managing peer reviews with automatic reviewer assignment
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PeerReviewService {

    private final PeerReviewRepository peerReviewRepository;
    private final SubmissionRepository submissionRepository;

    /**
     * Automatically assign peer reviewers for submitted assignments
     * Uses a round-robin algorithm to ensure fair distribution
     */
    @Transactional
    public List<PeerReviewDto> assignPeerReviewers(
            UUID assignmentId, List<UUID> submissionIds, Integer reviewsPerSubmission) {
        if (submissionIds == null || submissionIds.isEmpty()) {
            throw new ValidationException("Submission IDs are required");
        }
        int reviewsRequired = reviewsPerSubmission == null ? 2 : reviewsPerSubmission;
        if (reviewsRequired < 1) {
            throw new ValidationException("Reviews per submission must be greater than zero");
        }

        List<Submission> submissions = submissionRepository.findByIdIn(submissionIds);
        if (submissions.size() != submissionIds.size()) {
            throw new ValidationException("All peer review submissions must exist");
        }
        if (submissions.stream().anyMatch(submission -> !assignmentId.equals(submission.getAssignmentId()))) {
            throw new ValidationException("All peer review submissions must belong to the assignment");
        }

        log.info("Auto-assigning peer reviewers for assignment {} with {} submissions",
                assignmentId, submissions.size());

        if (submissions.size() < 2) {
            log.warn("Not enough submissions for peer review assignment");
            return Collections.emptyList();
        }

        Map<UUID, Submission> submissionsByUserId = submissions.stream()
                .collect(Collectors.toMap(Submission::getUserId, Function.identity()));
        if (submissionsByUserId.size() != submissions.size()) {
            throw new ValidationException("Each peer review submission must belong to a distinct user");
        }

        List<PeerReview> peerReviews = new ArrayList<>();

        // Shuffle to randomize assignments
        List<UUID> shuffledUsers = new ArrayList<>(submissionsByUserId.keySet());
        Collections.shuffle(shuffledUsers);

        // For each submission, assign reviewers
        for (int i = 0; i < shuffledUsers.size(); i++) {
            UUID revieweeUserId = shuffledUsers.get(i);
            Submission revieweeSubmission = submissionsByUserId.get(revieweeUserId);

            // Assign N reviewers for this submission
            for (int j = 1; j <= reviewsRequired && j < shuffledUsers.size(); j++) {
                int reviewerIndex = (i + j) % shuffledUsers.size();
                UUID reviewerUserId = shuffledUsers.get(reviewerIndex);

                // Don't assign self-review
                if (!reviewerUserId.equals(revieweeUserId)) {
                    PeerReview peerReview = PeerReview.builder()
                            .assignmentId(assignmentId)
                            .reviewerUserId(reviewerUserId)
                            .revieweeUserId(revieweeUserId)
                            .submissionId(revieweeSubmission.getId())
                            .isAnonymous(true)
                            .status(PeerReview.PeerReviewStatus.PENDING)
                            .build();
                    peerReviews.add(peerReview);
                }
            }
        }

        peerReviews = peerReviewRepository.saveAll(peerReviews);
        log.info("Created {} peer review assignments", peerReviews.size());

        return peerReviews.stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all peer reviews for an assignment
     */
    public List<PeerReviewDto> getPeerReviewsByAssignment(UUID assignmentId) {
        return peerReviewRepository.findByAssignmentId(assignmentId).stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get peer reviews assigned to a specific reviewer
     */
    public List<PeerReviewDto> getPeerReviewsByReviewer(UUID reviewerUserId) {
        return peerReviewRepository.findByReviewerUserId(reviewerUserId).stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get peer reviews for a specific reviewee (student being reviewed)
     */
    public List<PeerReviewDto> getPeerReviewsByReviewee(UUID revieweeUserId) {
        return peerReviewRepository.findByRevieweeUserId(revieweeUserId).stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Submit a peer review
     */
    @Transactional
    public PeerReviewDto submitPeerReview(SubmitPeerReviewRequest request) {
        log.info("Submitting peer review {}", request.getPeerReviewId());

        PeerReview peerReview = peerReviewRepository.findById(request.getPeerReviewId())
                .orElseThrow(() -> new ResourceNotFoundException("PeerReview", "id", request.getPeerReviewId()));

        // Update peer review
        peerReview.setOverallScore(request.getOverallScore() != null ? BigDecimal.valueOf(request.getOverallScore()) : null);
        peerReview.setOverallFeedback(request.getOverallFeedback());
        peerReview.setStatus(PeerReview.PeerReviewStatus.COMPLETED);
        peerReview.setSubmittedAt(LocalDateTime.now());
        PeerReview savedPeerReview = peerReviewRepository.save(peerReview);

        log.info("Peer review {} submitted successfully", savedPeerReview.getId());
        return toPeerReviewDto(savedPeerReview);
    }

    /**
     * Calculate aggregate peer review score for a submission
     */
    public Double calculateAggregateScore(UUID submissionId) {
        List<PeerReview> reviews = peerReviewRepository.findBySubmissionId(submissionId);

        if (reviews.isEmpty()) {
            return null;
        }

        List<Double> scores = reviews.stream()
                .filter(r -> r.getOverallScore() != null)
                .map(r -> r.getOverallScore().doubleValue())
                .collect(Collectors.toList());

        if (scores.isEmpty()) {
            return null;
        }

        return scores.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private PeerReviewDto toPeerReviewDto(PeerReview peerReview) {
        PeerReviewDto dto = new PeerReviewDto();
        dto.setId(peerReview.getId());
        dto.setAssignmentId(peerReview.getAssignmentId());
        dto.setReviewerUserId(peerReview.getReviewerUserId());
        dto.setRevieweeUserId(peerReview.getRevieweeUserId());
        dto.setSubmissionId(peerReview.getSubmissionId());
        dto.setIsAnonymous(peerReview.getIsAnonymous());
        dto.setStatus(peerReview.getStatus().name());
        dto.setOverallScore(peerReview.getOverallScore() != null ? peerReview.getOverallScore().doubleValue() : null);
        dto.setOverallFeedback(peerReview.getOverallFeedback());
        dto.setSubmittedAt(peerReview.getSubmittedAt());
        dto.setCreatedAt(peerReview.getCreatedAt());
        dto.setRatings(Collections.emptyList());

        return dto;
    }
}
