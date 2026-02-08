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
 * Submission comment DTO with camelCase + snake_case compatibility fields.
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

    @JsonProperty("author_id")
    public UUID getAuthorIdSnake() {
        return authorId;
    }

    @JsonProperty("author_name")
    public String getAuthorNameSnake() {
        return authorName;
    }

    @JsonProperty("author_email")
    public String getAuthorEmailSnake() {
        return authorEmail;
    }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAtSnake() {
        return createdAt;
    }
}
