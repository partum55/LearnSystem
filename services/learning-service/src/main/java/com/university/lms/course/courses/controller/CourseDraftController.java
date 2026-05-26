package com.university.lms.course.courses.controller;

import com.university.lms.course.courses.service.CourseDraftService;
import com.university.lms.course.dto.CourseDraftDto;
import com.university.lms.course.dto.CourseDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/courses")
public class CourseDraftController {

    private final CourseDraftService courseDraftService;

    public CourseDraftController(CourseDraftService courseDraftService) {
        this.courseDraftService = courseDraftService;
    }

    @PostMapping("/from-draft")
    public ResponseEntity<CourseDto> createFromDraft(
            @Valid @RequestBody CourseDraftDto draft,
            HttpServletRequest request
    ) {
        UUID userId = (UUID) request.getAttribute("userId");
        String role = (String) request.getAttribute("role");
        
        CourseDto course = courseDraftService.createFromDraft(draft, userId, role);
        return ResponseEntity.ok(course);
    }
}
