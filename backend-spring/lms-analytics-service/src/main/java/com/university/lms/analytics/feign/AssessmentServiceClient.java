package com.university.lms.analytics.feign;

import com.university.lms.analytics.dto.AssessmentDto;
import com.university.lms.analytics.feign.fallback.AssessmentServiceFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "lms-learning-service", contextId = "assessment-service-client", path = "/api/assignments", fallback = AssessmentServiceFallback.class)
public interface AssessmentServiceClient {

    @GetMapping("/course/{courseId}")
    List<AssessmentDto> getAssessmentsByCourseId(@PathVariable("courseId") String courseId);
}
