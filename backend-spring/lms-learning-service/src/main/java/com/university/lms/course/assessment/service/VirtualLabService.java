package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.dto.CodeExecutionRequest;
import com.university.lms.course.assessment.dto.CodeExecutionResult;
import com.university.lms.course.assessment.dto.TestCaseResult;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service for executing code in the virtual programming lab.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VirtualLabService {

    private static final long TIMEOUT_SECONDS = 10;
    private static final int MAX_OUTPUT_LENGTH = 10_000;

    private final AssignmentRepository assignmentRepository;

    /**
     * Execute code submitted by a student.
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

            if (assignment.getTestCases() != null && !assignment.getTestCases().isEmpty()) {
                result.setTestResults(runTestCases(request.getCode(), request.getLanguage(), assignment.getTestCases()));
            }
        } catch (IllegalArgumentException ex) {
            result = failedResult(ex.getMessage());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            result = failedResult("Execution interrupted");
        } catch (IOException ex) {
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

    private CodeExecutionResult executeProgram(String code, String language, String input)
            throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("vpl-");
        try {
            ExecutionPlan plan = buildExecutionPlan(tempDir, code, language);

            if (plan.compileCommand() != null) {
                CodeExecutionResult compileResult = executeProcess(plan.compileCommand(), null, tempDir);
                if (!compileResult.getSuccess()) {
                    String compileError = compileResult.getError();
                    if (compileError == null || compileError.isBlank()) {
                        compileError = compileResult.getOutput();
                    }
                    if (compileError == null || compileError.isBlank()) {
                        compileError = "Compilation failed";
                    }
                    return failedResult(compileError);
                }
            }

            return executeProcess(plan.runCommand(), input, tempDir);
        } finally {
            deleteDirectory(tempDir);
        }
    }

    private ExecutionPlan buildExecutionPlan(Path tempDir, String code, String language) throws IOException {
        String normalizedLanguage = normalizeLanguage(language);
        return switch (normalizedLanguage) {
            case "python" -> {
                Path sourceFile = tempDir.resolve("main.py");
                Files.writeString(sourceFile, code, StandardCharsets.UTF_8);
                yield new ExecutionPlan(null, List.of("python3", sourceFile.toString()));
            }
            case "java" -> {
                Path sourceFile = tempDir.resolve("Main.java");
                Files.writeString(sourceFile, code, StandardCharsets.UTF_8);
                yield new ExecutionPlan(
                        List.of("javac", sourceFile.toString()),
                        List.of("java", "-cp", tempDir.toString(), "Main"));
            }
            case "javascript" -> {
                Path sourceFile = tempDir.resolve("main.js");
                Files.writeString(sourceFile, code, StandardCharsets.UTF_8);
                yield new ExecutionPlan(null, List.of("node", sourceFile.toString()));
            }
            case "c" -> {
                Path sourceFile = tempDir.resolve("main.c");
                Path executable = tempDir.resolve("main");
                Files.writeString(sourceFile, code, StandardCharsets.UTF_8);
                yield new ExecutionPlan(
                        List.of("gcc", sourceFile.toString(), "-o", executable.toString()),
                        List.of(executable.toString()));
            }
            case "cpp" -> {
                Path sourceFile = tempDir.resolve("main.cpp");
                Path executable = tempDir.resolve("main");
                Files.writeString(sourceFile, code, StandardCharsets.UTF_8);
                yield new ExecutionPlan(
                        List.of("g++", sourceFile.toString(), "-o", executable.toString()),
                        List.of(executable.toString()));
            }
            default -> throw new IllegalArgumentException("Unsupported language: " + language);
        };
    }

    private String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            throw new IllegalArgumentException("Programming language is required");
        }
        return switch (language.trim().toLowerCase()) {
            case "python", "python3" -> "python";
            case "javascript", "node" -> "javascript";
            case "c++", "cpp" -> "cpp";
            case "java", "c" -> language.trim().toLowerCase();
            default -> language.trim().toLowerCase();
        };
    }

    private CodeExecutionResult executeProcess(List<String> command, String input, Path workingDirectory)
            throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.directory(workingDirectory.toFile());
        Process process = processBuilder.start();

        try (BufferedWriter writer =
                     new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8))) {
            if (input != null && !input.isBlank()) {
                writer.write(input);
            }
        }

        StringBuilder output = new StringBuilder();
        StringBuilder error = new StringBuilder();

        Thread stdoutReader = new Thread(() -> readStream(process.getInputStream(), output), "vpl-stdout-reader");
        Thread stderrReader = new Thread(() -> readStream(process.getErrorStream(), error), "vpl-stderr-reader");
        stdoutReader.start();
        stderrReader.start();

        boolean completed = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        if (!completed) {
            process.destroyForcibly();
            stdoutReader.join(1000);
            stderrReader.join(1000);
            return failedResult("Execution timed out after " + TIMEOUT_SECONDS + " seconds");
        }

        stdoutReader.join(1000);
        stderrReader.join(1000);

        int exitCode = process.exitValue();
        return CodeExecutionResult.builder()
                .output(output.isEmpty() ? null : output.toString())
                .error(error.isEmpty() ? null : error.toString())
                .exitCode(exitCode)
                .success(exitCode == 0)
                .build();
    }

    private void readStream(InputStream stream, StringBuilder output) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                appendWithLimit(output, line + System.lineSeparator());
                if (output.length() >= MAX_OUTPUT_LENGTH) {
                    break;
                }
            }
        } catch (IOException ex) {
            log.warn("Failed to read process stream", ex);
        }
    }

    private void appendWithLimit(StringBuilder buffer, String value) {
        int remaining = MAX_OUTPUT_LENGTH - buffer.length();
        if (remaining <= 0) {
            return;
        }
        if (value.length() <= remaining) {
            buffer.append(value);
        } else {
            buffer.append(value, 0, remaining);
        }
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

    private void deleteDirectory(Path directory) {
        if (directory == null || !Files.exists(directory)) {
            return;
        }

        try (var paths = Files.walk(directory)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ex) {
                    log.warn("Failed to delete temporary path {}", path, ex);
                }
            });
        } catch (IOException ex) {
            log.warn("Failed to cleanup temporary directory {}", directory, ex);
        }
    }

    private CodeExecutionResult failedResult(String errorMessage) {
        return CodeExecutionResult.builder()
                .success(false)
                .error(errorMessage)
                .exitCode(-1)
                .build();
    }

    private record ExecutionPlan(List<String> compileCommand, List<String> runCommand) {
    }
}
