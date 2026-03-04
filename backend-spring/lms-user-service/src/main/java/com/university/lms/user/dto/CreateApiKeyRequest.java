package com.university.lms.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateApiKeyRequest {

    @NotBlank(message = "Provider is required")
    private String provider = "GROQ";

    @NotBlank(message = "API key is required")
    private String apiKey;
}
