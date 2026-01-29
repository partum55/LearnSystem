package com.university.lms.ai.dto.persistence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAssignmentCreateRequest {
    private String courseId;
    private String moduleId;
    private String title;
    private String description;
    private String assignmentType;
    private String instructions;
    private Integer position;
    private boolean isPublished;
    private Integer maxPoints;
    private Integer timeLimit;
}
