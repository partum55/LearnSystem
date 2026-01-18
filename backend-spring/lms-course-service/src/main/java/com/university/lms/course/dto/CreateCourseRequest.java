package com.university.lms.course.dto;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for creating a new course.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCourseRequest {
    
    @NotBlank(message = "Course code is required")
    @Size(max = 50, message = "Course code must not exceed 50 characters")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Course code must contain only uppercase letters, numbers, underscores, and hyphens")
    private String code;
    
    @NotBlank(message = "Ukrainian title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String titleUk;
    
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String titleEn;
    
    private String descriptionUk;
    private String descriptionEn;
    private String syllabus;
    
    private CourseVisibility visibility;
    private String thumbnailUrl;
    
    private LocalDate startDate;
    
    private LocalDate endDate;
    
    @Size(max = 20, message = "Academic year must not exceed 20 characters")
    private String academicYear;
    
    private UUID departmentId;
    
    @Min(value = 1, message = "Max students must be at least 1")
    @Max(value = 1000, message = "Max students must not exceed 1000")
    private Integer maxStudents;
    
    private CourseStatus status;
    private Boolean isPublished;
}

