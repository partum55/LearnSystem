package com.university.lms.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentDto {
    private String id;
    private String courseId;
    private String title;
    private LocalDateTime dueDate;
}
