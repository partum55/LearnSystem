package com.university.lms.analytics.feign.fallback;

import com.university.lms.analytics.feign.CourseServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class CourseServiceFallback implements CourseServiceClient {

    @Override
    public List<Long> getStudentIdsByCourseId(String courseId) {
        log.error("Fallback: Unable to fetch student IDs for course: {}", courseId);
        return Collections.emptyList();
    }
}

