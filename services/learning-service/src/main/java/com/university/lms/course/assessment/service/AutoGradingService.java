package com.university.lms.course.assessment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.VplConfig;
import com.university.lms.course.assessment.domain.VplTestCase;
import com.university.lms.course.assessment.dto.execution.ExecutionRequest;
import com.university.lms.course.assessment.dto.execution.ExecutionResponse;
import com.university.lms.course.assessment.dto.execution.IoTestCase;
import com.university.lms.course.assessment.dto.execution.TestSuiteResult;
import com.university.lms.course.assessment.exception.ExecutionServiceUnavailableException;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.VplTestCaseRepository;
import com.university.lms.gradebook.event.SubmissionGradedEvent;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Async service for auto-grading VPL submissions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AutoGradingService {

    private final ExecutionServiceClient executionClient;
    private final VplTestCaseRepository testCaseRepository;
    private final SubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Async
    @Transactional
    public void gradeSubmission(UUID submissionId, UUID assignmentId, String studentCode) {
        log.info("Auto-grading submission {} for assignment {}", submissionId, assignmentId);

        try {
            Assignment assignment = assignmentRepository.findById(assignmentId)
                    .orElseThrow(() -> new IllegalStateException("Assignment not found: " + assignmentId));

            Map<String, Object> configMap = assignment.getVplConfig();
            if (configMap == null || configMap.isEmpty()) {
                log.warn("No VPL config for assignment {}, skipping auto-grading", assignmentId);
                return;
            }

            VplConfig config = objectMapper.convertValue(configMap, VplConfig.class);
            List<VplTestCase> testCases = testCaseRepository.findByAssignmentIdOrderByPositionAsc(assignmentId);

            ExecutionRequest request = buildRequest(config, testCases, studentCode);
            ExecutionResponse response = executionClient.execute(request);

            BigDecimal maxPoints = assignment.getMaxPoints() != null
                    ? assignment.getMaxPoints()
                    : BigDecimal.valueOf(100);

            BigDecimal score = calculateScore(response, maxPoints, config.scoringMode());
            String feedback = buildFeedback(response);

            updateSubmission(submissionId, score, feedback, response);

            publishGradebookEvent(submissionId, assignmentId, score, assignment.getCourseId());

            log.info("Auto-grading complete: submission={} score={}/{}",
                    submissionId, score, maxPoints);

        } catch (ExecutionServiceUnavailableException e) {
            log.error("Execution service unavailable for submission {}", submissionId, e);
            // Leave in IN_REVIEW for manual grading
        } catch (Exception e) {
            log.error("Auto-grading failed for submission {}", submissionId, e);
            // Leave unchanged for manual grading
        }
    }

    private ExecutionRequest buildRequest(VplConfig config, List<VplTestCase> testCases, String studentCode) {
        if ("framework".equals(config.mode())) {
            // Framework mode: concatenate all test code
            String combinedTestCode = testCases.stream()
                    .map(tc -> tc.getTestCode() != null ? tc.getTestCode() : "")
                    .reduce("", (a, b) -> a + "\n" + b)
                    .trim();

            return new ExecutionRequest(
                    config.language(),
                    studentCode,
                    "framework",
                    null,
                    combinedTestCode,
                    config.timeLimitSeconds(),
                    config.memoryLimitMb(),
                    config.pylintEnabled(),
                    config.pylintMinScore()
            );
        }

        // IO mode: convert test cases
        List<IoTestCase> ioTestCases = testCases.stream()
                .map(tc -> new IoTestCase(
                        tc.getName(),
                        tc.getInput(),
                        tc.getExpectedOutput(),
                        Boolean.TRUE.equals(tc.getHidden()),
                        tc.getWeight() != null ? tc.getWeight() : 1,
                        tc.getCheckMode() != null ? tc.getCheckMode() : "TRIM"
                ))
                .toList();

        return new ExecutionRequest(
                config.language(),
                studentCode,
                "io",
                ioTestCases,
                null,
                config.timeLimitSeconds(),
                config.memoryLimitMb(),
                config.pylintEnabled(),
                config.pylintMinScore()
        );
    }

    private BigDecimal calculateScore(ExecutionResponse response, BigDecimal maxPoints, String scoringMode) {
        if (response.compileError() != null) {
            return BigDecimal.ZERO;
        }

        TestSuiteResult results = response.testResults();
        if (results == null || results.total() == 0) {
            return BigDecimal.ZERO;
        }

        double percent = results.scorePercent();

        if ("all_or_nothing".equals(scoringMode)) {
            percent = percent >= 100.0 ? 100.0 : 0.0;
        }

        return maxPoints
                .multiply(BigDecimal.valueOf(percent / 100.0))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String buildFeedback(ExecutionResponse response) {
        if (response.compileError() != null) {
            return "Compile error:\n" + response.compileError();
        }

        TestSuiteResult results = response.testResults();
        if (results == null) {
            return "No test results.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Tests passed: %d/%d (%.1f%%)\n",
                results.passed(), results.total(), results.scorePercent()));

        if (response.pylint() != null && response.pylint().passed()) {
            sb.append(String.format("Code quality (pylint): %.1f/10\n", response.pylint().score()));
        }

        results.results().stream()
                .filter(r -> !r.hidden() && !r.passed())
                .forEach(r -> sb.append(String.format("❌ %s: %s\n",
                        r.name(),
                        r.errorMessage() != null ? r.errorMessage() : "Wrong answer")));

        return sb.toString().trim();
    }

    private void updateSubmission(UUID submissionId, BigDecimal score, String feedback, ExecutionResponse response) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalStateException("Submission not found: " + submissionId));

        submission.setPublishedGrade(score);
        submission.setPublishedFeedback(feedback);
        submission.setGrade(score);
        submission.setFeedback(feedback);
        submission.setStatus("GRADED_PUBLISHED");
        submission.setPublishedAt(LocalDateTime.now());
        submission.setGradedAt(LocalDateTime.now());
        // graderId = null for system grading

        try {
            submission.setAutoGradeResult(objectMapper.convertValue(
                    response.testResults() != null ? response.testResults() : Map.of(),
                    Map.class
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Failed to serialize auto-grade result", e);
        }

        submissionRepository.save(submission);
    }

    private void publishGradebookEvent(UUID submissionId, UUID assignmentId, BigDecimal score, UUID courseId) {
        if (courseId == null) {
            log.warn("No courseId for submission {}, skipping gradebook event", submissionId);
            return;
        }

        Submission submission = submissionRepository.findById(submissionId).orElse(null);
        boolean isLate = submission != null && Boolean.TRUE.equals(submission.getIsLate());

        eventPublisher.publishEvent(new SubmissionGradedEvent(
                this,
                submissionId,
                assignmentId,
                submission != null ? submission.getUserId() : null,
                courseId,
                score,
                isLate
        ));

        log.info("Published SubmissionGradedEvent for submission {}", submissionId);
    }
}