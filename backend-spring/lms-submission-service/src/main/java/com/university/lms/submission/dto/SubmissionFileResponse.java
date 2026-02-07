package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Submission file DTO with camelCase + snake_case compatibility fields.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionFileResponse {

    private UUID id;
    private String filename;
    private String fileUrl;
    private Long fileSize;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime uploadedAt;

    @JsonProperty("file_url")
    public String getFileUrlSnake() {
        return fileUrl;
    }

    @JsonProperty("file_size")
    public Long getFileSizeSnake() {
        return fileSize;
    }

    @JsonProperty("uploaded_at")
    public LocalDateTime getUploadedAtSnake() {
        return uploadedAt;
    }
}
