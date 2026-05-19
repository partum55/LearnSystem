package com.university.lms.analytics.feign.fallback;

import com.university.lms.common.dto.GradeDto;
import com.university.lms.analytics.feign.GradebookServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
public class GradebookServiceFallback implements GradebookServiceClient {

    @Override
    public List<GradeDto> getGradesByCourseAndStudent(String courseId, UUID studentId) {
        log.error("Fallback: Unable to fetch grades for course: {} and student: {}", courseId, studentId);
        return Collections.emptyList();
    }
}
