package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.PeerReview;
import com.university.lms.course.assessment.domain.PeerReviewRating;
import com.university.lms.course.assessment.domain.PeerReviewRubric;
import com.university.lms.course.assessment.dto.PeerReviewDto;
import com.university.lms.course.assessment.dto.PeerReviewRatingDto;
import com.university.lms.course.assessment.dto.PeerReviewRubricDto;
import com.university.lms.course.assessment.dto.SubmitPeerReviewRequest;
import com.university.lms.course.assessment.repository.PeerReviewRepository;
import com.university.lms.course.assessment.repository.PeerReviewRatingRepository;
import com.university.lms.course.assessment.repository.PeerReviewRubricRepository;
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
import java.util.stream.Collectors;

/**
 * Service for managing peer reviews with automatic reviewer assignment
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PeerReviewService {

    private final PeerReviewRepository peerReviewRepository;
    private final PeerReviewRubricRepository rubricRepository;
    private final PeerReviewRatingRepository ratingRepository;

    /**
     * Create rubrics for an assignment
     */
    @Transactional
    public List<PeerReviewRubricDto> createRubrics(Long assignmentId, List<PeerReviewRubricDto> rubricDtos) {
        if (rubricDtos == null || rubricDtos.isEmpty()) {
            throw new ValidationException("At least one rubric is required");
        }

        log.info("Creating {} rubrics for assignment {}", rubricDtos.size(), assignmentId);

        // Delete existing rubrics
        rubricRepository.deleteByAssignmentId(assignmentId);

        List<PeerReviewRubric> rubrics = new ArrayList<>();
        for (int i = 0; i < rubricDtos.size(); i++) {
            PeerReviewRubricDto dto = rubricDtos.get(i);
            PeerReviewRubric rubric = PeerReviewRubric.builder()
                    .assignmentId(assignmentId)
                    .criterionName(dto.getCriterionName())
                    .criterionDescription(dto.getCriterionDescription())
                    .maxPoints(dto.getMaxPoints())
                    .position(i)
                    .build();
            rubrics.add(rubric);
        }

        rubrics = rubricRepository.saveAll(rubrics);
        return rubrics.stream()
                .map(this::toRubricDto)
                .collect(Collectors.toList());
    }

    /**
     * Automatically assign peer reviewers for submitted assignments
     * Uses a round-robin algorithm to ensure fair distribution
     */
    @Transactional
    public List<PeerReviewDto> assignPeerReviewers(
            Long assignmentId, List<Long> submitterUserIds, Integer reviewsPerSubmission) {
        if (submitterUserIds == null || submitterUserIds.isEmpty()) {
            throw new ValidationException("Submitter user IDs are required");
        }
        int reviewsRequired = reviewsPerSubmission == null ? 2 : reviewsPerSubmission;
        if (reviewsRequired < 1) {
            throw new ValidationException("Reviews per submission must be greater than zero");
        }

        log.info("Auto-assigning peer reviewers for assignment {} with {} submitters",
                assignmentId, submitterUserIds.size());

        if (submitterUserIds.size() < 2) {
            log.warn("Not enough submitters for peer review assignment");
            return Collections.emptyList();
        }

        List<PeerReview> peerReviews = new ArrayList<>();

        // Shuffle to randomize assignments
        List<Long> shuffledUsers = new ArrayList<>(submitterUserIds);
        Collections.shuffle(shuffledUsers);

        // For each submission, assign reviewers
        for (int i = 0; i < shuffledUsers.size(); i++) {
            Long revieweeUserId = shuffledUsers.get(i);

            // Assign N reviewers for this submission
            for (int j = 1; j <= reviewsRequired && j < shuffledUsers.size(); j++) {
                int reviewerIndex = (i + j) % shuffledUsers.size();
                Long reviewerUserId = shuffledUsers.get(reviewerIndex);

                // Don't assign self-review
                if (!reviewerUserId.equals(revieweeUserId)) {
                    PeerReview peerReview = PeerReview.builder()
                            .assignmentId(assignmentId)
                            .reviewerUserId(reviewerUserId)
                            .revieweeUserId(revieweeUserId)
                            .submissionId(0L) // Will be updated when submissions are created
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
    public List<PeerReviewDto> getPeerReviewsByAssignment(Long assignmentId) {
        return peerReviewRepository.findByAssignmentId(assignmentId).stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get peer reviews assigned to a specific reviewer
     */
    public List<PeerReviewDto> getPeerReviewsByReviewer(Long reviewerUserId) {
        return peerReviewRepository.findByReviewerUserId(reviewerUserId).stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get peer reviews for a specific reviewee (student being reviewed)
     */
    public List<PeerReviewDto> getPeerReviewsByReviewee(Long revieweeUserId) {
        return peerReviewRepository.findByRevieweeUserId(revieweeUserId).stream()
                .map(this::toPeerReviewDto)
                .collect(Collectors.toList());
    }

    /**
     * Submit a peer review with ratings
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

        // Delete existing ratings
        ratingRepository.deleteByPeerReviewId(savedPeerReview.getId());

        // Save new ratings
        if (request.getRatings() != null && !request.getRatings().isEmpty()) {
            final Long peerReviewId = savedPeerReview.getId();
            List<PeerReviewRating> ratings = request.getRatings().stream()
                    .map(rating -> PeerReviewRating.builder()
                            .peerReviewId(peerReviewId)
                            .rubricId(rating.getRubricId())
                            .score(rating.getScore() != null ? BigDecimal.valueOf(rating.getScore()) : null)
                            .feedback(rating.getFeedback())
                            .build())
                    .collect(Collectors.toList());
            ratingRepository.saveAll(ratings);
        }

        log.info("Peer review {} submitted successfully", savedPeerReview.getId());
        return toPeerReviewDto(savedPeerReview);
    }

    /**
     * Get rubrics for an assignment
     */
    public List<PeerReviewRubricDto> getRubricsByAssignment(Long assignmentId) {
        return rubricRepository.findByAssignmentIdOrderByPosition(assignmentId).stream()
                .map(this::toRubricDto)
                .collect(Collectors.toList());
    }

    /**
     * Calculate aggregate peer review score for a submission
     */
    public Double calculateAggregateScore(Long submissionId) {
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

        // Load ratings
        List<PeerReviewRating> ratings = ratingRepository.findByPeerReviewId(peerReview.getId());
        dto.setRatings(ratings.stream()
                .map(this::toRatingDto)
                .collect(Collectors.toList()));

        return dto;
    }

    private PeerReviewRubricDto toRubricDto(PeerReviewRubric rubric) {
        PeerReviewRubricDto dto = new PeerReviewRubricDto();
        dto.setId(rubric.getId());
        dto.setAssignmentId(rubric.getAssignmentId());
        dto.setCriterionName(rubric.getCriterionName());
        dto.setCriterionDescription(rubric.getCriterionDescription());
        dto.setMaxPoints(rubric.getMaxPoints());
        dto.setPosition(rubric.getPosition());
        return dto;
    }

    private PeerReviewRatingDto toRatingDto(PeerReviewRating rating) {
        PeerReviewRatingDto dto = new PeerReviewRatingDto();
        dto.setId(rating.getId());
        dto.setPeerReviewId(rating.getPeerReviewId());
        dto.setRubricId(rating.getRubricId());
        dto.setScore(rating.getScore() != null ? rating.getScore().doubleValue() : null);
        dto.setFeedback(rating.getFeedback());

        // Load rubric name
        rubricRepository.findById(rating.getRubricId())
                .ifPresent(rubric -> dto.setCriterionName(rubric.getCriterionName()));

        return dto;
    }
}
