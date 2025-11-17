package com.university.lms.analytics.feign;

import com.university.lms.common.dto.GradeDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "lms-gradebook-service", path = "/api/gradebook")
public interface GradebookServiceClient {

    @GetMapping("/grades")
    List<GradeDto> getGradesByCourseAndStudent(@RequestParam("courseId") String courseId, @RequestParam("studentId") Long studentId);
}

