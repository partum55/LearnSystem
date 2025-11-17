package com.university.lms.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.assessment.domain.Assignment;
import com.university.lms.assessment.dto.CodeExecutionRequest;
import com.university.lms.assessment.dto.CodeExecutionResult;
import com.university.lms.assessment.dto.TestCaseResult;
import com.university.lms.assessment.repository.AssignmentRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for executing code in Virtual Programming Lab.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VirtualLabService {

    private final AssignmentRepository assignmentRepository;
    private final ObjectMapper objectMapper;

    private static final long TIMEOUT_SECONDS = 10;
    private static final long MAX_OUTPUT_LENGTH = 10000;

    /**
     * Execute code submitted by student.
     */
    public CodeExecutionResult executeCode(CodeExecutionRequest request, UUID userId) {
        log.info("Executing code for assignment {} by user {}", request.getAssignmentId(), userId);

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        if (!"VIRTUAL_LAB".equals(assignment.getAssignmentType()) && !"CODE".equals(assignment.getAssignmentType())) {
            throw new IllegalArgumentException("Assignment is not a virtual lab or code assignment");
        }

        long startTime = System.currentTimeMillis();
        CodeExecutionResult result;

        try {
            // Execute the code
            result = runCode(request.getCode(), request.getLanguage(), request.getInput());
            
            // Run test cases if available
            if (assignment.getTestCases() != null && !assignment.getTestCases().isEmpty()) {
                List<TestCaseResult> testResults = runTestCases(
                        request.getCode(), 
                        request.getLanguage(), 
                        assignment.getTestCases()
                );
                result.setTestResults(testResults);
            }
            
        } catch (Exception e) {
            log.error("Error executing code", e);
            result = CodeExecutionResult.builder()
                    .success(false)
                    .error("Execution error: " + e.getMessage())
                    .exitCode(-1)
                    .build();
        }

        long executionTime = System.currentTimeMillis() - startTime;
        result.setExecutionTime(executionTime);

        return result;
    }

    /**
     * Run code and return result.
     */
    private CodeExecutionResult runCode(String code, String language, String input) throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("vpl-");
        try {
            String command;
            Path codeFile;

            switch (language.toLowerCase()) {
                case "python":
                case "python3":
                    codeFile = tempDir.resolve("main.py");
                    Files.writeString(codeFile, code);
                    command = "python3 " + codeFile.toString();
                    break;
                case "java":
                    codeFile = tempDir.resolve("Main.java");
                    Files.writeString(codeFile, code);
                    command = "javac " + codeFile + " && java -cp " + tempDir + " Main";
                    break;
                case "javascript":
                case "node":
                    codeFile = tempDir.resolve("main.js");
                    Files.writeString(codeFile, code);
                    command = "node " + codeFile.toString();
                    break;
                case "c":
                    codeFile = tempDir.resolve("main.c");
                    Files.writeString(codeFile, code);
                    command = "gcc " + codeFile + " -o " + tempDir.resolve("main") + " && " + tempDir.resolve("main");
                    break;
                case "cpp":
                case "c++":
                    codeFile = tempDir.resolve("main.cpp");
                    Files.writeString(codeFile, code);
                    command = "g++ " + codeFile + " -o " + tempDir.resolve("main") + " && " + tempDir.resolve("main");
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported language: " + language);
            }

            return executeCommand(command, input);

        } finally {
            // Clean up temp directory
            deleteDirectory(tempDir.toFile());
        }
    }

    /**
     * Execute system command with timeout.
     */
    private CodeExecutionResult executeCommand(String command, String input) throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder("sh", "-c", command);
        Process process = processBuilder.start();

        // Write input if provided
        if (input != null && !input.isEmpty()) {
            try (OutputStream os = process.getOutputStream();
                 OutputStreamWriter osw = new OutputStreamWriter(os)) {
                osw.write(input);
                osw.flush();
            }
        }

        // Read output
        StringBuilder output = new StringBuilder();
        StringBuilder error = new StringBuilder();

        Thread outputReader = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null && output.length() < MAX_OUTPUT_LENGTH) {
                    output.append(line).append("\n");
                }
            } catch (IOException e) {
                log.error("Error reading output", e);
            }
        });

        Thread errorReader = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null && error.length() < MAX_OUTPUT_LENGTH) {
                    error.append(line).append("\n");
                }
            } catch (IOException e) {
                log.error("Error reading error stream", e);
            }
        });

        outputReader.start();
        errorReader.start();

        boolean completed = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);

        if (!completed) {
            process.destroy();
            return CodeExecutionResult.builder()
                    .success(false)
                    .error("Execution timed out after " + TIMEOUT_SECONDS + " seconds")
                    .exitCode(-1)
                    .build();
        }

        outputReader.join(1000);
        errorReader.join(1000);

        int exitCode = process.exitValue();

        return CodeExecutionResult.builder()
                .output(output.toString())
                .error(error.toString())
                .exitCode(exitCode)
                .success(exitCode == 0)
                .build();
    }

    /**
     * Run test cases against the code.
     */
    private List<TestCaseResult> runTestCases(String code, String language, List<Map<String, Object>> testCases) {
        List<TestCaseResult> results = new ArrayList<>();

        for (Map<String, Object> testCase : testCases) {
            String name = (String) testCase.get("name");
            String input = (String) testCase.get("input");
            String expectedOutput = (String) testCase.get("expectedOutput");
            Double points = testCase.get("points") != null ? 
                    ((Number) testCase.get("points")).doubleValue() : 0.0;

            try {
                CodeExecutionResult execResult = runCode(code, language, input);
                String actualOutput = execResult.getOutput() != null ? execResult.getOutput().trim() : "";
                String expected = expectedOutput != null ? expectedOutput.trim() : "";

                boolean passed = actualOutput.equals(expected) && execResult.getSuccess();

                results.add(TestCaseResult.builder()
                        .name(name)
                        .input(input)
                        .expectedOutput(expected)
                        .actualOutput(actualOutput)
                        .passed(passed)
                        .error(execResult.getError())
                        .points(passed ? points : 0.0)
                        .build());

            } catch (Exception e) {
                log.error("Error running test case: " + name, e);
                results.add(TestCaseResult.builder()
                        .name(name)
                        .input(input)
                        .expectedOutput(expectedOutput)
                        .passed(false)
                        .error(e.getMessage())
                        .points(0.0)
                        .build());
            }
        }

        return results;
    }

    /**
     * Delete directory recursively.
     */
    private void deleteDirectory(File directory) {
        if (directory.exists()) {
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isDirectory()) {
                        deleteDirectory(file);
                    } else {
                        file.delete();
                    }
                }
            }
            directory.delete();
        }
    }
}
