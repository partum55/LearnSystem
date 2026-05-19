package com.university.lms.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentProgressDto {
    private String userId;
    private String name;
    private double progress;
    private double grade;
    private String lastActive;
    private boolean isStruggling;
}

