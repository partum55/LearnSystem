package com.university.lms.course.courses.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
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
import java.util.Map;

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

        if (draft.course() == null || isBlank(draft.course().code()) || isBlank(draft.course().title())) {
            throw new ValidationException("Course draft must have a title and a code");
        }
        rejectLegacyFields(draft);
        String syllabus = optionalRichContentDocumentString(draft.course().syllabusJson(), "course.syllabusJson");

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
                .syllabus(syllabus)
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
                requireText(moduleDraft.title(), "modules[" + i + "].title");
                
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
                        requireText(itemDraft.title(), "modules[" + i + "].learningItems[" + j + "].title");
                        LearningItemType itemType = parseLearningItemType(itemDraft.type());
                        requireRichContentDocument(itemDraft.contentJson(), "modules[" + i + "].learningItems[" + j + "].contentJson", false);
                        Map<String, Object> cJson = itemDraft.contentJson() != null ? objectMapper.convertValue(itemDraft.contentJson(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : new java.util.HashMap<>();
                        LearningItem item = LearningItem.builder()
                                .module(module)
                                .type(itemType)
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
                        requireText(assignDraft.title(), "modules[" + i + "].assignments[" + k + "].title");
                        if (assignDraft.points() == null || assignDraft.points() < 0) {
                            throw new ValidationException("modules[" + i + "].assignments[" + k + "].points must be non-negative");
                        }
                        AssignmentType type = parseAssignmentType(assignDraft.type());
                        requireRichContentDocument(assignDraft.instructionsJson(), "modules[" + i + "].assignments[" + k + "].instructionsJson", false);
                        
                        Map<String, Object> iJson = assignDraft.instructionsJson() != null ? objectMapper.convertValue(assignDraft.instructionsJson(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : new java.util.HashMap<>();
                        Map<String, Object> sJson = assignDraft.settings() != null ? objectMapper.convertValue(assignDraft.settings(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}) : new java.util.HashMap<>();

                        Assignment assignment = Assignment.builder()
                                .courseId(course.getId())
                                .moduleId(module.getId())
                                .assignmentType(type)
                                .title(assignDraft.title())
                                .maxPoints(java.math.BigDecimal.valueOf(assignDraft.points()))
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

    private LearningItemType parseLearningItemType(String value) {
        if (value == null || value.isBlank()) {
            throw new ValidationException("Learning item type is required");
        }
        try {
            return LearningItemType.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Learning item type must be a canonical uppercase enum value: " + value);
        }
    }

    private AssignmentType parseAssignmentType(String value) {
        if (value == null || value.isBlank()) {
            throw new ValidationException("Assignment type is required");
        }
        try {
            return AssignmentType.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Assignment type must be a canonical uppercase enum value: " + value);
        }
    }

    private void requireText(String value, String path) {
        if (isBlank(value)) {
            throw new ValidationException(path + " is required");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void rejectLegacyFields(CourseDraftDto draft) {
        rejectLegacyFields(draft.course().resources(), "course.resources");
        rejectLegacyFields(draft.course().topics(), "course.topics");
        rejectLegacyFields(draft.course().lessonBlocks(), "course.lessonBlocks");
        rejectLegacyFields(draft.course().lesson_blocks(), "course.lesson_blocks");

        if (draft.modules() == null) {
            return;
        }
        for (int i = 0; i < draft.modules().size(); i++) {
            ModuleDraft module = draft.modules().get(i);
            rejectLegacyFields(module.resources(), "modules[" + i + "].resources");
            rejectLegacyFields(module.topics(), "modules[" + i + "].topics");
            rejectLegacyFields(module.lessonBlocks(), "modules[" + i + "].lessonBlocks");
            rejectLegacyFields(module.lesson_blocks(), "modules[" + i + "].lesson_blocks");

            if (module.learningItems() != null) {
                for (int j = 0; j < module.learningItems().size(); j++) {
                    LearningItemDraft item = module.learningItems().get(j);
                    rejectLegacyFields(item.resources(), "modules[" + i + "].learningItems[" + j + "].resources");
                    rejectLegacyFields(item.topics(), "modules[" + i + "].learningItems[" + j + "].topics");
                    rejectLegacyFields(item.lessonBlocks(), "modules[" + i + "].learningItems[" + j + "].lessonBlocks");
                    rejectLegacyFields(item.lesson_blocks(), "modules[" + i + "].learningItems[" + j + "].lesson_blocks");
                }
            }

            if (module.assignments() != null) {
                for (int k = 0; k < module.assignments().size(); k++) {
                    AssignmentDraft assignment = module.assignments().get(k);
                    rejectLegacyFields(assignment.resources(), "modules[" + i + "].assignments[" + k + "].resources");
                    rejectLegacyFields(assignment.topics(), "modules[" + i + "].assignments[" + k + "].topics");
                    rejectLegacyFields(assignment.lessonBlocks(), "modules[" + i + "].assignments[" + k + "].lessonBlocks");
                    rejectLegacyFields(assignment.lesson_blocks(), "modules[" + i + "].assignments[" + k + "].lesson_blocks");
                }
            }
        }
    }

    private void rejectLegacyFields(JsonNode value, String path) {
        if (value != null && !value.isNull()) {
            throw new ValidationException("Legacy draft field is not supported: " + path);
        }
    }

    private void requireRichContentDocument(JsonNode value, String path, boolean optional) {
        if (value == null || value.isNull()) {
            if (optional) {
                return;
            }
            throw new ValidationException(path + " is required");
        }
        if (!value.isObject()) {
            throw new ValidationException(path + " must be a RichContentDocument object");
        }
        if (!value.has("version") || value.get("version").asInt() != 1) {
            throw new ValidationException(path + " must have version 1");
        }
        if (!value.has("type") || !"RICH_CONTENT".equals(value.get("type").asText())) {
            throw new ValidationException(path + " must have type RICH_CONTENT");
        }
        if (!value.has("blocks") || !value.get("blocks").isArray()) {
            throw new ValidationException(path + " must contain a blocks array");
        }
        for (JsonNode block : value.get("blocks")) {
            if (!block.isObject() || !block.has("type") || !block.has("data")) {
                throw new ValidationException(path + " contains an invalid block");
            }
        }
    }

    private String optionalRichContentDocumentString(JsonNode value, String path) {
        if (value == null || value.isNull() || value.isEmpty()) {
            return null;
        }
        if (isRichContentDocument(value)) {
            return value.toString();
        }
        return null;
    }

    private boolean isRichContentDocument(JsonNode value) {
        return value != null
                && value.isObject()
                && value.has("version")
                && value.get("version").asInt() == 1
                && value.has("type")
                && "RICH_CONTENT".equals(value.get("type").asText())
                && value.has("blocks")
                && value.get("blocks").isArray();
    }
}
