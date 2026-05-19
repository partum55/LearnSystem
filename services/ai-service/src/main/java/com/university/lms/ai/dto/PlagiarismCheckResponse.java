package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlagiarismCheckResponse {
    private String riskLevel; // LOW, MEDIUM, HIGH
    private List<String> indicators;
    private String summary;
}
