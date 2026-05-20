package com.university.lms.course.assignments.dto;

import java.math.BigDecimal;

public record GradePreviewDto(
    BigDecimal points,
    BigDecimal maxPoints,
    String status,
    String comment
) {}
