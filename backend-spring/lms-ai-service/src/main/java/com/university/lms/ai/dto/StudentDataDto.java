package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentDataDto {
    private String studentId;
    private List<Double> grades;
    private double progress;
}

