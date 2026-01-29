package com.university.lms.ai.dto.persistence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiQuestionCreateRequest {
    private String courseId;
    private String questionType;
    private String stem;
    private Map<String, Object> options;
    private Map<String, Object> correctAnswer;
    private String explanation;
    private Integer points;
}
