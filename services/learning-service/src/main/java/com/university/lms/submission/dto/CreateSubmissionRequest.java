package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request for creating (or obtaining) a submission draft.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSubmissionRequest {

    @NotNull
    @JsonAlias({"assignment_id"})
    private UUID assignmentId;

    private String status;

    private String content;
}
