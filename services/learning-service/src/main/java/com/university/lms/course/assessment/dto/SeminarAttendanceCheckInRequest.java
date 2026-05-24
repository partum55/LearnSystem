package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.NotBlank;

public record SeminarAttendanceCheckInRequest(
    @NotBlank(message = "Token cannot be blank")
    String token
) {}
