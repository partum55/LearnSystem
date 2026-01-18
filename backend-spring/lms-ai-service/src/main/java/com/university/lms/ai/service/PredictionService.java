package com.university.lms.ai.service;

import com.university.lms.ai.dto.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PredictionService {

    public PredictionResponseDto getStudentPredictions(PredictionRequestDto request) {
        if (request == null || request.getStudents() == null || request.getStudents().isEmpty()) {
            return new PredictionResponseDto(new ArrayList<>());
        }

        // Simple linear regression-based prediction
        List<StudentPredictionDto> predictions = request.getStudents().stream()
                .map(student -> {
                    if (student.getGrades() == null || student.getGrades().isEmpty()) {
                        return new StudentPredictionDto(student.getStudentId(), 0.0, 0.0);
                    }

                    // Calculate average grade
                    double averageGrade = student.getGrades().stream()
                            .mapToDouble(d -> d)
                            .average()
                            .orElse(0);

                    // Simple prediction: weighted average with progress
                    // 70% weight on current average, 30% on progress
                    double predictedGrade = (averageGrade * 0.7) + (student.getProgress() * 0.3);

                    // Add small improvement factor if student is making progress
                    if (student.getProgress() > 50) {
                        predictedGrade += 5.0;
                    }

                    // Cap at 100
                    if (predictedGrade > 100) {
                        predictedGrade = 100;
                    }

                    // Calculate confidence based on number of grades and progress
                    double confidence = Math.min(0.95,
                        (student.getGrades().size() * 0.1) + (student.getProgress() / 200.0));

                    return new StudentPredictionDto(student.getStudentId(), predictedGrade, confidence);
                })
                .collect(Collectors.toList());

        return new PredictionResponseDto(predictions);
    }
}

