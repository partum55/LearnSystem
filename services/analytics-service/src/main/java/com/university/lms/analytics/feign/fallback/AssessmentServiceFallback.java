package com.university.lms.analytics.feign.fallback;

import com.university.lms.analytics.dto.AssessmentDto;
import com.university.lms.analytics.feign.AssessmentServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class AssessmentServiceFallback implements AssessmentServiceClient {

    @Override
    public List<AssessmentDto> getAssessmentsByCourseId(String courseId) {
        log.error("Fallback: Unable to fetch assessments for course: {}", courseId);
        return Collections.emptyList();
    }
}

