package com.university.lms.course.courses.service;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.dto.CourseMemberDto;
import com.university.lms.course.dto.EnrollUserRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.service.CourseMapper;
import java.util.Locale;
import java.util.UUID;
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

  @Transactional(readOnly = true)
  public PageResponse<CourseMemberDto> list(UUID courseId, CourseRole role, Pageable pageable, UUID userId) {
    accessService.requireTeacher(courseId, userId);
    Page<CourseMember> page = role == null
        ? courseMemberRepository.findByCourseId(courseId, pageable)
        : courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, role, pageable);
    return toPage(page);
  }

  @Transactional
  public CourseMemberDto upsert(UUID courseId, EnrollUserRequest request, UUID requestedBy) {
    accessService.requireTeacher(courseId, requestedBy);
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Course"));
    CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, request.getUserId())
        .orElseGet(() -> CourseMember.builder()
            .course(course)
            .userId(request.getUserId())
            .addedBy(requestedBy)
            .build());
    member.setRoleInCourse(request.getRoleInCourse());
    member.setStatus(CourseMemberStatus.ACTIVE);
    return courseMapper.toDto(courseMemberRepository.save(member));
  }

  @Transactional
  public void delete(UUID courseId, UUID userId, UUID requestedBy) {
    accessService.requireTeacher(courseId, requestedBy);
    courseMemberRepository.deleteByCourseIdAndUserId(courseId, userId);
  }

  public CourseRole parseRole(String role) {
    if (role == null || role.isBlank()) {
      return null;
    }
    return CourseRole.valueOf(role.trim().toUpperCase(Locale.ROOT));
  }

  private PageResponse<CourseMemberDto> toPage(Page<CourseMember> page) {
    return PageResponse.<CourseMemberDto>builder()
        .content(page.getContent().stream().map(courseMapper::toDto).toList())
        .pageNumber(page.getNumber())
        .pageSize(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .last(page.isLast())
        .build();
  }
}
