package com.university.lms.ai.web;

import com.university.lms.ai.dto.ABTestResultsResponse;
import com.university.lms.ai.service.PromptABTestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * REST controller for A/B test management.
 */
@RestController
@RequestMapping("/v1/ai/ab-tests")
@RequiredArgsConstructor
@Slf4j
public class ABTestController {

    private final PromptABTestService abTestService;

    /**
     * Register a new A/B test experiment.
     */
    @PostMapping("/experiments")
    public ResponseEntity<Void> registerExperiment(@RequestBody RegisterExperimentRequest request) {
        abTestService.registerExperiment(
                request.experimentName(),
                request.variants(),
                request.weights()
        );
        return ResponseEntity.ok().build();
    }

    /**
     * Get results for an experiment.
     */
    @GetMapping("/experiments/{experimentName}/results")
    public ResponseEntity<ABTestResultsResponse> getResults(@PathVariable String experimentName) {
        ABTestResultsResponse results = abTestService.getResults(experimentName);
        return ResponseEntity.ok(results);
    }

    /**
     * Get all active experiments.
     */
    @GetMapping("/experiments/active")
    public ResponseEntity<Set<String>> getActiveExperiments() {
        return ResponseEntity.ok(abTestService.getActiveExperiments());
    }

    /**
     * Get all experiment names from history.
     */
    @GetMapping("/experiments")
    public ResponseEntity<List<String>> getAllExperiments() {
        return ResponseEntity.ok(abTestService.getAllExperimentNames());
    }

    /**
     * Stop an experiment.
     */
    @DeleteMapping("/experiments/{experimentName}")
    public ResponseEntity<Void> stopExperiment(@PathVariable String experimentName) {
        abTestService.stopExperiment(experimentName);
        return ResponseEntity.ok().build();
    }

    /**
     * Record user rating for an A/B test result.
     */
    @PostMapping("/results/{resultId}/rating")
    public ResponseEntity<Void> recordRating(
            @PathVariable String resultId,
            @RequestBody RatingRequest request) {
        abTestService.recordUserRating(resultId, request.rating());
        return ResponseEntity.ok().build();
    }

    public record RegisterExperimentRequest(
            String experimentName,
            Map<String, String> variants,
            Map<String, Integer> weights
    ) {}

    public record RatingRequest(int rating) {}
}

