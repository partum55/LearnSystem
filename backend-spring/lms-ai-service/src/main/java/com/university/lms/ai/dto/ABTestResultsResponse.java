package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for A/B test results.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ABTestResultsResponse {

    private String experimentName;
    private int totalSamples;
    private List<ABTestVariantStats> variants;
    private String winningVariant;
    private boolean statisticallySignificant;
}

