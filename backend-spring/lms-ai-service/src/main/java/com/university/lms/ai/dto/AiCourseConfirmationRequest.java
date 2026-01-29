package com.university.lms.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiCourseConfirmationRequest {
    @NotNull
    @Valid
    private GeneratedCourseResponse payload;

    @NotNull
    private Boolean confirmed;

    private String confirmationNotes;
}
