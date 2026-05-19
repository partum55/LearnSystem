package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Submission comment DTO — all fields camelCase.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionCommentResponse {

    private UUID id;
    private UUID authorId;
    private String authorName;
    private String authorEmail;
    private String comment;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}
