package com.university.lms.analytics.feign;

import com.university.lms.analytics.dto.AssessmentDto;
import com.university.lms.analytics.feign.fallback.AssessmentServiceFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "lms-assessment-service", path = "/api/assessments", fallback = AssessmentServiceFallback.class)
public interface AssessmentServiceClient {

    @GetMapping
    List<AssessmentDto> getAssessmentsByCourseId(@RequestParam("courseId") String courseId);
}

