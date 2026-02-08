package com.university.lms.course.assessment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for code execution result.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeExecutionResult {

    private String output;
    private String error;
    private Integer exitCode;
    private Long executionTime; // milliseconds
    private Boolean success;
    private List<TestCaseResult> testResults;
}
