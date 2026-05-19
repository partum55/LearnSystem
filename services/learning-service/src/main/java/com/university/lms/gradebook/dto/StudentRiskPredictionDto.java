package com.university.lms.gradebook.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * At-risk student prediction and recommendations
 */
@Data
public class StudentRiskPredictionDto {
    private Long studentId;
    private String studentName;
    private Long courseId;
    private String courseCode;
    private String courseTitle;
    private RiskLevel riskLevel;
    private Double riskScore; // 0-100, higher means more at risk
    private List<RiskFactor> riskFactors;
    private List<Recommendation> recommendations;
    private LocalDateTime lastUpdated;

    public enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    @Data
    public static class RiskFactor {
        private String category; // "engagement", "performance", "submission", "attendance"
        private String description;
        private Double impact; // 0-1, contribution to overall risk
    }

    @Data
    public static class Recommendation {
        private String type; // "intervention", "resource", "contact"
        private String title;
        private String description;
        private String priority; // "low", "medium", "high"
        private String actionUrl; // Optional link to take action
    }
}
