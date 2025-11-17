package com.university.lms.analytics.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "lms-course-service", path = "/api/courses")
public interface CourseServiceClient {

    @GetMapping("/{courseId}/students")
    List<Long> getStudentIdsByCourseId(@PathVariable("courseId") String courseId);
}

