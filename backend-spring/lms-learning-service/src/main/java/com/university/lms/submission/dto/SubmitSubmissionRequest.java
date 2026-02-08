package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to mark a submission as submitted.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitSubmissionRequest {

    private String type;

    private String code;

    @JsonAlias({"text_answer", "textAnswer"})
    private String textAnswer;

    @JsonAlias({"url", "submission_url", "submissionUrl"})
    private String url;

    @JsonAlias({"language", "programming_language"})
    private String language;
}
