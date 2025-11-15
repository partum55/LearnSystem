package com.university.lms.gradebook.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

/**
 * Feign client for Course Service.
 */
@FeignClient(name = "course-service", url = "${services.course.base-url}")
public interface CourseClient {

    @GetMapping("/api/courses/{courseId}/members")
    List<CourseMemberDto> getCourseMembers(@PathVariable("courseId") UUID courseId);

    /**
     * DTO for course member information.
     */
    record CourseMemberDto(
            UUID userId,
            String userEmail,
            String userName,
            String roleInCourse,
            String enrollmentStatus
    ) {}
}

