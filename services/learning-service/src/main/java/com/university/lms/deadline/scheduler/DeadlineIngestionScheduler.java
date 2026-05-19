package com.university.lms.deadline.scheduler;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.course.domain.Course;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.deadline.deadline.service.DeadlineIngestionService;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled ingestion of deadlines from course/assessment services.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeadlineIngestionScheduler {

    @Getter(AccessLevel.PACKAGE)
    static final int COURSE_PAGE_SIZE = 100;

    private final DeadlineIngestionService ingestionService;
    private final CourseRepository courseRepository;

    @Scheduled(cron = "${deadline.ingestion.cron:0 */10 * * * *}")
    public void ingestDeadlines() {
        log.debug("Starting deadline ingestion cron");

        int pageNumber = 0;
        int processedCourses = 0;
        Page<Course> page;

        do {
            page = courseRepository.findActiveCourses(
                    CourseStatus.PUBLISHED,
                    PageRequest.of(pageNumber, COURSE_PAGE_SIZE));

            for (Course course : page.getContent()) {
                ingestionService.ingestFromCourse(course.getId());
                processedCourses++;
            }
            pageNumber++;
        } while (page.hasNext());

        log.info("Deadline ingestion cron completed for {} active courses", processedCourses);
    }
}
