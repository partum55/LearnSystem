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
public class GradeSuggestionResponse {
    private double suggestedGrade;
    private int maxPoints;
    private String feedback;
    private List<String> strengths;
    private List<String> improvements;
}
