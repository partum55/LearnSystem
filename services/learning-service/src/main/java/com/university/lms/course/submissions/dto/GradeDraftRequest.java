package com.university.lms.course.submissions.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record GradeDraftRequest(
    @NotNull @DecimalMin("0.0") BigDecimal points,
    String comment
) {}
