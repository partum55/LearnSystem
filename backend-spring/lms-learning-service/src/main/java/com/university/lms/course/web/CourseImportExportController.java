package com.university.lms.course.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.assessment.dto.AssignmentDto;
import com.university.lms.course.assessment.dto.CreateAssignmentRequest;
import com.university.lms.course.assessment.dto.InlineQuizRequest;
import com.university.lms.course.assessment.dto.QuestionDto;
import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.service.AssignmentService;
import com.university.lms.course.assessment.service.QuestionService;
import com.university.lms.course.assessment.service.QuizService;
import com.university.lms.course.dto.*;
import com.university.lms.course.service.CourseService;
import com.university.lms.course.service.ModuleService;
import com.university.lms.course.service.ResourceService;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * REST Controller for bulk course import/export via JSON.
 * SUPERADMIN only — allows full course structure management.
 */
@RestController
@RequestMapping("/admin/course-management")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('SUPERADMIN')")
public class CourseImportExportController {

    private final CourseService courseService;
    private final ModuleService moduleService;
    private final ResourceService resourceService;
    private final AssignmentService assignmentService;
    private final QuizService quizService;
    private final QuestionService questionService;
    private final RequestUserContext requestUserContext;
    private final ObjectMapper objectMapper;

    // ==================== EXPORT ====================

