package com.university.lms.deadline.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

/**
 * Feign client for Course Service.
 */
@FeignClient(name = "course-service", url = "${services.course.base-url:http://localhost:8081}")
public interface CourseClient {

    @GetMapping("/api/courses/{courseId}")
    CourseDto getCourse(@PathVariable UUID courseId);

    @GetMapping("/api/courses/{courseId}/students")
    List<StudentDto> getCourseStudents(@PathVariable UUID courseId);

    record CourseDto(UUID id, String code, String title) {}
    record StudentDto(UUID id, String email, String name, Long groupId) {}
}

