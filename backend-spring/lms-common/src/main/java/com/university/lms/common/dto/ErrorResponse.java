package com.university.lms.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Standard error response for API errors.
 * RFC 7807 Problem Details compliant.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private String code;
    private String error;
    private String message;
    private LocalDateTime timestamp;
    private String path;
    private Integer status;
    private Object details;
    private Map<String, String> errors;

    public static ErrorResponse of(String code, String message, String path, Integer status) {
        return ErrorResponse.builder()
                .code(code)
                .message(message)
                .timestamp(LocalDateTime.now())
                .path(path)
                .status(status)
                .build();
    }
}

