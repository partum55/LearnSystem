package com.university.lms.course.assessment.dto.execution;

import java.util.List;

/**
 * Test suite result from execution service.
 */
public record TestSuiteResult(
    int passed,
    int total,
    double scorePercent,
    List<TestResultItem> results
) {}