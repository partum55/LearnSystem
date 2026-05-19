package com.university.lms.submission.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for adding comment to submission.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddCommentRequest {

    @NotBlank
    private String comment;
}