    /**
     * Export a complete course to JSON (course + modules + resources + assignments + quizzes + questions).
     */
    @GetMapping("/export/{courseId}")
    public ResponseEntity<byte[]> exportCourse(@PathVariable UUID courseId) {
        try {
            UUID userId = requestUserContext.requireUserId();
            String userRole = requestUserContext.requireUserRole();

            // Get course
            CourseDto course = courseService.getCourseById(courseId, userId, userRole);

            // Get modules
            List<ModuleDto> modules = moduleService.getModulesByCourse(courseId, userId);

            // Get resources for each module
            List<ModuleExport> moduleExports = new ArrayList<>();
            for (ModuleDto module : modules) {
                List<ResourceDto> resources = resourceService.getResourcesByModule(module.getId(), userId);
                // Get assignments for module
                List<AssignmentDto> moduleAssignments = assignmentService.getAssignmentsByModule(module.getId());
                moduleExports.add(ModuleExport.builder()
                        .title(module.getTitle())
                        .description(module.getDescription())
                        .position(module.getPosition())
                        .isPublished(module.getIsPublished())
                        .contentMeta(module.getContentMeta())
                        .resources(resources.stream().map(r -> ResourceExport.builder()
                                .title(r.getTitle())
                                .description(r.getDescription())
                                .resourceType(r.getResourceType())
                                .externalUrl(r.getExternalUrl())
                                .textContent(r.getTextContent())
                                .position(r.getPosition())
                                .isDownloadable(r.getIsDownloadable())
                                .metadata(r.getMetadata())
                                .build()).collect(Collectors.toList()))
                        .assignments(moduleAssignments.stream().map(this::toAssignmentExport).collect(Collectors.toList()))
                        .build());
            }

            // Get all course assignments (including those without module)
            Pageable pageable = PageRequest.of(0, 1000);
            PageResponse<AssignmentDto> allAssignments = assignmentService.getAssignmentsByCourse(courseId, pageable);
            List<AssignmentExport> standaloneAssignments = allAssignments.getContent().stream()
                    .filter(a -> a.getModuleId() == null)
                    .map(this::toAssignmentExport)
                    .collect(Collectors.toList());

            // Get questions
            PageResponse<QuestionDto> questions = questionService.getQuestionsByCourse(courseId, PageRequest.of(0, 1000));
            List<QuestionExport> questionExports = questions.getContent().stream().map(q -> QuestionExport.builder()
                    .questionType(q.getQuestionType())
                    .stem(q.getStem())
                    .imageUrl(q.getImageUrl())
                    .options(q.getOptions())
                    .correctAnswer(q.getCorrectAnswer())
                    .explanation(q.getExplanation())
                    .points(q.getPoints())
                    .metadata(q.getMetadata())
                    .build()).collect(Collectors.toList());

            CourseExport export = CourseExport.builder()
                    .version("1.0")
                    .exportedAt(LocalDateTime.now().toString())
                    .course(CourseMetaExport.builder()
                            .code(course.getCode())
                            .titleUk(course.getTitleUk())
                            .titleEn(course.getTitleEn())
                            .descriptionUk(course.getDescriptionUk())
                            .descriptionEn(course.getDescriptionEn())
                            .syllabus(course.getSyllabus())
                            .visibility(course.getVisibility() != null ? course.getVisibility().name() : "PRIVATE")
                            .maxStudents(course.getMaxStudents())
                            .isPublished(course.getIsPublished())
                    .build())
                    .modules(moduleExports)
                    .standaloneAssignments(standaloneAssignments)
                    .questionBank(questionExports)
                    .build();

            ObjectMapper exportMapper = objectMapper.copy();
            exportMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
            byte[] json = exportMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(export);

            String filename = "course-" + course.getCode() + "-export.json";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json);

        } catch (Exception e) {
            log.error("Failed to export course {}", courseId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== IMPORT ====================

    /**
     * Import a complete course from JSON file.
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResult> importCourseFromFile(@RequestParam("file") MultipartFile file) {
        try {
            String json = new String(file.getBytes());
            return importCourseFromJson(json);
        } catch (Exception e) {
            log.error("Failed to read import file", e);
            return ResponseEntity.badRequest().body(ImportResult.builder()
                    .success(false)
                    .message("Failed to read file: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Import a complete course from JSON body.
     */
    @PostMapping(value = "/import/json", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportResult> importCourseFromJsonBody(@RequestBody Object body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            return importCourseFromJson(json);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ImportResult.builder()
                    .success(false).message("Invalid JSON body: " + e.getMessage()).build());
        }
    }

    private ResponseEntity<ImportResult> importCourseFromJson(String json) {
        UUID userId = requestUserContext.requireUserId();

        try {
            CourseExport courseExport = objectMapper.readValue(json, CourseExport.class);

            if (courseExport.getCourse() == null) {
                return ResponseEntity.badRequest().body(ImportResult.builder()
                        .success(false)
                        .message("Invalid JSON: missing 'course' section")
                        .build());
            }

            CourseMetaExport meta = courseExport.getCourse();
            List<String> logs = new ArrayList<>();
            Map<String, UUID> idMapping = new HashMap<>();

            // 1. Create course
            CreateCourseRequest courseReq = new CreateCourseRequest();
            courseReq.setCode(meta.getCode());
            courseReq.setTitleUk(meta.getTitleUk());
            courseReq.setTitleEn(meta.getTitleEn());
            courseReq.setDescriptionUk(meta.getDescriptionUk());
            courseReq.setDescriptionEn(meta.getDescriptionEn());
            courseReq.setSyllabus(meta.getSyllabus());
            if (meta.getVisibility() != null) {
                courseReq.setVisibility(com.university.lms.common.domain.CourseVisibility.valueOf(meta.getVisibility()));
            }
            courseReq.setMaxStudents(meta.getMaxStudents());
            courseReq.setIsPublished(meta.getIsPublished() != null ? meta.getIsPublished() : false);

            CourseDto createdCourse = courseService.createCourse(courseReq, userId);
            UUID courseId = createdCourse.getId();
            logs.add("Created course: " + meta.getCode() + " (ID: " + courseId + ")");

            // 2. Create modules + resources + assignments
            int modulesCreated = 0;
            int resourcesCreated = 0;
            int assignmentsCreated = 0;

            if (courseExport.getModules() != null) {
                for (ModuleExport moduleExp : courseExport.getModules()) {
                    CreateModuleRequest moduleReq = new CreateModuleRequest();
                    moduleReq.setTitle(moduleExp.getTitle());
                    moduleReq.setDescription(moduleExp.getDescription());
                    moduleReq.setPosition(moduleExp.getPosition());
                    moduleReq.setIsPublished(moduleExp.getIsPublished() != null ? moduleExp.getIsPublished() : false);
                    if (moduleExp.getContentMeta() != null) {
                        moduleReq.setContentMeta(moduleExp.getContentMeta());
                    }

                    ModuleDto createdModule = moduleService.createModule(courseId, moduleReq, userId);
                    UUID moduleId = createdModule.getId();
                    modulesCreated++;
                    logs.add("  Created module: " + moduleExp.getTitle());

                    // Create resources
                    if (moduleExp.getResources() != null) {
                        for (ResourceExport resExp : moduleExp.getResources()) {
                            CreateResourceRequest resReq = new CreateResourceRequest();
                            resReq.setTitle(resExp.getTitle());
                            resReq.setDescription(resExp.getDescription());
                            resReq.setResourceType(resExp.getResourceType());
                            resReq.setExternalUrl(resExp.getExternalUrl());
                            resReq.setTextContent(resExp.getTextContent());
                            resReq.setPosition(resExp.getPosition());
                            resReq.setIsDownloadable(resExp.getIsDownloadable());

                            resourceService.createResource(moduleId, resReq, userId);
                            resourcesCreated++;
                        }
                        logs.add("    Created " + moduleExp.getResources().size() + " resources");
                    }

                    // Create assignments in module
                    if (moduleExp.getAssignments() != null) {
                        for (AssignmentExport assnExp : moduleExp.getAssignments()) {
                            createAssignmentFromExport(assnExp, courseId, moduleId, userId);
                            assignmentsCreated++;
                        }
                        logs.add("    Created " + moduleExp.getAssignments().size() + " assignments");
                    }
                }
            }

            // 3. Create standalone assignments
            if (courseExport.getStandaloneAssignments() != null) {
                for (AssignmentExport assnExp : courseExport.getStandaloneAssignments()) {
                    createAssignmentFromExport(assnExp, courseId, null, userId);
                    assignmentsCreated++;
                }
                logs.add("Created " + courseExport.getStandaloneAssignments().size() + " standalone assignments");
            }

            // 4. Create quizzes
            int quizzesCreated = 0;
            if (courseExport.getQuizzes() != null && !courseExport.getQuizzes().isEmpty()) {
                logs.add("Skipped legacy top-level quizzes section; quizzes are imported via QUIZ assignments");
            }

            // 5. Create question bank
            int questionsCreated = 0;
            if (courseExport.getQuestionBank() != null) {
                for (QuestionExport qExp : courseExport.getQuestionBank()) {
                    QuestionDto questionDto = new QuestionDto();
                    questionDto.setCourseId(courseId);
                    questionDto.setQuestionType(qExp.getQuestionType());
                    questionDto.setStem(qExp.getStem());
                    questionDto.setImageUrl(qExp.getImageUrl());
                    if (qExp.getOptions() instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> opts = (Map<String, Object>) qExp.getOptions();
                        questionDto.setOptions(opts);
                    }
                    if (qExp.getCorrectAnswer() instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> ca = (Map<String, Object>) qExp.getCorrectAnswer();
                        questionDto.setCorrectAnswer(ca);
                    }
                    questionDto.setExplanation(qExp.getExplanation());
                    questionDto.setPoints(qExp.getPoints());
                    questionDto.setMetadata(qExp.getMetadata());
                    questionService.createQuestion(questionDto, userId);
                    questionsCreated++;
                }
                logs.add("Created " + questionsCreated + " questions in question bank");
            }

            // Publish if requested
            if (Boolean.TRUE.equals(meta.getIsPublished())) {
                try {
                    courseService.publishCourse(courseId, userId, "SUPERADMIN");
                    logs.add("Published course");
                } catch (Exception e) {
                    logs.add("Warning: Could not publish course: " + e.getMessage());
                }
            }

            ImportResult result = ImportResult.builder()
                    .success(true)
                    .message(String.format("Successfully imported course '%s'", meta.getCode()))
                    .courseId(courseId.toString())
                    .coursesCreated(1)
                    .modulesCreated(modulesCreated)
                    .resourcesCreated(resourcesCreated)
                    .assignmentsCreated(assignmentsCreated)
                    .quizzesCreated(quizzesCreated)
                    .questionsCreated(questionsCreated)
                    .logs(logs)
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (Exception e) {
            log.error("Failed to import course from JSON", e);
            return ResponseEntity.badRequest().body(ImportResult.builder()
                    .success(false)
                    .message("Import failed: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Validate JSON without importing.
     */
    @PostMapping(value = "/validate", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ValidationResult> validateImport(@RequestBody Object body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            CourseExport courseExport = objectMapper.readValue(json, CourseExport.class);
            List<String> warnings = new ArrayList<>();
            List<String> errors = new ArrayList<>();

            if (courseExport.getCourse() == null) {
                errors.add("Missing 'course' section");
            } else {
                CourseMetaExport meta = courseExport.getCourse();
                if (meta.getCode() == null || meta.getCode().isBlank()) errors.add("Course code is required");
                if (meta.getTitleUk() == null || meta.getTitleUk().isBlank()) errors.add("Course titleUk is required");
            }

            int totalModules = courseExport.getModules() != null ? courseExport.getModules().size() : 0;
            int totalResources = 0;
            int totalAssignments = courseExport.getStandaloneAssignments() != null ? courseExport.getStandaloneAssignments().size() : 0;

            if (courseExport.getModules() != null) {
                for (int i = 0; i < courseExport.getModules().size(); i++) {
                    ModuleExport m = courseExport.getModules().get(i);
                    if (m.getTitle() == null || m.getTitle().isBlank()) {
                        errors.add("Module " + (i + 1) + " is missing title");
                    }
                    if (m.getResources() != null) totalResources += m.getResources().size();
                    if (m.getAssignments() != null) totalAssignments += m.getAssignments().size();
                }
            }

            int totalQuizzes = courseExport.getQuizzes() != null ? courseExport.getQuizzes().size() : 0;
            int totalQuestions = courseExport.getQuestionBank() != null ? courseExport.getQuestionBank().size() : 0;

            if (totalModules == 0) warnings.add("No modules defined");
            if (totalAssignments == 0) warnings.add("No assignments defined");

            ValidationResult result = ValidationResult.builder()
                    .valid(errors.isEmpty())
                    .errors(errors)
                    .warnings(warnings)
                    .summary(Map.of(
                            "modules", totalModules,
                            "resources", totalResources,
                            "assignments", totalAssignments,
                            "quizzes", totalQuizzes,
                            "questions", totalQuestions
                    ))
                    .build();

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ValidationResult.builder()
                    .valid(false)
                    .errors(List.of("Invalid JSON: " + e.getMessage()))
                    .warnings(List.of())
                    .summary(Map.of())
                    .build());
        }
    }

    /**
     * Get JSON schema/template for course import.
     */
    @GetMapping("/template")
    public ResponseEntity<CourseExport> getImportTemplate() {
        CourseExport template = CourseExport.builder()
                .version("1.0")
                .course(CourseMetaExport.builder()
                        .code("CS101")
                        .titleUk("Вступ до Computer Science")
                        .titleEn("Introduction to Computer Science")
                        .descriptionUk("Базовий курс з CS")
                        .descriptionEn("Foundational CS course")
                        .visibility("PUBLIC")
                        .maxStudents(100)
                        .isPublished(false)
                        .build())
                .modules(List.of(
                        ModuleExport.builder()
                                .title("Module 1: Basics")
                                .description("Fundamentals of programming")
                                .position(1)
                                .isPublished(true)
                                .resources(List.of(
                                        ResourceExport.builder()
                                                .title("Getting Started Guide")
                                                .resourceType("TEXT")
                                                .textContent("Welcome to the course!")
                                                .position(1)
                                                .isDownloadable(false)
                                                .build(),
                                        ResourceExport.builder()
                                                .title("Lecture Video")
                                                .resourceType("VIDEO")
                                                .externalUrl("https://youtube.com/watch?v=...")
                                                .position(2)
                                                .build()
                                ))
                                .assignments(List.of(
                                        AssignmentExport.builder()
                                                .assignmentType("CODE")
                                                .title("Hello World Program")
                                                .description("Write your first program")
                                                .maxPoints(new BigDecimal("100"))
                                                .programmingLanguage("python")
                                                .starterCode("# Write your code here\n")
                                                .isPublished(true)
                                                .build()
                                ))
                                .build()
                ))
                .questionBank(List.of(
                        QuestionExport.builder()
                                .questionType("MULTIPLE_CHOICE")
                                .stem("What does CPU stand for?")
                                .imageUrl("https://example.edu/images/cpu-diagram.png")
                                .options(List.of("Central Processing Unit", "Computer Personal Unit", "Central Program Unit", "Computer Processing Unit"))
                                .correctAnswer("Central Processing Unit")
                                .explanation("CPU = Central Processing Unit")
                                .points(new BigDecimal("5"))
                                .build()
                ))
                .build();

        return ResponseEntity.ok(template);
    }

    // ==================== HELPERS ====================

    private AssignmentExport toAssignmentExport(AssignmentDto a) {
        QuizExport quizExport = null;
        if ("QUIZ".equals(a.getAssignmentType()) && a.getQuizId() != null) {
            try {
                QuizDto quiz = quizService.getQuizById(a.getQuizId());
                quizExport = QuizExport.builder()
                        .title(quiz.getTitle())
                        .description(quiz.getDescription())
                        .timeLimit(quiz.getTimeLimit())
                        .attemptsAllowed(quiz.getAttemptsAllowed())
                        .shuffleQuestions(quiz.getShuffleQuestions())
                        .shuffleAnswers(quiz.getShuffleAnswers())
                        .passPercentage(quiz.getPassPercentage())
                        .showCorrectAnswers(quiz.getShowCorrectAnswers())
                        .build();
            } catch (Exception ex) {
                log.warn("Could not load quiz {} for assignment export {}", a.getQuizId(), a.getId(), ex);
            }
        }

        return AssignmentExport.builder()
                .assignmentType(a.getAssignmentType())
                .title(a.getTitle())
                .description(a.getDescription())
                .descriptionFormat(a.getDescriptionFormat())
                .instructions(a.getInstructions())
                .instructionsFormat(a.getInstructionsFormat())
                .maxPoints(a.getMaxPoints())
                .rubric(a.getRubric())
                .dueDate(a.getDueDate() != null ? a.getDueDate().toString() : null)
                .availableFrom(a.getAvailableFrom() != null ? a.getAvailableFrom().toString() : null)
                .availableUntil(a.getAvailableUntil() != null ? a.getAvailableUntil().toString() : null)
                .allowLateSubmission(a.getAllowLateSubmission())
                .latePenaltyPercent(a.getLatePenaltyPercent())
                .submissionTypes(a.getSubmissionTypes())
                .allowedFileTypes(a.getAllowedFileTypes())
                .maxFileSize(a.getMaxFileSize())
                .maxFiles(a.getMaxFiles())
                .starterCode(a.getStarterCode())
                .programmingLanguage(a.getProgrammingLanguage())
                .autoGradingEnabled(a.getAutoGradingEnabled())
                .testCases(a.getTestCases())
                .tags(a.getTags())
                .estimatedDuration(a.getEstimatedDuration())
                .isPublished(a.getIsPublished())
                .quiz(quizExport)
                .build();
    }

    private void createAssignmentFromExport(AssignmentExport exp, UUID courseId, UUID moduleId, UUID userId) {
        CreateAssignmentRequest req = new CreateAssignmentRequest();
        req.setCourseId(courseId);
        req.setModuleId(moduleId);
        req.setAssignmentType(exp.getAssignmentType() != null ? exp.getAssignmentType() : "FILE_UPLOAD");
        req.setTitle(exp.getTitle());
        req.setDescription(exp.getDescription() != null ? exp.getDescription() : "");
        if (exp.getMaxPoints() != null) req.setMaxPoints(exp.getMaxPoints());
        if (exp.getStarterCode() != null) req.setStarterCode(exp.getStarterCode());
        if (exp.getProgrammingLanguage() != null) req.setProgrammingLanguage(exp.getProgrammingLanguage());
        if (exp.getAutoGradingEnabled() != null) req.setAutoGradingEnabled(exp.getAutoGradingEnabled());
        if (exp.getTestCases() != null) req.setTestCases(exp.getTestCases());
        if (exp.getRubric() != null) req.setRubric(exp.getRubric());
        if (exp.getAllowLateSubmission() != null) req.setAllowLateSubmission(exp.getAllowLateSubmission());
        if (exp.getLatePenaltyPercent() != null) req.setLatePenaltyPercent(exp.getLatePenaltyPercent());
        if (exp.getSubmissionTypes() != null) req.setSubmissionTypes(exp.getSubmissionTypes());
        if (exp.getAllowedFileTypes() != null) req.setAllowedFileTypes(exp.getAllowedFileTypes());
        if (exp.getMaxFileSize() != null) req.setMaxFileSize(exp.getMaxFileSize());
        if (exp.getMaxFiles() != null) req.setMaxFiles(exp.getMaxFiles());
        if (exp.getTags() != null) req.setTags(exp.getTags());
        if (exp.getEstimatedDuration() != null) req.setEstimatedDuration(exp.getEstimatedDuration());
        req.setIsPublished(exp.getIsPublished() != null ? exp.getIsPublished() : false);
        if ("QUIZ".equals(req.getAssignmentType())) {
            QuizExport quizExp = exp.getQuiz();
            if (quizExp != null) {
                req.setQuiz(InlineQuizRequest.builder()
                        .title(quizExp.getTitle())
                        .description(quizExp.getDescription())
                        .timeLimit(quizExp.getTimeLimit())
                        .attemptsAllowed(quizExp.getAttemptsAllowed())
                        .shuffleQuestions(quizExp.getShuffleQuestions())
                        .shuffleAnswers(quizExp.getShuffleAnswers())
                        .showCorrectAnswers(quizExp.getShowCorrectAnswers())
                        .passPercentage(quizExp.getPassPercentage())
                        .build());
            } else {
                req.setQuiz(InlineQuizRequest.builder()
                        .title(exp.getTitle())
                        .description(exp.getDescription())
                        .build());
            }
        }

        if (exp.getDueDate() != null) {
            try { req.setDueDate(LocalDateTime.parse(exp.getDueDate())); } catch (Exception ignored) {}
        }
        if (exp.getAvailableFrom() != null) {
            try { req.setAvailableFrom(LocalDateTime.parse(exp.getAvailableFrom())); } catch (Exception ignored) {}
        }
        if (exp.getAvailableUntil() != null) {
            try { req.setAvailableUntil(LocalDateTime.parse(exp.getAvailableUntil())); } catch (Exception ignored) {}
        }

        assignmentService.createAssignment(req, userId);
    }

    // ==================== DTOs ====================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CourseExport {
        private String version;
        private String exportedAt;
        private CourseMetaExport course;
        private List<ModuleExport> modules;
        private List<AssignmentExport> standaloneAssignments;
        private List<QuizExport> quizzes;
        private List<QuestionExport> questionBank;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CourseMetaExport {
        private String code;
        private String titleUk;
        private String titleEn;
        private String descriptionUk;
        private String descriptionEn;
        private String syllabus;
        private String visibility;
        private Integer maxStudents;
        private Boolean isPublished;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ModuleExport {
        private String title;
        private String description;
        private Integer position;
        private Boolean isPublished;
        private Map<String, Object> contentMeta;
        private List<ResourceExport> resources;
        private List<AssignmentExport> assignments;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ResourceExport {
        private String title;
        private String description;
        private String resourceType;
        private String externalUrl;
        private String textContent;
        private Integer position;
        private Boolean isDownloadable;
        private Map<String, Object> metadata;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AssignmentExport {
        private String assignmentType;
        private String title;
        private String description;
        private String descriptionFormat;
        private String instructions;
        private String instructionsFormat;
        private BigDecimal maxPoints;
        private Map<String, Object> rubric;
        private String dueDate;
        private String availableFrom;
        private String availableUntil;
        private Boolean allowLateSubmission;
        private BigDecimal latePenaltyPercent;
        private List<String> submissionTypes;
        private List<String> allowedFileTypes;
        private Long maxFileSize;
        private Integer maxFiles;
        private String starterCode;
        private String programmingLanguage;
        private Boolean autoGradingEnabled;
        private List<Map<String, Object>> testCases;
        private List<String> tags;
        private Integer estimatedDuration;
        private Boolean isPublished;
        private QuizExport quiz;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QuizExport {
        private String title;
        private String description;
        private Integer timeLimit;
        private Integer attemptsAllowed;
        private Boolean shuffleQuestions;
        private Boolean shuffleAnswers;
        private BigDecimal passPercentage;
        private Boolean showCorrectAnswers;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QuestionExport {
        private String questionType;
        private String stem;
        private String imageUrl;
        private Object options;
        private Object correctAnswer;
        private String explanation;
        private BigDecimal points;
        private Map<String, Object> metadata;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ImportResult {
        private boolean success;
        private String message;
        private String courseId;
        private int coursesCreated;
        private int modulesCreated;
        private int resourcesCreated;
        private int assignmentsCreated;
        private int quizzesCreated;
        private int questionsCreated;
        private List<String> logs;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ValidationResult {
        private boolean valid;
        private List<String> errors;
        private List<String> warnings;
        private Map<String, Integer> summary;
    }
}
