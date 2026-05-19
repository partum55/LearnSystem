package com.university.lms.course.adminops.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.adminops.domain.SisAuditLog;
import com.university.lms.course.adminops.domain.SisImportRun;
import com.university.lms.course.adminops.dto.SisAuditLogEntryDto;
import com.university.lms.course.adminops.dto.SisBulkEnrollmentActionRequest;
import com.university.lms.course.adminops.dto.SisBulkEnrollmentActionResponse;
import com.university.lms.course.adminops.dto.SisEnrollmentGroupApplyRequest;
import com.university.lms.course.adminops.dto.SisEnrollmentGroupApplyResponse;
import com.university.lms.course.adminops.dto.SisImportApplyResponse;
import com.university.lms.course.adminops.dto.SisImportPreviewResponse;
import com.university.lms.course.adminops.dto.SisImportRowErrorDto;
import com.university.lms.course.adminops.dto.SisImportRunResponse;
import com.university.lms.course.adminops.repository.SisAuditLogRepository;
import com.university.lms.course.adminops.repository.SisImportRunRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * SIS Admin operations: CSV preview/apply/rollback, audit log, enrollment group apply and bulk
 * enrollment actions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SisAdminOpsService {

  private static final String STATUS_PREVIEW_READY = "PREVIEW_READY";
  private static final String STATUS_PREVIEW_FAILED = "PREVIEW_FAILED";
  private static final String STATUS_APPLIED = "APPLIED";
  private static final String STATUS_ROLLED_BACK = "ROLLED_BACK";

  private static final String OP_COURSE_CREATE = "COURSE_CREATE";
  private static final String OP_ENROLLMENT_CREATE = "ENROLLMENT_CREATE";

  private static final Set<String> ALLOWED_MEMBER_ROLES = Set.of("STUDENT", "TA", "TEACHER");
  private static final Set<String> ALLOWED_ENROLLMENT_STATUSES =
      Set.of("active", "dropped", "completed");

  private static final List<String> STUDENTS_HEADERS =
      List.of("email", "student_id", "full_name", "group_code", "status");
  private static final List<String> COURSES_HEADERS =
      List.of("course_code", "title", "semester_code", "is_active");
  private static final List<String> GROUP_MAP_HEADERS =
      List.of("group_code", "semester_code", "required_course_code");
  private static final List<String> CURRENT_ENROLLMENT_HEADERS =
      List.of("email", "course_code", "role", "enrollment_status");

  private final SisImportRunRepository sisImportRunRepository;
  private final SisAuditLogRepository sisAuditLogRepository;
  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final ModuleRepository moduleRepository;
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  @Transactional
  public SisImportPreviewResponse previewImport(
      String semesterCode,
      MultipartFile studentsFile,
      MultipartFile coursesFile,
      MultipartFile groupCourseMapFile,
      MultipartFile currentEnrollmentsFile,
      UUID actorId) {

    String normalizedSemester = normalizeSemester(semesterCode);
    List<SisImportRowErrorDto> errors = new ArrayList<>();
    List<String> warnings = new ArrayList<>();

    CsvTable studentsTable =
        parseCsvFile(studentsFile, "students.csv", STUDENTS_HEADERS, true, errors);
    CsvTable coursesTable = parseCsvFile(coursesFile, "courses.csv", COURSES_HEADERS, true, errors);
    CsvTable groupMapTable =
        parseCsvFile(groupCourseMapFile, "group_course_map.csv", GROUP_MAP_HEADERS, true, errors);
    CsvTable currentEnrollmentTable =
        parseCsvFile(
            currentEnrollmentsFile,
            "current_enrollments.csv",
            CURRENT_ENROLLMENT_HEADERS,
            false,
            errors);

    List<StudentRow> students = parseStudents(studentsTable, errors);
    List<CourseRow> courses = parseCourses(coursesTable, errors);
    List<GroupCourseRow> groupMappings = parseGroupMappings(groupMapTable, errors);
    List<CurrentEnrollmentRow> currentEnrollments =
        parseCurrentEnrollments(currentEnrollmentTable, errors);

    Map<String, StudentRow> studentsByEmail = new LinkedHashMap<>();
    for (StudentRow row : students) {
      if (studentsByEmail.containsKey(row.email())) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file("students.csv")
                .field("email")
                .code("duplicate_email")
                .message("Duplicate email in students file: " + row.email())
                .build());
      } else {
        studentsByEmail.put(row.email(), row);
      }
    }

    Set<String> allEmails = new LinkedHashSet<>(studentsByEmail.keySet());
    currentEnrollments.forEach(row -> allEmails.add(row.email()));
    Map<String, UUID> userIdsByEmail = fetchUserIdsByEmail(allEmails);

    Set<String> allCourseCodes = new LinkedHashSet<>();
    courses.forEach(row -> allCourseCodes.add(row.courseCode()));
    groupMappings.forEach(row -> allCourseCodes.add(row.requiredCourseCode()));
    currentEnrollments.forEach(row -> allCourseCodes.add(row.courseCode()));

    Map<String, Course> existingCoursesByCode =
        courseRepository.findByCodeIn(allCourseCodes).stream()
            .collect(Collectors.toMap(Course::getCode, c -> c));

    List<Map<String, Object>> changeSet = new ArrayList<>();
    Set<String> plannedCourseCreates = new LinkedHashSet<>();

    for (CourseRow row : courses) {
      if (!normalizedSemester.equals(row.semesterCode())) {
        continue;
      }
      if (!existingCoursesByCode.containsKey(row.courseCode())) {
        if (plannedCourseCreates.add(row.courseCode())) {
          changeSet.add(
              mapOf(
                  "operation",
                  OP_COURSE_CREATE,
                  "courseCode",
                  row.courseCode(),
                  "title",
                  row.title(),
                  "semesterCode",
                  row.semesterCode(),
                  "isActive",
                  row.active()));
        }
      }
    }

    Map<String, List<GroupCourseRow>> groupToMappings = new HashMap<>();
    for (GroupCourseRow row : groupMappings) {
      if (!normalizedSemester.equals(row.semesterCode())) {
        continue;
      }
      groupToMappings.computeIfAbsent(row.groupCode(), ignored -> new ArrayList<>()).add(row);
    }

    Map<String, EnrollmentCandidate> candidates = new LinkedHashMap<>();

    for (StudentRow student : studentsByEmail.values()) {
      if (!"active".equals(student.status())) {
        continue;
      }
      List<GroupCourseRow> mappings = groupToMappings.getOrDefault(student.groupCode(), List.of());
      for (GroupCourseRow mapping : mappings) {
        String key = student.email() + "|" + mapping.requiredCourseCode();
        candidates.putIfAbsent(
            key,
            new EnrollmentCandidate(
                student.email(),
                mapping.requiredCourseCode(),
                "STUDENT",
                "active",
                "GROUP_MAP",
                student.groupCode()));
      }
    }

    for (CurrentEnrollmentRow row : currentEnrollments) {
      String key = row.email() + "|" + row.courseCode();
      candidates.put(
          key,
          new EnrollmentCandidate(
              row.email(), row.courseCode(), row.role(), row.enrollmentStatus(), "CURRENT_ENROLLMENTS", null));
    }

    Set<UUID> candidateUserIds = new LinkedHashSet<>();
    Set<UUID> candidateCourseIds = new LinkedHashSet<>();

    for (EnrollmentCandidate candidate : candidates.values()) {
      UUID userId = userIdsByEmail.get(candidate.email());
      Course existingCourse = existingCoursesByCode.get(candidate.courseCode());
      if (userId != null) {
        candidateUserIds.add(userId);
      }
      if (existingCourse != null) {
        candidateCourseIds.add(existingCourse.getId());
      }
    }

    Set<String> existingMembershipKeys = new HashSet<>();
    if (!candidateUserIds.isEmpty() && !candidateCourseIds.isEmpty()) {
      courseMemberRepository
          .findByCourseIdInAndUserIdIn(candidateCourseIds, candidateUserIds)
          .forEach(
              member ->
                  existingMembershipKeys.add(
                      member.getUserId() + "|" + member.getCourse().getId().toString()));
    }

    int skippedExistingEnrollments = 0;
    int unmatchedUsers = 0;
    int unmatchedCourses = 0;

    for (EnrollmentCandidate candidate : candidates.values()) {
      UUID userId = userIdsByEmail.get(candidate.email());
      if (userId == null) {
        unmatchedUsers++;
        errors.add(
            SisImportRowErrorDto.builder()
                .file(candidate.source().equals("GROUP_MAP") ? "students.csv" : "current_enrollments.csv")
                .field("email")
                .code("user_not_found")
                .message("User not found for email: " + candidate.email())
                .build());
        continue;
      }

      Course existingCourse = existingCoursesByCode.get(candidate.courseCode());
      boolean courseWillBeCreated = plannedCourseCreates.contains(candidate.courseCode());
      if (existingCourse == null && !courseWillBeCreated) {
        unmatchedCourses++;
        errors.add(
            SisImportRowErrorDto.builder()
                .file(
                    candidate.source().equals("GROUP_MAP")
                        ? "group_course_map.csv"
                        : "current_enrollments.csv")
                .field("course_code")
                .code("course_not_found")
                .message("Course not found for code: " + candidate.courseCode())
                .build());
        continue;
      }

      if (existingCourse != null) {
        String memberKey = userId + "|" + existingCourse.getId();
        if (existingMembershipKeys.contains(memberKey)) {
          skippedExistingEnrollments++;
          continue;
        }
      }

      changeSet.add(
          mapOf(
              "operation",
              OP_ENROLLMENT_CREATE,
              "email",
              candidate.email(),
              "userId",
              userId.toString(),
              "courseCode",
              candidate.courseCode(),
              "role",
              candidate.role(),
              "enrollmentStatus",
              candidate.enrollmentStatus(),
              "source",
              candidate.source(),
              "groupCode",
              candidate.groupCode()));
    }

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("studentsRows", students.size());
    summary.put("coursesRows", courses.size());
    summary.put("groupMappingsRows", groupMappings.size());
    summary.put("currentEnrollmentsRows", currentEnrollments.size());
    summary.put("proposedCourseCreates", plannedCourseCreates.size());
    summary.put(
        "proposedEnrollmentCreates",
        changeSet.stream().filter(op -> OP_ENROLLMENT_CREATE.equals(op.get("operation"))).count());
    summary.put("skippedExistingEnrollments", skippedExistingEnrollments);
    summary.put("unmatchedUsers", unmatchedUsers);
    summary.put("unmatchedCourses", unmatchedCourses);
    summary.put("errors", errors.size());

    boolean valid = errors.isEmpty();

    SisImportRun run =
        SisImportRun.builder()
            .semesterCode(normalizedSemester)
            .status(valid ? STATUS_PREVIEW_READY : STATUS_PREVIEW_FAILED)
            .requestedBy(actorId)
            .valid(valid)
            .previewSummary(summary)
            .rowErrors(errors.stream().map(this::toErrorMap).collect(Collectors.toList()))
            .warnings(warnings)
            .changeSet(changeSet)
            .build();

    SisImportRun saved = sisImportRunRepository.save(run);

    logAudit(
        saved.getId(),
        actorId,
        "IMPORT_PREVIEW",
        "SIS_IMPORT",
        saved.getId().toString(),
        mapOf("valid", valid, "summary", summary));

    return toPreviewResponse(saved);
  }

  @Transactional
  public SisImportApplyResponse applyImport(UUID importId, UUID actorId) {
    SisImportRun run = requireRun(importId);

    if (!run.isValid()) {
      throw new ValidationException("Import preview has errors and cannot be applied");
    }
    if (!STATUS_PREVIEW_READY.equals(run.getStatus())) {
      throw new ValidationException("Only PREVIEW_READY imports can be applied");
    }

    List<Map<String, Object>> changes = run.getChangeSet();
    int createdCourses = 0;
    int createdEnrollments = 0;
    int skippedEnrollments = 0;

    List<UUID> createdCourseIds = new ArrayList<>();
    List<UUID> createdEnrollmentIds = new ArrayList<>();

    Set<String> allCourseCodes =
        changes.stream()
            .map(op -> getString(op, "courseCode"))
            .filter(Objects::nonNull)
            .collect(Collectors.toCollection(LinkedHashSet::new));

    Map<String, Course> coursesByCode =
        courseRepository.findByCodeIn(allCourseCodes).stream()
            .collect(Collectors.toMap(Course::getCode, c -> c));

    for (Map<String, Object> op : changes) {
      if (!OP_COURSE_CREATE.equals(getString(op, "operation"))) {
        continue;
      }

      String code = normalizeCourseCode(getString(op, "courseCode"));
      if (coursesByCode.containsKey(code)) {
        continue;
      }

      String title = Optional.ofNullable(getString(op, "title")).orElse(code);
      String semesterCode = Optional.ofNullable(getString(op, "semesterCode")).orElse(run.getSemesterCode());
      boolean active = getBoolean(op, "isActive", false);

      Course course =
          Course.builder()
              .code(code)
              .titleUk(title)
              .titleEn(title)
              .descriptionUk("Imported from SIS")
              .descriptionEn("Imported from SIS")
              .ownerId(actorId)
              .visibility(CourseVisibility.PRIVATE)
              .academicYear(semesterCode)
              .status(active ? CourseStatus.PUBLISHED : CourseStatus.DRAFT)
              .isPublished(active)
              .build();

      Course savedCourse = courseRepository.save(course);
      coursesByCode.put(savedCourse.getCode(), savedCourse);
      createdCourseIds.add(savedCourse.getId());
      createdCourses++;

      logAudit(
          run.getId(),
          actorId,
          "COURSE_CREATED",
          "COURSE",
          savedCourse.getCode(),
          mapOf("courseId", savedCourse.getId().toString(), "importId", run.getId().toString()));
    }

    for (Map<String, Object> op : changes) {
      if (!OP_ENROLLMENT_CREATE.equals(getString(op, "operation"))) {
        continue;
      }

      String courseCode = normalizeCourseCode(getString(op, "courseCode"));
      String userIdRaw = getString(op, "userId");
      if (courseCode == null || userIdRaw == null) {
        skippedEnrollments++;
        continue;
      }

      Course course = coursesByCode.get(courseCode);
      if (course == null) {
        skippedEnrollments++;
        continue;
      }

      UUID userId;
      try {
        userId = UUID.fromString(userIdRaw);
      } catch (IllegalArgumentException ex) {
        skippedEnrollments++;
        continue;
      }

      if (courseMemberRepository.existsByCourseIdAndUserId(course.getId(), userId)) {
        skippedEnrollments++;
        continue;
      }

      String role = normalizeRole(getString(op, "role"));
      String status = normalizeEnrollmentStatus(getString(op, "enrollmentStatus"));

      CourseMember member =
          CourseMember.builder()
              .course(course)
              .userId(userId)
              .roleInCourse(role)
              .addedBy(actorId)
              .enrollmentStatus(status)
              .completionDate("completed".equals(status) ? LocalDateTime.now() : null)
              .build();

      CourseMember savedMember = courseMemberRepository.save(member);
      createdEnrollmentIds.add(savedMember.getId());
      createdEnrollments++;

      logAudit(
          run.getId(),
          actorId,
          "ENROLLMENT_CREATED",
          "COURSE_MEMBER",
          savedMember.getId().toString(),
          mapOf(
              "courseCode",
              courseCode,
              "userId",
              userId.toString(),
              "source",
              Optional.ofNullable(getString(op, "source")).orElse("UNKNOWN")));
    }

    Map<String, Object> applyReport = new LinkedHashMap<>();
    applyReport.put("createdCourses", createdCourses);
    applyReport.put("createdEnrollments", createdEnrollments);
    applyReport.put("skippedEnrollments", skippedEnrollments);
    applyReport.put(
        "createdCourseIds",
        createdCourseIds.stream().map(UUID::toString).collect(Collectors.toList()));
    applyReport.put(
        "createdEnrollmentIds",
        createdEnrollmentIds.stream().map(UUID::toString).collect(Collectors.toList()));

    run.setApplyReport(applyReport);
    run.setStatus(STATUS_APPLIED);
    run.setAppliedAt(LocalDateTime.now());
    run.setRollbackExpiresAt(LocalDateTime.now().plusHours(24));
    sisImportRunRepository.save(run);

    logAudit(
        run.getId(),
        actorId,
        "IMPORT_APPLIED",
        "SIS_IMPORT",
        run.getId().toString(),
        applyReport);

    return SisImportApplyResponse.builder()
        .importId(run.getId())
        .status(run.getStatus())
        .message("Import applied successfully")
        .createdCourses(createdCourses)
        .createdEnrollments(createdEnrollments)
        .skippedEnrollments(skippedEnrollments)
        .rollbackExpiresAt(run.getRollbackExpiresAt())
        .build();
  }

  @Transactional
  public SisImportApplyResponse rollbackImport(UUID importId, UUID actorId) {
    SisImportRun run = requireRun(importId);

    if (!STATUS_APPLIED.equals(run.getStatus())) {
      throw new ValidationException("Only APPLIED imports can be rolled back");
    }
    if (run.getRollbackExpiresAt() != null && LocalDateTime.now().isAfter(run.getRollbackExpiresAt())) {
      throw new ValidationException("Rollback window expired");
    }

    List<UUID> enrollmentIds = asUuidList(run.getApplyReport().get("createdEnrollmentIds"));
    List<UUID> courseIds = asUuidList(run.getApplyReport().get("createdCourseIds"));

    int removedEnrollments = 0;
    for (UUID enrollmentId : enrollmentIds) {
      if (courseMemberRepository.existsById(enrollmentId)) {
        courseMemberRepository.deleteById(enrollmentId);
        removedEnrollments++;
      }
    }

    int removedCourses = 0;
    for (UUID courseId : courseIds) {
      Optional<Course> courseOpt = courseRepository.findById(courseId);
      if (courseOpt.isEmpty()) {
        continue;
      }

      Course course = courseOpt.get();
      long memberCount = courseMemberRepository.countByCourseId(courseId);
      long moduleCount = moduleRepository.countByCourseId(courseId);

      if (memberCount == 0 && moduleCount == 0) {
        courseRepository.delete(course);
        removedCourses++;
      } else {
        course.setStatus(CourseStatus.ARCHIVED);
        course.setIsPublished(false);
        courseRepository.save(course);
      }
    }

    run.setStatus(STATUS_ROLLED_BACK);
    run.setRolledBackAt(LocalDateTime.now());
    sisImportRunRepository.save(run);

    Map<String, Object> report = mapOf("removedEnrollments", removedEnrollments, "removedCourses", removedCourses);

    logAudit(
        run.getId(),
        actorId,
        "IMPORT_ROLLED_BACK",
        "SIS_IMPORT",
        run.getId().toString(),
        report);

    return SisImportApplyResponse.builder()
        .importId(run.getId())
        .status(run.getStatus())
        .message("Rollback completed")
        .createdCourses(removedCourses)
        .createdEnrollments(removedEnrollments)
        .skippedEnrollments(0)
        .rollbackExpiresAt(run.getRollbackExpiresAt())
        .build();
  }

  public SisImportRunResponse getImportRun(UUID importId) {
    return toRunResponse(requireRun(importId));
  }

  public PageResponse<SisImportRunResponse> listImportRuns(Pageable pageable) {
    Page<SisImportRun> page = sisImportRunRepository.findAllByOrderByCreatedAtDesc(pageable);
    return PageResponse.<SisImportRunResponse>builder()
        .content(page.getContent().stream().map(this::toRunResponse).toList())
        .pageNumber(page.getNumber())
        .pageSize(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .last(page.isLast())
        .build();
  }

  public PageResponse<SisAuditLogEntryDto> getAuditLogs(
      UUID importId, String action, String entityType, Pageable pageable) {
    String normalizedAction = normalizeNullable(action);
    String normalizedEntityType = normalizeNullable(entityType);

    Page<SisAuditLog> page =
        sisAuditLogRepository.search(importId, normalizedAction, normalizedEntityType, pageable);

    return PageResponse.<SisAuditLogEntryDto>builder()
        .content(page.getContent().stream().map(this::toAuditDto).toList())
        .pageNumber(page.getNumber())
        .pageSize(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .last(page.isLast())
        .build();
  }

  @Transactional
  public SisEnrollmentGroupApplyResponse applyEnrollmentGroup(
      SisEnrollmentGroupApplyRequest request, UUID actorId) {
    SisImportRun run = requireRun(request.getImportId());
    String targetGroup = request.getGroupCode().trim();

    int created = 0;
    int skipped = 0;

    Set<String> allCourseCodes = new LinkedHashSet<>();
    for (Map<String, Object> op : run.getChangeSet()) {
      if (!OP_ENROLLMENT_CREATE.equals(getString(op, "operation"))) {
        continue;
      }
      if (!"GROUP_MAP".equals(getString(op, "source"))) {
        continue;
      }
      if (!targetGroup.equalsIgnoreCase(Optional.ofNullable(getString(op, "groupCode")).orElse(""))) {
        continue;
      }
      String courseCode = normalizeCourseCode(getString(op, "courseCode"));
      if (courseCode != null) {
        allCourseCodes.add(courseCode);
      }
    }

    Map<String, Course> coursesByCode =
        courseRepository.findByCodeIn(allCourseCodes).stream()
            .collect(Collectors.toMap(Course::getCode, c -> c));

    for (Map<String, Object> op : run.getChangeSet()) {
      if (!OP_ENROLLMENT_CREATE.equals(getString(op, "operation"))) {
        continue;
      }
      if (!"GROUP_MAP".equals(getString(op, "source"))) {
        continue;
      }
      if (!targetGroup.equalsIgnoreCase(Optional.ofNullable(getString(op, "groupCode")).orElse(""))) {
        continue;
      }

      String courseCode = normalizeCourseCode(getString(op, "courseCode"));
      String userIdRaw = getString(op, "userId");
      if (courseCode == null || userIdRaw == null) {
        skipped++;
        continue;
      }

      Course course = coursesByCode.get(courseCode);
      if (course == null) {
        skipped++;
        continue;
      }

      UUID userId;
      try {
        userId = UUID.fromString(userIdRaw);
      } catch (IllegalArgumentException ex) {
        skipped++;
        continue;
      }

      if (courseMemberRepository.existsByCourseIdAndUserId(course.getId(), userId)) {
        skipped++;
        continue;
      }

      CourseMember member =
          CourseMember.builder()
              .course(course)
              .userId(userId)
              .roleInCourse(normalizeRole(getString(op, "role")))
              .addedBy(actorId)
              .enrollmentStatus(normalizeEnrollmentStatus(getString(op, "enrollmentStatus")))
              .build();
      courseMemberRepository.save(member);
      created++;
    }

    logAudit(
        run.getId(),
        actorId,
        "GROUP_APPLY",
        "ENROLLMENT_GROUP",
        targetGroup,
        mapOf("createdEnrollments", created, "skipped", skipped));

    return SisEnrollmentGroupApplyResponse.builder()
        .groupCode(targetGroup)
        .createdEnrollments(created)
        .skippedEnrollments(skipped)
        .message("Enrollment group applied")
        .build();
  }

  @Transactional
  public SisBulkEnrollmentActionResponse executeBulkEnrollmentAction(
      SisBulkEnrollmentActionRequest request, UUID actorId) {
    String action = normalizeNullable(request.getAction());
    if (action == null) {
      throw new ValidationException("action: Action is required");
    }

    List<String> emails =
        request.getEmails().stream().map(this::normalizeEmail).filter(Objects::nonNull).distinct().toList();
    if (emails.isEmpty()) {
      throw new ValidationException("emails: At least one valid email is required");
    }

    List<String> courseCodes =
        request.getCourseCodes().stream()
            .map(this::normalizeCourseCode)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
    if (courseCodes.isEmpty()) {
      throw new ValidationException("courseCodes: At least one course code is required");
    }

    Map<String, UUID> usersByEmail = fetchUserIdsByEmail(new LinkedHashSet<>(emails));
    Set<UUID> userIds = new LinkedHashSet<>(usersByEmail.values());

    Map<String, Course> coursesByCode =
        courseRepository.findByCodeIn(courseCodes).stream()
            .collect(Collectors.toMap(Course::getCode, c -> c));

    int affectedEnrollments = 0;
    int skipped = 0;

    if ("MOVE_STUDENTS".equalsIgnoreCase(action)) {
      String targetCode = normalizeCourseCode(request.getTargetCourseCode());
      if (targetCode == null) {
        throw new ValidationException("targetCourseCode: targetCourseCode is required for MOVE_STUDENTS");
      }
      Course targetCourse = courseRepository.findByCode(targetCode)
          .orElseThrow(() -> new ValidationException("Target course not found: " + targetCode));

      for (Course sourceCourse : coursesByCode.values()) {
        for (UUID userId : userIds) {
          Optional<CourseMember> sourceMember =
              courseMemberRepository.findByCourseIdAndUserId(sourceCourse.getId(), userId);
          if (sourceMember.isEmpty()) {
            skipped++;
            continue;
          }

          CourseMember member = sourceMember.get();
          member.setEnrollmentStatus("dropped");
          courseMemberRepository.save(member);
          affectedEnrollments++;

          if (!courseMemberRepository.existsByCourseIdAndUserId(targetCourse.getId(), userId)) {
            courseMemberRepository.save(
                CourseMember.builder()
                    .course(targetCourse)
                    .userId(userId)
                    .roleInCourse("STUDENT")
                    .addedBy(actorId)
                    .enrollmentStatus("active")
                    .build());
            affectedEnrollments++;
          }
        }
      }
    } else if ("CHANGE_STATUS".equalsIgnoreCase(action)) {
      String status = normalizeEnrollmentStatus(request.getEnrollmentStatus());
      for (Course course : coursesByCode.values()) {
        for (UUID userId : userIds) {
          Optional<CourseMember> memberOpt =
              courseMemberRepository.findByCourseIdAndUserId(course.getId(), userId);
          if (memberOpt.isEmpty()) {
            skipped++;
            continue;
          }
          CourseMember member = memberOpt.get();
          member.setEnrollmentStatus(status);
          member.setCompletionDate("completed".equals(status) ? LocalDateTime.now() : null);
          courseMemberRepository.save(member);
          affectedEnrollments++;
        }
      }
    } else if ("UNENROLL".equalsIgnoreCase(action)) {
      for (Course course : coursesByCode.values()) {
        for (UUID userId : userIds) {
          Optional<CourseMember> memberOpt =
              courseMemberRepository.findByCourseIdAndUserId(course.getId(), userId);
          if (memberOpt.isEmpty()) {
            skipped++;
            continue;
          }
          courseMemberRepository.delete(memberOpt.get());
          affectedEnrollments++;
        }
      }
    } else {
      throw new ValidationException(
          "action: Unsupported action. Use MOVE_STUDENTS, CHANGE_STATUS, or UNENROLL");
    }

    logAudit(
        null,
        actorId,
        "BULK_" + action.toUpperCase(Locale.ROOT),
        "COURSE_MEMBER",
        String.join(",", courseCodes),
        mapOf("emails", emails.size(), "affectedEnrollments", affectedEnrollments, "skipped", skipped));

    return SisBulkEnrollmentActionResponse.builder()
        .action(action.toUpperCase(Locale.ROOT))
        .affectedUsers(userIds.size())
        .affectedEnrollments(affectedEnrollments)
        .skipped(skipped)
        .message("Bulk action completed")
        .build();
  }

  private SisImportRun requireRun(UUID importId) {
    return sisImportRunRepository
        .findById(importId)
        .orElseThrow(() -> new ResourceNotFoundException("SisImportRun", "id", importId));
  }

  private SisImportPreviewResponse toPreviewResponse(SisImportRun run) {
    return SisImportPreviewResponse.builder()
        .importId(run.getId())
        .semesterCode(run.getSemesterCode())
        .status(run.getStatus())
        .valid(run.isValid())
        .summary(run.getPreviewSummary())
        .errors(fromErrorMaps(run.getRowErrors()))
        .warnings(run.getWarnings())
        .build();
  }

  private SisImportRunResponse toRunResponse(SisImportRun run) {
    return SisImportRunResponse.builder()
        .id(run.getId())
        .semesterCode(run.getSemesterCode())
        .status(run.getStatus())
        .valid(run.isValid())
        .requestedBy(run.getRequestedBy())
        .summary(run.getPreviewSummary())
        .errors(fromErrorMaps(run.getRowErrors()))
        .warnings(run.getWarnings())
        .applyReport(run.getApplyReport())
        .appliedAt(run.getAppliedAt())
        .rollbackExpiresAt(run.getRollbackExpiresAt())
        .rolledBackAt(run.getRolledBackAt())
        .createdAt(run.getCreatedAt())
        .updatedAt(run.getUpdatedAt())
        .build();
  }

  private SisAuditLogEntryDto toAuditDto(SisAuditLog auditLog) {
    return SisAuditLogEntryDto.builder()
        .id(auditLog.getId())
        .importRunId(auditLog.getImportRunId())
        .actorId(auditLog.getActorId())
        .action(auditLog.getAction())
        .entityType(auditLog.getEntityType())
        .entityKey(auditLog.getEntityKey())
        .details(auditLog.getDetails())
        .createdAt(auditLog.getCreatedAt())
        .build();
  }

  private void logAudit(
      UUID importRunId,
      UUID actorId,
      String action,
      String entityType,
      String entityKey,
      Map<String, Object> details) {
    SisAuditLog logEntry =
        SisAuditLog.builder()
            .importRunId(importRunId)
            .actorId(actorId)
            .action(action)
            .entityType(entityType)
            .entityKey(entityKey)
            .details(details == null ? Map.of() : details)
            .build();
    sisAuditLogRepository.save(logEntry);
  }

  private CsvTable parseCsvFile(
      MultipartFile file,
      String fileName,
      List<String> expectedHeaders,
      boolean required,
      List<SisImportRowErrorDto> errors) {
    if (file == null || file.isEmpty()) {
      if (required) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(fileName)
                .code("missing_file")
                .message("Missing required file: " + fileName)
                .build());
      }
      return new CsvTable(fileName, expectedHeaders, List.of());
    }

    String content;
    try {
      content = new String(file.getBytes(), StandardCharsets.UTF_8);
    } catch (Exception ex) {
      errors.add(
          SisImportRowErrorDto.builder()
              .file(fileName)
              .code("read_error")
              .message("Cannot read file: " + ex.getMessage())
              .build());
      return new CsvTable(fileName, expectedHeaders, List.of());
    }

    List<List<String>> rawRows = parseCsvRows(content);
    if (rawRows.isEmpty()) {
      errors.add(
          SisImportRowErrorDto.builder()
              .file(fileName)
              .code("empty_file")
              .message("CSV file is empty")
              .build());
      return new CsvTable(fileName, expectedHeaders, List.of());
    }

    List<String> actualHeaders =
        rawRows.get(0).stream()
            .map(header -> header == null ? "" : header.trim().toLowerCase(Locale.ROOT))
            .toList();

    if (!actualHeaders.equals(expectedHeaders)) {
      errors.add(
          SisImportRowErrorDto.builder()
              .file(fileName)
              .field("header")
              .code("invalid_header")
              .message(
                  "Invalid header. Expected "
                      + String.join(",", expectedHeaders)
                      + " but got "
                      + String.join(",", actualHeaders))
              .build());
      return new CsvTable(fileName, expectedHeaders, List.of());
    }

    List<Map<String, String>> rows = new ArrayList<>();
    for (int i = 1; i < rawRows.size(); i++) {
      List<String> rowValues = rawRows.get(i);
      boolean empty = rowValues.stream().allMatch(value -> value == null || value.trim().isEmpty());
      if (empty) {
        continue;
      }

      if (rowValues.size() != expectedHeaders.size()) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(fileName)
                .row(i + 1)
                .code("invalid_column_count")
                .message(
                    "Expected "
                        + expectedHeaders.size()
                        + " columns but got "
                        + rowValues.size())
                .build());
        continue;
      }

      Map<String, String> row = new LinkedHashMap<>();
      for (int col = 0; col < expectedHeaders.size(); col++) {
        row.put(expectedHeaders.get(col), Optional.ofNullable(rowValues.get(col)).orElse("").trim());
      }
      rows.add(row);
    }

    return new CsvTable(fileName, expectedHeaders, rows);
  }

  private List<StudentRow> parseStudents(CsvTable table, List<SisImportRowErrorDto> errors) {
    List<StudentRow> result = new ArrayList<>();
    int rowIndex = 2;
    for (Map<String, String> row : table.rows()) {
      String email = normalizeEmail(row.get("email"));
      String groupCode = normalizeNullable(row.get("group_code"));
      String status = normalizeNullable(row.get("status"));

      if (email == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("email")
                .code("required")
                .message("Email is required")
                .build());
      }
      if (groupCode == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("group_code")
                .code("required")
                .message("group_code is required")
                .build());
      }

      String normalizedStatus =
          status == null ? "active" : status.toLowerCase(Locale.ROOT).trim();
      if (!Set.of("active", "inactive", "dropped", "completed").contains(normalizedStatus)) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("status")
                .code("invalid_enum")
                .message("Unsupported student status: " + status)
                .build());
      }

      if (email != null && groupCode != null) {
        result.add(new StudentRow(email, groupCode, normalizedStatus));
      }
      rowIndex++;
    }
    return result;
  }

  private List<CourseRow> parseCourses(CsvTable table, List<SisImportRowErrorDto> errors) {
    List<CourseRow> result = new ArrayList<>();
    int rowIndex = 2;
    for (Map<String, String> row : table.rows()) {
      String courseCode = normalizeCourseCode(row.get("course_code"));
      String title = normalizeNullable(row.get("title"));
      String semesterCode = normalizeSemester(row.get("semester_code"));
      Boolean active = parseBooleanValue(row.get("is_active"));

      if (courseCode == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("course_code")
                .code("required")
                .message("course_code is required")
                .build());
      }
      if (title == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("title")
                .code("required")
                .message("title is required")
                .build());
      }
      if (semesterCode == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("semester_code")
                .code("required")
                .message("semester_code is required")
                .build());
      }
      if (active == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .field("is_active")
                .code("invalid_boolean")
                .message("is_active must be true/false")
                .build());
      }

      if (courseCode != null && title != null && semesterCode != null && active != null) {
        result.add(new CourseRow(courseCode, title, semesterCode, active));
      }
      rowIndex++;
    }
    return result;
  }

  private List<GroupCourseRow> parseGroupMappings(CsvTable table, List<SisImportRowErrorDto> errors) {
    List<GroupCourseRow> result = new ArrayList<>();
    int rowIndex = 2;
    for (Map<String, String> row : table.rows()) {
      String groupCode = normalizeNullable(row.get("group_code"));
      String semesterCode = normalizeSemester(row.get("semester_code"));
      String requiredCourseCode = normalizeCourseCode(row.get("required_course_code"));

      if (groupCode == null || semesterCode == null || requiredCourseCode == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .code("required")
                .message("group_code, semester_code and required_course_code are required")
                .build());
      } else {
        result.add(new GroupCourseRow(groupCode, semesterCode, requiredCourseCode));
      }
      rowIndex++;
    }
    return result;
  }

  private List<CurrentEnrollmentRow> parseCurrentEnrollments(
      CsvTable table, List<SisImportRowErrorDto> errors) {
    List<CurrentEnrollmentRow> result = new ArrayList<>();
    int rowIndex = 2;
    for (Map<String, String> row : table.rows()) {
      String email = normalizeEmail(row.get("email"));
      String courseCode = normalizeCourseCode(row.get("course_code"));
      String role = normalizeRole(row.get("role"));
      String enrollmentStatus = normalizeEnrollmentStatus(row.get("enrollment_status"));

      if (email == null || courseCode == null) {
        errors.add(
            SisImportRowErrorDto.builder()
                .file(table.name())
                .row(rowIndex)
                .code("required")
                .message("email and course_code are required")
                .build());
      } else {
        result.add(new CurrentEnrollmentRow(email, courseCode, role, enrollmentStatus));
      }
      rowIndex++;
    }
    return result;
  }

  private List<List<String>> parseCsvRows(String content) {
    if (content == null) {
      return List.of();
    }
    if (content.startsWith("\uFEFF")) {
      content = content.substring(1);
    }

    List<List<String>> rows = new ArrayList<>();
    List<String> currentRow = new ArrayList<>();
    StringBuilder currentField = new StringBuilder();
    boolean inQuotes = false;

    for (int i = 0; i < content.length(); i++) {
      char ch = content.charAt(i);

      if (ch == '"') {
        if (inQuotes && i + 1 < content.length() && content.charAt(i + 1) == '"') {
          currentField.append('"');
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch == ',' && !inQuotes) {
        currentRow.add(currentField.toString());
        currentField.setLength(0);
        continue;
      }

      if ((ch == '\n' || ch == '\r') && !inQuotes) {
        if (ch == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') {
          i++;
        }
        currentRow.add(currentField.toString());
        currentField.setLength(0);
        rows.add(currentRow);
        currentRow = new ArrayList<>();
        continue;
      }

      currentField.append(ch);
    }

    currentRow.add(currentField.toString());
    rows.add(currentRow);

    return rows.stream()
        .filter(
            row ->
                row.stream()
                    .map(value -> value == null ? "" : value.trim())
                    .anyMatch(value -> !value.isEmpty()))
        .toList();
  }

  private Map<String, UUID> fetchUserIdsByEmail(Set<String> normalizedEmails) {
    if (normalizedEmails.isEmpty()) {
      return Map.of();
    }

    Map<String, UUID> result = new HashMap<>();
    List<String> emails = new ArrayList<>(normalizedEmails);

    int batchSize = 500;
    for (int offset = 0; offset < emails.size(); offset += batchSize) {
      List<String> batch = emails.subList(offset, Math.min(offset + batchSize, emails.size()));
      String placeholders = batch.stream().map(ignored -> "?").collect(Collectors.joining(","));
      String sql =
          "SELECT id, LOWER(TRIM(email)) AS normalized_email "
              + "FROM users WHERE LOWER(TRIM(email)) IN ("
              + placeholders
              + ")";

      jdbcTemplate.query(
          sql,
          rs -> {
            String email = rs.getString("normalized_email");
            UUID userId = UUID.fromString(rs.getString("id"));
            result.put(email, userId);
          },
          batch.toArray());
    }

    return result;
  }

  private String normalizeSemester(String value) {
    String normalized = normalizeNullable(value);
    return normalized == null ? null : normalized;
  }

  private String normalizeNullable(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String normalizeEmail(String value) {
    String normalized = normalizeNullable(value);
    return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
  }

  private String normalizeCourseCode(String value) {
    String normalized = normalizeNullable(value);
    return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
  }

  private String normalizeRole(String value) {
    String normalized = normalizeNullable(value);
    if (normalized == null) {
      return "STUDENT";
    }
    String role = normalized.toUpperCase(Locale.ROOT);
    if (!ALLOWED_MEMBER_ROLES.contains(role)) {
      throw new ValidationException("role: Unsupported role " + normalized);
    }
    return role;
  }

  private String normalizeEnrollmentStatus(String value) {
    String normalized = normalizeNullable(value);
    if (normalized == null) {
      return "active";
    }
    String status = normalized.toLowerCase(Locale.ROOT);
    if (!ALLOWED_ENROLLMENT_STATUSES.contains(status)) {
      throw new ValidationException("enrollmentStatus: Unsupported status " + normalized);
    }
    return status;
  }

  private Boolean parseBooleanValue(String value) {
    String normalized = normalizeNullable(value);
    if (normalized == null) {
      return null;
    }
    String v = normalized.toLowerCase(Locale.ROOT);
    if (Set.of("true", "1", "yes", "y").contains(v)) {
      return true;
    }
    if (Set.of("false", "0", "no", "n").contains(v)) {
      return false;
    }
    return null;
  }

  private Map<String, Object> toErrorMap(SisImportRowErrorDto error) {
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("file", error.getFile());
    map.put("row", error.getRow());
    map.put("field", error.getField());
    map.put("code", error.getCode());
    map.put("message", error.getMessage());
    return map;
  }

  private List<SisImportRowErrorDto> fromErrorMaps(List<Map<String, Object>> maps) {
    List<SisImportRowErrorDto> result = new ArrayList<>();
    for (Map<String, Object> map : maps) {
      result.add(
          SisImportRowErrorDto.builder()
              .file(getString(map, "file"))
              .row(getInteger(map, "row"))
              .field(getString(map, "field"))
              .code(getString(map, "code"))
              .message(getString(map, "message"))
              .build());
    }
    return result;
  }

  private Integer getInteger(Map<String, Object> source, String key) {
    Object value = source.get(key);
    if (value == null) {
      return null;
    }
    if (value instanceof Number number) {
      return number.intValue();
    }
    try {
      return Integer.parseInt(value.toString());
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  private String getString(Map<String, Object> source, String key) {
    Object value = source.get(key);
    return value == null ? null : value.toString();
  }

  private boolean getBoolean(Map<String, Object> source, String key, boolean defaultValue) {
    Object value = source.get(key);
    if (value == null) {
      return defaultValue;
    }
    if (value instanceof Boolean b) {
      return b;
    }
    if (value instanceof Number n) {
      return n.intValue() != 0;
    }
    return Boolean.parseBoolean(value.toString());
  }

  private List<UUID> asUuidList(Object value) {
    if (value == null) {
      return List.of();
    }

    Collection<?> raw;
    if (value instanceof Collection<?> collection) {
      raw = collection;
    } else {
      try {
        raw = objectMapper.convertValue(value, List.class);
      } catch (IllegalArgumentException ex) {
        return List.of();
      }
    }

    List<UUID> uuids = new ArrayList<>();
    for (Object item : raw) {
      if (item == null) {
        continue;
      }
      try {
        uuids.add(UUID.fromString(item.toString()));
      } catch (IllegalArgumentException ignored) {
      }
    }
    return uuids;
  }

  private Map<String, Object> mapOf(Object... kvPairs) {
    Map<String, Object> map = new LinkedHashMap<>();
    if (kvPairs == null) {
      return map;
    }
    if (kvPairs.length % 2 != 0) {
      throw new IllegalArgumentException("mapOf expects even number of arguments");
    }
    for (int i = 0; i < kvPairs.length; i += 2) {
      String key = String.valueOf(kvPairs[i]);
      Object value = kvPairs[i + 1];
      map.put(key, value);
    }
    return map;
  }

  private record CsvTable(String name, List<String> headers, List<Map<String, String>> rows) {}

  private record StudentRow(String email, String groupCode, String status) {}

  private record CourseRow(String courseCode, String title, String semesterCode, boolean active) {}

  private record GroupCourseRow(String groupCode, String semesterCode, String requiredCourseCode) {}

  private record CurrentEnrollmentRow(String email, String courseCode, String role, String enrollmentStatus) {}

  private record EnrollmentCandidate(
      String email,
      String courseCode,
      String role,
      String enrollmentStatus,
      String source,
      String groupCode) {}
}
