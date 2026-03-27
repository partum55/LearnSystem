package com.university.lms.course.assessment.dto.execution;

import java.util.List;

/**
 * Request to execution service for full test execution.
 */
public record ExecutionRequest(
    String language,
    String code,
    String mode,                     // "io" | "framework"
    List<IoTestCase> testCases,       // mode=io
    String testCode,                  // mode=framework
    int timeLimitSeconds,
    int memoryLimitMb,
    boolean pylintEnabled,
    double pylintMinScore
) {
    public ExecutionRequest {
        if (timeLimitSeconds <= 0) timeLimitSeconds = 5;
        if (memoryLimitMb <= 0) memoryLimitMb = 128;
        if (pylintMinScore <= 0) pylintMinScore = 7.0;
    }
}