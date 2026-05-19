package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.dto.CodeExecutionRequest;
import com.university.lms.course.assessment.dto.CodeExecutionResult;
import com.university.lms.course.assessment.dto.TestCaseResult;
import com.university.lms.course.assessment.dto.execution.RawExecutionResponse;
import com.university.lms.course.assessment.exception.ExecutionServiceUnavailableException;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service for executing code in the virtual programming lab.
 * Delegates execution to the external execution-service (Isolate sandbox).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VirtualLabService {

    private static final int DEFAULT_TIME_LIMIT = 10;
    private static final int DEFAULT_MEMORY_LIMIT = 128;

    private final AssignmentRepository assignmentRepository;
    private final ExecutionServiceClient executionClient;
    private final com.university.lms.course.assessment.repository.VplTestCaseRepository vplTestCaseRepository;

    /**
     * Execute code submitted by a student (for assignments with test cases).
     */
    public CodeExecutionResult executeCode(CodeExecutionRequest request, UUID userId) {
        log.info("Executing code for assignment {} by user {}", request.getAssignmentId(), userId);

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", request.getAssignmentId()));

        validateExecutableAssignmentType(assignment);

        long startTime = System.currentTimeMillis();
        CodeExecutionResult result;

        try {
            result = executeProgram(request.getCode(), request.getLanguage(), request.getInput());

            java.util.List<com.university.lms.course.assessment.domain.VplTestCase> vplTestCases =
                vplTestCaseRepository.findByAssignmentIdOrderByPositionAsc(assignment.getId());
            if (!vplTestCases.isEmpty()) {
                result.setTestResults(runTestCasesFromEntities(request.getCode(), request.getLanguage(), vplTestCases));
            }
        } catch (ExecutionServiceUnavailableException ex) {
            log.error("Execution service unavailable", ex);
            throw new RuntimeException("Execution service unavailable. Is it running?");
        } catch (IllegalArgumentException ex) {
            result = failedResult(ex.getMessage());
        } catch (Exception ex) {
            log.error("Code execution failed", ex);
            result = failedResult("Execution error: " + ex.getMessage());
        }

        result.setExecutionTime(System.currentTimeMillis() - startTime);
        return result;
    }

    /**
     * Run code without test cases (Run button in UI).
     */
    public CodeExecutionResult runCode(String language, String code, String stdin, int timeLimitSeconds, int memoryLimitMb) {
        log.info("Running code for language {}", language);

        long startTime = System.currentTimeMillis();
        CodeExecutionResult result;

        try {
            // Cap time limit at 10 seconds
            int cappedTimeLimit = Math.min(timeLimitSeconds > 0 ? timeLimitSeconds : DEFAULT_TIME_LIMIT, 10);
            int memLimit = memoryLimitMb > 0 ? memoryLimitMb : DEFAULT_MEMORY_LIMIT;

            RawExecutionResponse response = executionClient.executeRaw(
                    language,
                    code,
                    stdin != null ? stdin : "",
                    cappedTimeLimit,
                    memLimit
            );

            result = CodeExecutionResult.builder()
                    .output(response.stdout())
                    .error(response.errorMessage() != null ? response.errorMessage() : response.stderr())
                    .exitCode(response.exitCode())
                    .success(response.exitCode() == 0 && response.errorMessage() == null)
                    .build();

        } catch (ExecutionServiceUnavailableException ex) {
            throw new RuntimeException("Execution service unavailable. Is it running?");
        } catch (Exception ex) {
            log.error("Code execution failed", ex);
            result = failedResult("Execution error: " + ex.getMessage());
        }

        result.setExecutionTime(System.currentTimeMillis() - startTime);
        return result;
    }

    private void validateExecutableAssignmentType(Assignment assignment) {
        String assignmentType = assignment.getAssignmentType();
        if (!Objects.equals("VIRTUAL_LAB", assignmentType) && !Objects.equals("CODE", assignmentType)) {
            throw new IllegalArgumentException("Assignment is not a virtual lab or code assignment");
        }
    }

    private CodeExecutionResult executeProgram(String code, String language, String input) {
        RawExecutionResponse response = executionClient.executeRaw(
                language,
                code,
                input != null ? input : "",
                DEFAULT_TIME_LIMIT,
                DEFAULT_MEMORY_LIMIT
        );

        String error = response.errorMessage() != null
                ? response.errorMessage()
                : (response.stderr() != null && !response.stderr().isBlank() ? response.stderr() : null);

        return CodeExecutionResult.builder()
                .output(response.stdout())
                .error(error)
                .exitCode(response.exitCode())
                .success(response.exitCode() == 0 && response.errorMessage() == null)
                .build();
    }

    private List<TestCaseResult> runTestCases(String code, String language, List<Map<String, Object>> testCases) {
        List<TestCaseResult> results = new ArrayList<>();

        for (int index = 0; index < testCases.size(); index++) {
            Map<String, Object> testCase = testCases.get(index);
            String name = asString(testCase.get("name"), "Test case " + (index + 1));
            String input = asString(testCase.get("input"), "");
            String expectedOutput = asString(testCase.get("expectedOutput"), "");
            double points = asDouble(testCase.get("points"), 0.0);

            try {
                CodeExecutionResult executionResult = executeProgram(code, language, input);
                String actualOutput = asString(executionResult.getOutput(), "").trim();
                String expected = expectedOutput.trim();
                boolean passed = expected.equals(actualOutput) && Boolean.TRUE.equals(executionResult.getSuccess());

                results.add(TestCaseResult.builder()
                        .name(name)
                        .input(input)
                        .expectedOutput(expected)
                        .actualOutput(actualOutput)
                        .passed(passed)
                        .error(executionResult.getError())
                        .points(passed ? points : 0.0)
                        .build());
            } catch (ExecutionServiceUnavailableException ex) {
                throw new RuntimeException("Execution service unavailable. Is it running?");
            } catch (Exception ex) {
                log.error("Error running test case {}", name, ex);
                results.add(TestCaseResult.builder()
                        .name(name)
                        .input(input)
                        .expectedOutput(expectedOutput)
                        .passed(false)
                        .error(ex.getMessage())
                        .points(0.0)
                        .build());
            }
        }

        return results;
    }

    private List<TestCaseResult> runTestCasesFromEntities(String code, String language,
            List<com.university.lms.course.assessment.domain.VplTestCase> testCases) {
        List<TestCaseResult> results = new ArrayList<>();
        for (int index = 0; index < testCases.size(); index++) {
            com.university.lms.course.assessment.domain.VplTestCase tc = testCases.get(index);
            String name = tc.getName() != null ? tc.getName() : "Test case " + (index + 1);
            String input = tc.getInput() != null ? tc.getInput() : "";
            String expectedOutput = tc.getExpectedOutput() != null ? tc.getExpectedOutput() : "";
            double points = tc.getWeight() != null ? tc.getWeight() : 1.0;
            try {
                CodeExecutionResult executionResult = executeProgram(code, language, input);
                String actualOutput = asString(executionResult.getOutput(), "").trim();
                String expected = expectedOutput.trim();
                boolean passed = expected.equals(actualOutput) && Boolean.TRUE.equals(executionResult.getSuccess());
                results.add(TestCaseResult.builder()
                        .name(name)
                        .input(input)
                        .expectedOutput(expected)
                        .actualOutput(actualOutput)
                        .passed(passed)
                        .error(executionResult.getError())
                        .points(passed ? points : 0.0)
                        .build());
            } catch (ExecutionServiceUnavailableException ex) {
                throw new RuntimeException("Execution service unavailable. Is it running?");
            } catch (Exception ex) {
                log.error("Error running test case {}", name, ex);
                results.add(TestCaseResult.builder()
                        .name(name)
                        .input(input)
                        .expectedOutput(expectedOutput)
                        .passed(false)
                        .error(ex.getMessage())
                        .points(0.0)
                        .build());
            }
        }
        return results;
    }

    private String asString(Object value, String fallback) {
        return value == null ? fallback : value.toString();
    }

    private double asDouble(Object value, double fallback) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return fallback;
    }

    private CodeExecutionResult failedResult(String errorMessage) {
        return CodeExecutionResult.builder()
                .success(false)
                .error(errorMessage)
                .exitCode(-1)
                .build();
    }
}