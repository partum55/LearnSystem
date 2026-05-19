package com.university.lms.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentPredictionDto {
    private String studentId;
    private double predictedGrade;
    private double confidence;
}

