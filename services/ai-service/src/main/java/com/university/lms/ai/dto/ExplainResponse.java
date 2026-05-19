package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExplainResponse {
    private String explanation;
    private String language;
    private int tokensUsed;
}
