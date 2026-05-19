package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Submission file DTO — all fields camelCase.
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
}
