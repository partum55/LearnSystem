package com.university.lms.course.assessment.dto.execution;

import java.util.List;

/**
 * Pylint code quality result from execution service.
 */
public record PylintResult(
    double score,
    boolean passed,
    List<PylintMessage> messages
) {}

record PylintMessage(
    int line,
    int column,
    String type,      // "error" | "warning" | "convention"
    String message,
    String symbol     // e.g., "unused-import"
) {}