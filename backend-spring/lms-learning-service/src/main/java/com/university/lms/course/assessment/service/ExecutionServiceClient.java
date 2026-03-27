package com.university.lms.course.assessment.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.course.assessment.dto.execution.*;
import com.university.lms.course.assessment.exception.ExecutionServiceException;
import com.university.lms.course.assessment.exception.ExecutionServiceUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Client for the execution-service (Isolate sandbox).
 */
@Service
@Slf4j
public class ExecutionServiceClient {

    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ExecutionServiceClient(
            @Value("${execution-service.base-url}") String baseUrl,
            ObjectMapper objectMapper) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Execute code with test cases. Returns full test results.
     */
    public ExecutionResponse execute(ExecutionRequest request) {
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> body = buildExecuteBody(request);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri("/execute")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            long elapsed = System.currentTimeMillis() - start;
            log.debug("Execution completed: language={}, mode={}, time={}ms",
                    request.language(), request.mode(), elapsed);

            return parseExecutionResponse(response);

        } catch (WebClientRequestException e) {
            log.error("Execution service unavailable", e);
            throw new ExecutionServiceUnavailableException("Execution service is unavailable", e);
        } catch (WebClientResponseException e) {
            String error = e.getResponseBodyAsString();
            log.error("Execution service error: status={}, body={}", e.getStatusCode(), error);
            throw new ExecutionServiceException("Execution failed: " + error, e);
        } catch (Exception e) {
            log.error("Unexpected execution error", e);
            throw new ExecutionServiceException("Unexpected execution error: " + e.getMessage(), e);
        }
    }

    /**
     * Execute code without tests. Returns raw output.
     */
    public RawExecutionResponse executeRaw(
            String language,
            String code,
            String stdin,
            int timeLimitSec,
            int memoryLimitMb) {

        long start = System.currentTimeMillis();
        try {
            Map<String, Object> body = Map.of(
                    "language", language,
                    "code", code,
                    "stdin", stdin != null ? stdin : "",
                    "time_limit_seconds", Math.min(timeLimitSec, 10),
                    "memory_limit_mb", memoryLimitMb > 0 ? memoryLimitMb : 128
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri("/execute/raw")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            long elapsed = System.currentTimeMillis() - start;
            log.debug("Raw execution completed: language={}, time={}ms", language, elapsed);

            return parseRawResponse(response);

        } catch (WebClientRequestException e) {
            log.error("Execution service unavailable", e);
            throw new ExecutionServiceUnavailableException("Execution service is unavailable", e);
        } catch (WebClientResponseException e) {
            String error = e.getResponseBodyAsString();
            log.error("Execution service error: status={}, body={}", e.getStatusCode(), error);
            throw new ExecutionServiceException("Execution failed: " + error, e);
        } catch (Exception e) {
            log.error("Unexpected execution error", e);
            throw new ExecutionServiceException("Unexpected execution error: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> buildExecuteBody(ExecutionRequest request) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("language", request.language());
        body.put("code", request.code());
        body.put("mode", request.mode());
        body.put("time_limit_seconds", request.timeLimitSeconds());
        body.put("memory_limit_mb", request.memoryLimitMb());
        body.put("pylint_enabled", request.pylintEnabled());
        body.put("pylint_min_score", request.pylintMinScore());

        if ("io".equals(request.mode()) && request.testCases() != null) {
            body.put("test_cases", request.testCases());
        } else if ("framework".equals(request.mode()) && request.testCode() != null) {
            body.put("test_code", request.testCode());
        }

        return body;
    }

    private ExecutionResponse parseExecutionResponse(Map<String, Object> response) {
        @SuppressWarnings("unchecked")
        Map<String, Object> results = (Map<String, Object>) response.get("test_results");

        TestSuiteResult testResults = results != null ? parseTestSuiteResult(results) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> pylint = (Map<String, Object>) response.get("pylint");
        PylintResult pylintResult = pylint != null ? parsePylintResult(pylint) : null;

        return new ExecutionResponse(
                Boolean.TRUE.equals(response.get("success")),
                (String) response.get("compile_error"),
                testResults,
                pylintResult,
                ((Number) response.getOrDefault("execution_time_ms", 0)).intValue()
        );
    }

    private TestSuiteResult parseTestSuiteResult(Map<String, Object> results) {
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> items =
                (java.util.List<Map<String, Object>>) results.get("results");

        java.util.List<TestResultItem> parsedResults = items != null
                ? items.stream().map(this::parseTestResultItem).toList()
                : java.util.Collections.emptyList();

        return new TestSuiteResult(
                ((Number) results.getOrDefault("passed", 0)).intValue(),
                ((Number) results.getOrDefault("total", 0)).intValue(),
                ((Number) results.getOrDefault("score_percent", 0.0)).doubleValue(),
                parsedResults
        );
    }

    private TestResultItem parseTestResultItem(Map<String, Object> item) {
        return new TestResultItem(
                (String) item.get("name"),
                Boolean.TRUE.equals(item.get("passed")),
                Boolean.TRUE.equals(item.get("hidden")),
                (String) item.get("error_message"),
                ((Number) item.getOrDefault("execution_time_ms", 0)).intValue(),
                (String) item.get("actual_output"),
                (String) item.get("expected_output")
        );
    }

    private PylintResult parsePylintResult(Map<String, Object> pylint) {
        return new PylintResult(
                ((Number) pylint.getOrDefault("score", 0.0)).doubleValue(),
                Boolean.TRUE.equals(pylint.get("passed")),
                java.util.Collections.emptyList()  // messages not needed for now
        );
    }

    private RawExecutionResponse parseRawResponse(Map<String, Object> response) {
        return new RawExecutionResponse(
                (String) response.getOrDefault("stdout", ""),
                (String) response.getOrDefault("stderr", ""),
                ((Number) response.getOrDefault("exit_code", -1)).intValue(),
                ((Number) response.getOrDefault("time_ms", 0)).intValue(),
                ((Number) response.getOrDefault("memory_kb", 0)).intValue(),
                (String) response.get("error_message")
        );
    }
}