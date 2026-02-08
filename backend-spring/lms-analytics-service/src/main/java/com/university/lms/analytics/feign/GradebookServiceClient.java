package com.university.lms.analytics.feign;

import com.university.lms.common.dto.GradeDto;
import com.university.lms.analytics.feign.fallback.GradebookServiceFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "lms-learning-service", path = "/api/gradebook", fallback = GradebookServiceFallback.class)
public interface GradebookServiceClient {

    @GetMapping("/grades")
    List<GradeDto> getGradesByCourseAndStudent(
            @RequestParam("courseId") String courseId,
            @RequestParam("studentId") UUID studentId);
}
