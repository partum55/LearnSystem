package com.university.lms.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyllabusRequest {

    @NotBlank
    private String courseDescription;

    private int weekCount = 16;
    private String language = "en";
}
