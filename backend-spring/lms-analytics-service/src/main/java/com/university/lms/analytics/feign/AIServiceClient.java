package com.university.lms.analytics.feign;

import com.university.lms.analytics.dto.PredictionRequestDto;
import com.university.lms.analytics.dto.PredictionResponseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "lms-ai-service", path = "/api/ai")
public interface AIServiceClient {

    @PostMapping("/predict-grades")
    PredictionResponseDto getStudentPredictions(@RequestBody PredictionRequestDto request);
}

