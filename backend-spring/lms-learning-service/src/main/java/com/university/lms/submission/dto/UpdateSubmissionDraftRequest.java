package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for updating an existing draft submission.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSubmissionDraftRequest {

    private String content;

    @JsonAlias({"text_answer", "textAnswer"})
    private String textAnswer;

    @JsonAlias({"submission_url", "submissionUrl", "url"})
    private String submissionUrl;

    @JsonAlias({"programming_language", "programmingLanguage", "language"})
    private String programmingLanguage;
}
