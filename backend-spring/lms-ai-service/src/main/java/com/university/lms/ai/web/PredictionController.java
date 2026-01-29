package com.university.lms.ai.web;

import com.university.lms.ai.dto.PredictionRequestDto;
import com.university.lms.ai.dto.PredictionResponseDto;
import com.university.lms.ai.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for AI predictions.
 * API Version: v1
 */
@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

    @PostMapping("/predict-grades")
    @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
    public ResponseEntity<PredictionResponseDto> getStudentPredictions(@RequestBody PredictionRequestDto request) {
        return ResponseEntity.ok(predictionService.getStudentPredictions(request));
    }
}
