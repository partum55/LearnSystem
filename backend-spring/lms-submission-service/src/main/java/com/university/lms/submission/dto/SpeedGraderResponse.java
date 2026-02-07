package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * SpeedGrader queue response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeedGraderResponse {

    private List<SubmissionResponse> ungraded;
    private List<SubmissionResponse> recentlyGraded;

    @JsonProperty("recently_graded")
    public List<SubmissionResponse> getRecentlyGradedSnake() {
        return recentlyGraded;
    }
}
