package com.university.lms.assessment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for test case result.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCaseResult {

    private String name;
    private String input;
    private String expectedOutput;
    private String actualOutput;
    private Boolean passed;
    private String error;
    private Double points;
}
