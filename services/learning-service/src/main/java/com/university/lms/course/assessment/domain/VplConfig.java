package com.university.lms.course.assessment.domain;

/**
 * VPL configuration per assignment. Serialized as JSONB.
 */
public record VplConfig(
    String mode,              // "io" | "framework"
    String language,          // "python" | "java" | "javascript" | "cpp"
    int timeLimitSeconds,     // default 5
    int memoryLimitMb,        // default 128
    boolean pylintEnabled,    // Python only
    double pylintMinScore,    // default 7.0
    String scoringMode,       // "weighted" | "all_or_nothing"
    int maxSubmitAttempts,    // 0 = unlimited
    String starterCode        // shown to student
) {
    public VplConfig {
        if (mode == null) mode = "io";
        if (language == null) language = "python";
        if (timeLimitSeconds <= 0) timeLimitSeconds = 5;
        if (memoryLimitMb <= 0) memoryLimitMb = 128;
        if (pylintMinScore <= 0) pylintMinScore = 7.0;
        if (scoringMode == null) scoringMode = "weighted";
    }
}
