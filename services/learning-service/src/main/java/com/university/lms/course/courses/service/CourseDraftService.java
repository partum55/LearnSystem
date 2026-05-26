package com.university.lms.course.courses.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.domain.CourseStatus;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.AssignmentStatus;
import com.university.lms.course.assessment.domain.AssignmentType;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.ModuleStatus;
import com.university.lms.course.dto.CourseDraftDto;
import com.university.lms.course.dto.CourseDraftDto.ModuleDraft;
import com.university.lms.course.dto.CourseDraftDto.LearningItemDraft;
import com.university.lms.course.dto.CourseDraftDto.AssignmentDraft;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.materials.entity.LearningItem;
import com.university.lms.course.materials.entity.LearningItemStatus;
import com.university.lms.course.materials.entity.LearningItemType;
import com.university.lms.course.materials.repository.LearningItemRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.service.CourseMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.university.lms.common.exception.ValidationException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CourseDraftService {

    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final ModuleRepository moduleRepository;
    private final LearningItemRepository learningItemRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseMapper courseMapper;
    private final ObjectMapper objectMapper;

    public CourseDraftService(
            CourseRepository courseRepository,
            CourseMemberRepository courseMemberRepository,
            ModuleRepository moduleRepository,
            LearningItemRepository learningItemRepository,
            AssignmentRepository assignmentRepository,
            CourseMapper courseMapper,
            ObjectMapper objectMapper) {
        this.courseRepository = courseRepository;
        this.courseMemberRepository = courseMemberRepository;
        this.moduleRepository = moduleRepository;
        this.learningItemRepository = learningItemRepository;
        this.assignmentRepository = assignmentRepository;
        this.courseMapper = courseMapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CourseDto createFromDraft(CourseDraftDto draft, UUID userId, String globalRole) {
        if (!"ADMIN".equalsIgnoreCase(globalRole) && !"TEACHER".equalsIgnoreCase(globalRole)) {
            throw new ValidationException("Only ADMIN or global TEACHER accounts can create courses");
        }

        if (draft.course() == null || draft.course().code() == null || draft.course().title() == null) {
            throw new ValidationException("Course draft must have a title and a code");
        }

        if (courseRepository.existsByCode(draft.course().code())) {
            throw new ValidationException("Course with code '" + draft.course().code() + "' already exists");
        }

        // 1. Create Course
        Course course = Course.builder()
                .titleUk(draft.course().title())
                .titleEn(draft.course().title())
                .code(draft.course().code())
                .descriptionUk(draft.course().description())
                .descriptionEn(draft.course().description())
                .syllabus(draft.course().syllabusJson() != null ? draft.course().syllabusJson().toString() : null)
                .status(CourseStatus.DRAFT) // Enforce DRAFT
                .ownerId(userId)
                .createdAt(LocalDateTime.now())
                .build();
        course = courseRepository.save(course);

        // 2. Add Owner
        courseMemberRepository.save(CourseMember.builder()
                .course(course)
                .userId(userId)
                .roleInCourse(CourseRole.OWNER)
                .status(CourseMemberStatus.ACTIVE)
                .addedBy(userId)
                .build());

        // 3. Create Modules
        if (draft.modules() != null) {
            for (int i = 0; i < draft.modules().size(); i++) {
                ModuleDraft moduleDraft = draft.modules().get(i);
                
                Module module = Module.builder()
                        .course(course)
                        .title(moduleDraft.title())
                        .description(moduleDraft.description())
                        .position(moduleDraft.orderIndex() != null ? moduleDraft.orderIndex() : i)
                        .status(ModuleStatus.DRAFT) // Enforce DRAFT
                        .createdAt(LocalDateTime.now())
                        .build();
                module = moduleRepository.save(module);

                // 4. Create Learning Items
                if (moduleDraft.learningItems() != null) {
                    for (int j = 0; j < moduleDraft.learningItems().size(); j++) {
                        LearningItemDraft itemDraft = moduleDraft.learningItems().get(j);
                        Map<String, Object> cJson = itemDraft.contentJson() != null ? objectMapper.convertValue(itemDraft.contentJson(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : new java.util.HashMap<>();
                        LearningItem item = LearningItem.builder()
                                .module(module)
                                .type(LearningItemType.RTE) // Default or map if needed
                                .title(itemDraft.title())
                                .contentJson(cJson)
                                .position(j)
                                .status(LearningItemStatus.HIDDEN)
                                .createdAt(LocalDateTime.now())
                                .build();
                        learningItemRepository.save(item);
                    }
                }

                // 5. Create Assignments
                if (moduleDraft.assignments() != null) {
                    for (int k = 0; k < moduleDraft.assignments().size(); k++) {
                        AssignmentDraft assignDraft = moduleDraft.assignments().get(k);
                        AssignmentType type = AssignmentType.valueOf(assignDraft.type().toUpperCase());
                        
                        Map<String, Object> iJson = assignDraft.instructionsJson() != null ? objectMapper.convertValue(assignDraft.instructionsJson(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : new java.util.HashMap<>();
                        Map<String, Object> sJson = assignDraft.settings() != null ? objectMapper.convertValue(assignDraft.settings(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : new java.util.HashMap<>();

                        Assignment assignment = Assignment.builder()
                                .courseId(course.getId())
                                .moduleId(module.getId())
                                .assignmentType(type)
                                .title(assignDraft.title())
                                .maxPoints(assignDraft.points() != null ? java.math.BigDecimal.valueOf(assignDraft.points()) : java.math.BigDecimal.TEN)
                                .instructionsJson(iJson)
                                .position(k)
                                .status(AssignmentStatus.DRAFT)
                                .createdBy(userId)
                                .createdAt(LocalDateTime.now())
                                .settings(sJson)
                                .build();
                        assignmentRepository.save(assignment);
                    }
                }
            }
        }

        return courseMapper.toDto(course);
    }
}
