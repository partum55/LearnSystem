package com.university.lms.course.assessment.dto.execution;

/**
 * Single test result from execution service.
 */
public record TestResultItem(
    String name,
    boolean passed,
    boolean hidden,
    String errorMessage,
    int executionTimeMs,
    String actualOutput,
    String expectedOutput
) {}