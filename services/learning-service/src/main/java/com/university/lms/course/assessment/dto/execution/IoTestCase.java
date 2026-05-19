package com.university.lms.course.assessment.dto.execution;

/**
 * Single IO test case for execution service.
 */
public record IoTestCase(
    String name,
    String input,
    String expectedOutput,
    boolean hidden,
    int weight,
    String checkMode   // EXACT | TRIM | CONTAINS | REGEX
) {
    public IoTestCase {
        if (checkMode == null) checkMode = "TRIM";
        if (weight <= 0) weight = 1;
    }
}