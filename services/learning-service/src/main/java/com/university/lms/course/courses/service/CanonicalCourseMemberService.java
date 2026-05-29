package com.university.lms.course.courses.service;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.dto.*;
import com.university.lms.course.gradebook.service.UserProfileClient;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.service.CourseMapper;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CanonicalCourseMemberService {

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseMapper courseMapper;
  private final CourseAccessService accessService;
  private final UserProfileClient userProfileClient;

  @Transactional(readOnly = true)
  public PageResponse<CourseMemberDto> list(UUID courseId, CourseRole role, Pageable pageable, UUID userId) {
    accessService.requireCanViewMembers(courseId);
    Page<CourseMember> page = role == null
        ? courseMemberRepository.findByCourseId(courseId, pageable)
        : courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, role, pageable);
    return toPage(page);
  }

  @Transactional
  public CourseMemberDto upsert(UUID courseId, EnrollUserRequest request, UUID requestedBy) {
    accessService.requireTeacherMutation(courseId, requestedBy);
    // 1. Enforce strict role validation rules
    boolean isAdmin = accessService.canOwn(courseId, requestedBy) || isGlobalAdmin(requestedBy);
    CourseRole requesterRole = null;
    
    if (!isAdmin) {
      CourseMember requesterMember = courseMemberRepository.findByCourseIdAndUserId(courseId, requestedBy)
          .filter(CourseMember::isActive)
          .orElseThrow(() -> com.university.lms.course.common.error.ApiException.forbidden("You are not enrolled in this course"));
      requesterRole = requesterMember.getRoleInCourse();

      if (requesterRole == CourseRole.TA || requesterRole == CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden("You do not have permission to manage course members");
      }
    }

    UUID targetUserId = request.getUserId();
    if (targetUserId == null) {
      if (request.getEmail() == null || request.getEmail().strip().isEmpty()) {
        throw com.university.lms.course.common.error.ApiException.badRequest("INVALID_INPUT", "User ID or Email is required");
      }
      UserProfileClient.UserProfile profile = userProfileClient.findProfileByEmail(request.getEmail().strip())
          .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("User not found with email: " + request.getEmail()));
      targetUserId = profile.id();
    }

    CourseRole targetRole = request.getRoleInCourse();
    if (targetRole == null) {
      targetRole = CourseRole.STUDENT;
    }

    final UUID finalTargetUserId = targetUserId;

    // A Teacher can ONLY manage STUDENT members
    if (!isAdmin && requesterRole == CourseRole.TEACHER) {
      if (targetRole != CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden(
            "Teachers can only manage student enrollments, not teaching staff (OWNER, TEACHER, TA)");
      }
      
      // If target user is already enrolled, make sure they aren't staff
      Optional<CourseMember> existingOpt = courseMemberRepository.findByCourseIdAndUserId(courseId, finalTargetUserId);
      if (existingOpt.isPresent() && existingOpt.get().getRoleInCourse() != CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden(
            "Teachers cannot modify teaching staff enrollments (OWNER, TEACHER, TA)");
      }
    }

    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Course"));

    CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, finalTargetUserId)
        .orElseGet(() -> CourseMember.builder()
            .course(course)
            .userId(finalTargetUserId)
            .addedBy(requestedBy)
            .build());

    member.setRoleInCourse(targetRole);
    member.setStatus(CourseMemberStatus.ACTIVE);

    CourseMemberDto dto = courseMapper.toDto(courseMemberRepository.save(member));
    userProfileClient.findProfile(dto.getUserId()).ifPresent(profile -> {
      dto.setUserName(profile.displayName());
      dto.setUserEmail(profile.email());
    });
    return dto;
  }

  @Transactional
  public void delete(UUID courseId, UUID userId, UUID requestedBy) {
    accessService.requireTeacherMutation(courseId, requestedBy);
    // 1. Enforce role validation rules
    boolean isAdmin = accessService.canOwn(courseId, requestedBy) || isGlobalAdmin(requestedBy);
    CourseRole requesterRole = null;

    if (!isAdmin) {
      CourseMember requesterMember = courseMemberRepository.findByCourseIdAndUserId(courseId, requestedBy)
          .filter(CourseMember::isActive)
          .orElseThrow(() -> com.university.lms.course.common.error.ApiException.forbidden("You are not enrolled in this course"));
      requesterRole = requesterMember.getRoleInCourse();

      if (requesterRole == CourseRole.TA || requesterRole == CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden("You do not have permission to manage course members");
      }
    }

    CourseMember targetMember = courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Course member not found"));

    // A Teacher can ONLY manage STUDENT members
    if (!isAdmin && requesterRole == CourseRole.TEACHER) {
      if (targetMember.getRoleInCourse() != CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden(
            "Teachers can only unenroll students, not teaching staff (OWNER, TEACHER, TA)");
      }
    }

    courseMemberRepository.deleteByCourseIdAndUserId(courseId, userId);
  }

  @Transactional(readOnly = true)
  public BulkPreviewResponse bulkPreview(UUID courseId, BulkPreviewRequest request, UUID requestedBy) {
    accessService.requireTeacherMutation(courseId, requestedBy);
    // 1. Authenticate and enforce permission check
    boolean isAdmin = accessService.canOwn(courseId, requestedBy) || isGlobalAdmin(requestedBy);
    CourseRole requesterRole = null;

    if (!isAdmin) {
      CourseMember requesterMember = courseMemberRepository.findByCourseIdAndUserId(courseId, requestedBy)
          .filter(CourseMember::isActive)
          .orElseThrow(() -> com.university.lms.course.common.error.ApiException.forbidden("You are not enrolled in this course"));
      requesterRole = requesterMember.getRoleInCourse();

      if (requesterRole == CourseRole.TA || requesterRole == CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden("You do not have permission to perform bulk enrollments");
      }
    }

    List<BulkPreviewResponse.RowResult> validRows = new ArrayList<>();
    List<BulkPreviewResponse.RowResult> invalidRows = new ArrayList<>();
    Set<String> processedEmails = new HashSet<>();

    // Normalize and batch fetch profiles
    List<String> emails = request.getRows().stream()
        .map(r -> r.getEmail().strip().toLowerCase(Locale.ROOT))
        .distinct()
        .toList();

    List<UserProfileClient.UserProfile> profiles = userProfileClient.findProfilesByEmails(emails);
    Map<String, UserProfileClient.UserProfile> profileMap = profiles.stream()
        .collect(Collectors.toMap(
            p -> p.email().toLowerCase(Locale.ROOT),
            p -> p,
            (a, b) -> a
        ));

    // Batch fetch existing course members
    List<UUID> userIds = profiles.stream().map(UserProfileClient.UserProfile::id).toList();
    List<CourseMember> existingMembers = courseMemberRepository.findByCourseIdAndUserIdIn(courseId, userIds);
    Map<UUID, CourseMember> existingMap = existingMembers.stream()
        .collect(Collectors.toMap(CourseMember::getUserId, m -> m));

    for (BulkPreviewRequest.Row row : request.getRows()) {
      String rawEmail = row.getEmail();
      String cleanEmail = rawEmail.strip().toLowerCase(Locale.ROOT);
      
      String rowRoleStr = row.getRole();
      if (rowRoleStr == null || rowRoleStr.strip().isEmpty()) {
        rowRoleStr = "STUDENT";
      } else {
        rowRoleStr = rowRoleStr.strip().toUpperCase(Locale.ROOT);
      }

      BulkPreviewResponse.RowResult result = BulkPreviewResponse.RowResult.builder()
          .email(rawEmail)
          .role(rowRoleStr)
          .build();

      // Check duplicates in the CSV
      if (processedEmails.contains(cleanEmail)) {
        result.setStatus("INVALID");
        result.setReason("DUPLICATE_IN_CSV");
        invalidRows.add(result);
        continue;
      }
      processedEmails.add(cleanEmail);

      // Check if user exists
      UserProfileClient.UserProfile profile = profileMap.get(cleanEmail);
      if (profile == null) {
        result.setStatus("INVALID");
        result.setReason("NOT_FOUND");
        invalidRows.add(result);
        continue;
      }

      result.setUserId(profile.id());
      result.setUserName(profile.displayName());

      // Validation check for OWNER role
      if ("OWNER".equals(rowRoleStr)) {
        result.setStatus("INVALID");
        result.setReason("OWNER_NOT_ALLOWED");
        invalidRows.add(result);
        continue;
      }

      // Teacher role restrictions
      if (!isAdmin && requesterRole == CourseRole.TEACHER && !"STUDENT".equals(rowRoleStr)) {
        result.setStatus("INVALID");
        result.setReason("ROLE_CONFLICT");
        invalidRows.add(result);
        continue;
      }

      // Check existing members
      CourseMember existing = existingMap.get(profile.id());
      if (existing != null && existing.getStatus() == CourseMemberStatus.ACTIVE) {
        String existingRoleStr = existing.getRoleInCourse().name();
        if (existingRoleStr.equals(rowRoleStr)) {
          result.setStatus("INVALID");
          result.setReason("ALREADY_ENROLLED");
        } else {
          result.setStatus("INVALID");
          result.setReason("ROLE_CONFLICT");
        }
        invalidRows.add(result);
      } else {
        result.setStatus("VALID");
        validRows.add(result);
      }
    }

    return BulkPreviewResponse.builder()
        .validRows(validRows)
        .invalidRows(invalidRows)
        .hasErrors(!invalidRows.isEmpty())
        .build();
  }

  @Transactional
  public List<CourseMemberDto> bulkConfirm(UUID courseId, BulkConfirmRequest request, UUID requestedBy) {
    accessService.requireTeacherMutation(courseId, requestedBy);
    boolean isAdmin = accessService.canOwn(courseId, requestedBy) || isGlobalAdmin(requestedBy);
    CourseRole requesterRole = null;

    if (!isAdmin) {
      CourseMember requesterMember = courseMemberRepository.findByCourseIdAndUserId(courseId, requestedBy)
          .filter(CourseMember::isActive)
          .orElseThrow(() -> com.university.lms.course.common.error.ApiException.forbidden("You are not enrolled in this course"));
      requesterRole = requesterMember.getRoleInCourse();

      if (requesterRole == CourseRole.TA || requesterRole == CourseRole.STUDENT) {
        throw com.university.lms.course.common.error.ApiException.forbidden("You do not have permission to confirm bulk enrollments");
      }
    }

    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Course not found"));

    List<CourseMemberDto> result = new ArrayList<>();
    for (BulkConfirmRequest.Enrollment enrollment : request.getEnrollments()) {
      String targetRoleStr = enrollment.getRole();
      if (targetRoleStr == null) {
        targetRoleStr = "STUDENT";
      } else {
        targetRoleStr = targetRoleStr.strip().toUpperCase(Locale.ROOT);
      }

      if ("OWNER".equals(targetRoleStr)) {
        throw com.university.lms.course.common.error.ApiException.badRequest("INVALID_INPUT", "OWNER role is not permitted via CSV enrollment");
      }

      if (!isAdmin && requesterRole == CourseRole.TEACHER && !"STUDENT".equals(targetRoleStr)) {
        throw com.university.lms.course.common.error.ApiException.forbidden("Teachers can only enroll student members");
      }

      CourseRole targetRole = CourseRole.valueOf(targetRoleStr);
      UserProfileClient.UserProfile profile = userProfileClient.findProfile(enrollment.getUserId())
          .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("User not found with ID: " + enrollment.getUserId()));

      CourseMember cm = courseMemberRepository.findByCourseIdAndUserId(courseId, enrollment.getUserId())
          .orElseGet(() -> CourseMember.builder()
              .course(course)
              .userId(enrollment.getUserId())
              .addedBy(requestedBy)
              .build());

      cm.setRoleInCourse(targetRole);
      cm.setStatus(CourseMemberStatus.ACTIVE);
      CourseMember saved = courseMemberRepository.save(cm);

      CourseMemberDto dto = courseMapper.toDto(saved);
      dto.setUserName(profile.displayName());
      dto.setUserEmail(profile.email());
      result.add(dto);
    }

    return result;
  }

  public CourseRole parseRole(String role) {
    if (role == null || role.isBlank()) {
      return null;
    }
    return CourseRole.valueOf(role.trim().toUpperCase(Locale.ROOT));
  }

  private boolean isGlobalAdmin(UUID userId) {
    try {
      Optional<UserProfileClient.UserProfile> profile = userProfileClient.findProfile(userId);
      return profile.isPresent() && "ADMIN".equalsIgnoreCase(profile.get().role());
    } catch (Exception e) {
      return false;
    }
  }

  private PageResponse<CourseMemberDto> toPage(Page<CourseMember> page) {
    List<CourseMemberDto> dtos = page.getContent().stream()
        .map(courseMapper::toDto)
        .toList();

    for (CourseMemberDto dto : dtos) {
      if (dto.getUserId() != null) {
        userProfileClient.findProfile(dto.getUserId()).ifPresent(profile -> {
          dto.setUserName(profile.displayName());
          dto.setUserEmail(profile.email());
        });
      }
    }

    return PageResponse.<CourseMemberDto>builder()
        .content(dtos)
        .pageNumber(page.getNumber())
        .pageSize(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .last(page.isLast())
        .build();
  }
}
