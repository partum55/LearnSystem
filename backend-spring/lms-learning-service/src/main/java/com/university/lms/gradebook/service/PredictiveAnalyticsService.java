package com.university.lms.gradebook.service;

import com.university.lms.gradebook.dto.StudentEngagementDto;
import com.university.lms.gradebook.dto.StudentRiskPredictionDto;
import com.university.lms.gradebook.dto.StudentRiskPredictionDto.RiskFactor;
import com.university.lms.gradebook.dto.StudentRiskPredictionDto.Recommendation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for predictive analytics and at-risk student identification
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PredictiveAnalyticsService {

    /**
     * Predict at-risk students for a course
     */
    public List<StudentRiskPredictionDto> predictAtRiskStudents(Long courseId) {
        log.info("Predicting at-risk students for course {}", courseId);
        
        // In production, this would fetch actual student engagement data
        // and apply ML model for prediction
        List<StudentRiskPredictionDto> predictions = new ArrayList<>();
        
        // Mock at-risk student
        StudentRiskPredictionDto student1 = createMockPrediction(
                101L, "Alex Johnson", courseId, "CS101", 
                "Introduction to Computer Science",
                StudentRiskPredictionDto.RiskLevel.HIGH, 78.5);
        predictions.add(student1);
        
        StudentRiskPredictionDto student2 = createMockPrediction(
                102L, "Maria Garcia", courseId, "CS101",
                "Introduction to Computer Science",
                StudentRiskPredictionDto.RiskLevel.MEDIUM, 55.2);
        predictions.add(student2);
        
        return predictions;
    }

    /**
     * Get detailed risk prediction for a specific student in a course
     */
    public StudentRiskPredictionDto predictStudentRisk(Long studentId, Long courseId) {
        log.info("Predicting risk for student {} in course {}", studentId, courseId);
        
        // Fetch engagement data (mock for now)
        StudentEngagementDto engagement = getStudentEngagement(studentId, courseId);
        
        // Calculate risk score
        double riskScore = calculateRiskScore(engagement);
        
        // Determine risk level
        StudentRiskPredictionDto.RiskLevel riskLevel = determineRiskLevel(riskScore);
        
        // Identify risk factors
        List<RiskFactor> riskFactors = identifyRiskFactors(engagement);
        
        // Generate recommendations
        List<Recommendation> recommendations = generateRecommendations(riskFactors, riskLevel);
        
        StudentRiskPredictionDto prediction = new StudentRiskPredictionDto();
        prediction.setStudentId(studentId);
        prediction.setStudentName("Student " + studentId); // Would fetch from DB
        prediction.setCourseId(courseId);
        prediction.setCourseCode("CS101");
        prediction.setCourseTitle("Introduction to Computer Science");
        prediction.setRiskLevel(riskLevel);
        prediction.setRiskScore(riskScore);
        prediction.setRiskFactors(riskFactors);
        prediction.setRecommendations(recommendations);
        prediction.setLastUpdated(LocalDateTime.now());
        
        return prediction;
    }

    /**
     * Get student engagement metrics
     */
    private StudentEngagementDto getStudentEngagement(Long studentId, Long courseId) {
        // Mock data - in production, query from database
        StudentEngagementDto engagement = new StudentEngagementDto();
        engagement.setStudentId(studentId);
        engagement.setCourseId(courseId);
        engagement.setLoginCount(15);
        engagement.setLastLogin(LocalDateTime.now().minusDays(5));
        engagement.setDaysInactive(5);
        engagement.setAssignmentsCompleted(6);
        engagement.setAssignmentsTotal(10);
        engagement.setQuizzesCompleted(3);
        engagement.setQuizzesTotal(5);
        engagement.setAverageSubmissionTime(-2.5); // 2.5 hours after deadline
        engagement.setLateSubmissions(3);
        engagement.setForumParticipation(2.0);
        engagement.setResourceAccessCount(20.0);
        engagement.setCurrentGrade(62.5);
        engagement.setGradeChange(-8.5);
        return engagement;
    }

    /**
     * Calculate overall risk score using weighted factors
     */
    private double calculateRiskScore(StudentEngagementDto engagement) {
        double score = 0.0;
        
        // Engagement factors (30% weight)
        if (engagement.getDaysInactive() > 7) score += 15;
        else if (engagement.getDaysInactive() > 3) score += 8;
        
        if (engagement.getLoginCount() < 10) score += 10;
        else if (engagement.getLoginCount() < 20) score += 5;
        
        // Performance factors (40% weight)
        if (engagement.getCurrentGrade() < 60) score += 20;
        else if (engagement.getCurrentGrade() < 70) score += 10;
        
        if (engagement.getGradeChange() < -10) score += 15;
        else if (engagement.getGradeChange() < -5) score += 8;
        
        // Submission factors (30% weight)
        double completionRate = (double) engagement.getAssignmentsCompleted() / engagement.getAssignmentsTotal();
        if (completionRate < 0.5) score += 15;
        else if (completionRate < 0.7) score += 8;
        
        if (engagement.getLateSubmissions() > 3) score += 10;
        else if (engagement.getLateSubmissions() > 1) score += 5;
        
        return Math.min(100.0, score);
    }

    /**
     * Determine risk level based on score
     */
    private StudentRiskPredictionDto.RiskLevel determineRiskLevel(double riskScore) {
        if (riskScore >= 75) return StudentRiskPredictionDto.RiskLevel.CRITICAL;
        if (riskScore >= 50) return StudentRiskPredictionDto.RiskLevel.HIGH;
        if (riskScore >= 25) return StudentRiskPredictionDto.RiskLevel.MEDIUM;
        return StudentRiskPredictionDto.RiskLevel.LOW;
    }

    /**
     * Identify specific risk factors
     */
    private List<RiskFactor> identifyRiskFactors(StudentEngagementDto engagement) {
        List<RiskFactor> factors = new ArrayList<>();
        
        if (engagement.getDaysInactive() > 3) {
            RiskFactor factor = new RiskFactor();
            factor.setCategory("engagement");
            factor.setDescription("Student has been inactive for " + engagement.getDaysInactive() + " days");
            factor.setImpact(0.3);
            factors.add(factor);
        }
        
        if (engagement.getCurrentGrade() < 70) {
            RiskFactor factor = new RiskFactor();
            factor.setCategory("performance");
            factor.setDescription("Current grade (" + String.format("%.1f", engagement.getCurrentGrade()) + "%) is below passing threshold");
            factor.setImpact(0.4);
            factors.add(factor);
        }
        
        if (engagement.getGradeChange() < -5) {
            RiskFactor factor = new RiskFactor();
            factor.setCategory("performance");
            factor.setDescription("Grade has dropped by " + String.format("%.1f", Math.abs(engagement.getGradeChange())) + "% recently");
            factor.setImpact(0.35);
            factors.add(factor);
        }
        
        double completionRate = (double) engagement.getAssignmentsCompleted() / engagement.getAssignmentsTotal();
        if (completionRate < 0.7) {
            RiskFactor factor = new RiskFactor();
            factor.setCategory("submission");
            factor.setDescription("Low assignment completion rate (" + String.format("%.0f", completionRate * 100) + "%)");
            factor.setImpact(0.3);
            factors.add(factor);
        }
        
        if (engagement.getLateSubmissions() > 2) {
            RiskFactor factor = new RiskFactor();
            factor.setCategory("submission");
            factor.setDescription(engagement.getLateSubmissions() + " late submissions");
            factor.setImpact(0.25);
            factors.add(factor);
        }
        
        return factors;
    }

    /**
     * Generate actionable recommendations for instructors
     */
    private List<Recommendation> generateRecommendations(List<RiskFactor> riskFactors, 
                                                          StudentRiskPredictionDto.RiskLevel riskLevel) {
        List<Recommendation> recommendations = new ArrayList<>();
        
        if (riskLevel == StudentRiskPredictionDto.RiskLevel.CRITICAL || 
            riskLevel == StudentRiskPredictionDto.RiskLevel.HIGH) {
            
            Recommendation rec1 = new Recommendation();
            rec1.setType("intervention");
            rec1.setTitle("Schedule One-on-One Meeting");
            rec1.setDescription("Contact student immediately to discuss their progress and identify barriers to success");
            rec1.setPriority("high");
            recommendations.add(rec1);
        }
        
        for (RiskFactor factor : riskFactors) {
            if ("engagement".equals(factor.getCategory())) {
                Recommendation rec = new Recommendation();
                rec.setType("contact");
                rec.setTitle("Send Engagement Reminder");
                rec.setDescription("Send personalized email encouraging student to log in and participate");
                rec.setPriority("medium");
                recommendations.add(rec);
            }
            
            if ("performance".equals(factor.getCategory())) {
                Recommendation rec = new Recommendation();
                rec.setType("resource");
                rec.setTitle("Provide Tutoring Resources");
                rec.setDescription("Share tutoring center information and schedule extra office hours");
                rec.setPriority("high");
                recommendations.add(rec);
            }
            
            if ("submission".equals(factor.getCategory())) {
                Recommendation rec = new Recommendation();
                rec.setType("intervention");
                rec.setTitle("Create Catch-Up Plan");
                rec.setDescription("Develop personalized plan for completing missing assignments");
                rec.setPriority("medium");
                recommendations.add(rec);
            }
        }
        
        // General recommendations
        Recommendation rec = new Recommendation();
        rec.setType("resource");
        rec.setTitle("Monitor Progress Weekly");
        rec.setDescription("Set up weekly check-ins to track improvement");
        rec.setPriority("medium");
        recommendations.add(rec);
        
        return recommendations;
    }

    private StudentRiskPredictionDto createMockPrediction(Long studentId, String studentName, 
                                                           Long courseId, String courseCode,
                                                           String courseTitle,
                                                           StudentRiskPredictionDto.RiskLevel riskLevel,
                                                           double riskScore) {
        StudentRiskPredictionDto prediction = new StudentRiskPredictionDto();
        prediction.setStudentId(studentId);
        prediction.setStudentName(studentName);
        prediction.setCourseId(courseId);
        prediction.setCourseCode(courseCode);
        prediction.setCourseTitle(courseTitle);
        prediction.setRiskLevel(riskLevel);
        prediction.setRiskScore(riskScore);
        prediction.setLastUpdated(LocalDateTime.now());
        
        List<RiskFactor> factors = new ArrayList<>();
        RiskFactor factor1 = new RiskFactor();
        factor1.setCategory("engagement");
        factor1.setDescription("Inactive for 7 days");
        factor1.setImpact(0.3);
        factors.add(factor1);
        
        RiskFactor factor2 = new RiskFactor();
        factor2.setCategory("performance");
        factor2.setDescription("Grade below 70%");
        factor2.setImpact(0.4);
        factors.add(factor2);
        
        prediction.setRiskFactors(factors);
        
        List<Recommendation> recommendations = new ArrayList<>();
        Recommendation rec1 = new Recommendation();
        rec1.setType("intervention");
        rec1.setTitle("Schedule One-on-One Meeting");
        rec1.setDescription("Contact student to discuss progress");
        rec1.setPriority("high");
        recommendations.add(rec1);
        
        prediction.setRecommendations(recommendations);
        
        return prediction;
    }
}
