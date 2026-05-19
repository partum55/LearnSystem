package com.university.lms.course.assessment.dto.execution;

/**
 * Response from execution service after test execution.
 */
public record ExecutionResponse(
    boolean success,
    String compileError,
    TestSuiteResult testResults,
    PylintResult pylint,
    int executionTimeMs
) {}