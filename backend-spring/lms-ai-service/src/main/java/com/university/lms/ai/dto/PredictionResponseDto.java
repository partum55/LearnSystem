package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponseDto {
    private List<StudentPredictionDto> predictions;
}

