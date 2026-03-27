package com.university.lms.course.assessment.dto.execution;

/**
 * Response from execution service for raw code execution (Run button).
 */
public record RawExecutionResponse(
    String stdout,
    String stderr,
    int exitCode,
    int timeMs,
    int memoryKb,
    String errorMessage
) {}