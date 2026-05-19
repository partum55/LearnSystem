package com.university.lms.deadline.deadline.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.entity.DeadlineType;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Imports deadlines from external course/assessment services.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeadlineIngestionService {

    private static final Map<DeadlineType, Integer> DEFAULT_EFFORT = new EnumMap<>(DeadlineType.class);

    static {
        DEFAULT_EFFORT.put(DeadlineType.QUIZ, 30);
        DEFAULT_EFFORT.put(DeadlineType.ASSIGNMENT, 120);
        DEFAULT_EFFORT.put(DeadlineType.EXAM, 240);
    }

    private final DeadlineRepository deadlineRepository;
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final AssignmentRepository assignmentRepository;

    @Transactional
    public Deadline ingest(Deadline payload) {
        if (payload.getEstimatedEffort() == null) {
            payload.setEstimatedEffort(DEFAULT_EFFORT.getOrDefault(payload.getType(), 60));
        }
        payload.setCreatedAt(OffsetDateTime.now());
        Deadline saved = deadlineRepository.save(payload);
        log.info("Ingested deadline {} for course {}", saved.getId(), saved.getCourseId());
        return saved;
    }

    @Transactional
    public void ingestFromCourse(UUID courseId) {
        log.info("Starting ingestion for course {}", courseId);
        try {
            courseRepository
                    .findById(courseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));

            var studentIds = courseMemberRepository.findStudentIdsByCourseId(courseId);
            var assignments = assignmentRepository.findByCourseId(courseId);

            for (var assignment : assignments) {
                if (!Boolean.TRUE.equals(assignment.getIsPublished())
                        || Boolean.TRUE.equals(assignment.getIsArchived())
                        || assignment.getDueDate() == null) {
                    continue;
                }

                DeadlineType type = mapAssignmentType(assignment.getAssignmentType());
                Integer effort = DEFAULT_EFFORT.getOrDefault(type, 60);

                // Create deadline per student group (simplified: using courseId as groupId)
                Long groupId = courseId.getMostSignificantBits();

                Deadline deadline = Deadline.builder()
                        .courseId(courseId.getMostSignificantBits())
                        .studentGroupId(groupId)
                        .title(assignment.getTitle())
                        .description(assignment.getDescription())
                        .dueAt(assignment.getDueDate().atOffset(ZoneOffset.UTC))
                        .estimatedEffort(effort)
                        .type(type)
                        .createdAt(OffsetDateTime.now())
                        .build();

                deadlineRepository.save(deadline);
            }
            log.info(
                    "Ingested {} assignments for course {} ({} students)",
                    assignments.size(),
                    courseId,
                    studentIds.size()
            );
        } catch (Exception e) {
            log.error("Failed to ingest course {}: {}", courseId, e.getMessage(), e);
        }
    }

    private DeadlineType mapAssignmentType(String type) {
        if (type == null || type.isBlank()) {
            return DeadlineType.ASSIGNMENT;
        }
        return switch (type.trim().toUpperCase(Locale.ROOT)) {
            case "QUIZ" -> DeadlineType.QUIZ;
            case "EXAM" -> DeadlineType.EXAM;
            default -> DeadlineType.ASSIGNMENT;
        };
    }
}
