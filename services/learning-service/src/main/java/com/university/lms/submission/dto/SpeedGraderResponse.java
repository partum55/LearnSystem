package com.university.lms.submission.dto;

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
}
