package com.university.lms.course.groups.service;

import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.*;
import com.university.lms.course.dto.EnrollmentGroupDto;
import com.university.lms.course.repository.*;
import com.university.lms.course.web.RequestUserContext;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseGroupService {

  private final CourseRepository courseRepository;
  private final EnrollmentGroupRepository groupRepository;
  private final EnrollmentGroupMemberRepository memberRepository;
  private final CourseGroupRepository courseGroupRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseAccessService accessService;
  private final RequestUserContext requestUserContext;

  @Transactional(readOnly = true)
  public List<EnrollmentGroupDto> listCourseGroups(UUID courseId) {
    accessService.requireCourseAccess(courseId, requestUserContext.requireUserId());
    return courseGroupRepository.findByCourseId(courseId).stream()
        .map(cg -> {
          EnrollmentGroup group = cg.getGroup();
          List<EnrollmentGroupMember> members = memberRepository.findByGroupId(group.getId());
          return EnrollmentGroupDto.builder()
              .id(group.getId())
              .name(group.getName())
              .createdAt(group.getCreatedAt())
              .updatedAt(group.getUpdatedAt())
              .memberCount(members.size())
              .build();
        })
        .toList();
  }

  @Transactional
  public void enrollGroupToCourse(UUID courseId, UUID groupId) {
    UUID requesterId = requestUserContext.requireUserId();
    accessService.requireTeacherMutation(courseId, requesterId);

    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Course not found"));
    EnrollmentGroup group = groupRepository.findById(groupId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Group not found"));

    if (courseGroupRepository.existsByCourseIdAndGroupId(courseId, groupId)) {
      throw com.university.lms.course.common.error.ApiException.badRequest("ALREADY_EXISTS", "Group is already enrolled in this course");
    }

    CourseGroup cg = CourseGroup.builder()
        .course(course)
        .group(group)
        .build();
    courseGroupRepository.save(cg);

    List<EnrollmentGroupMember> members = memberRepository.findByGroupId(groupId);
    for (EnrollmentGroupMember egm : members) {
      if (!courseMemberRepository.existsByCourseIdAndUserId(courseId, egm.getUserId())) {
        CourseMember cm = CourseMember.builder()
            .course(course)
            .userId(egm.getUserId())
            .roleInCourse(CourseRole.STUDENT)
            .status(CourseMemberStatus.ACTIVE)
            .addedBy(requesterId)
            .build();
        courseMemberRepository.save(cm);
      } else {
        courseMemberRepository.findByCourseIdAndUserId(courseId, egm.getUserId()).ifPresent(cm -> {
          if (cm.getStatus() != CourseMemberStatus.ACTIVE) {
            cm.setStatus(CourseMemberStatus.ACTIVE);
            courseMemberRepository.save(cm);
          }
        });
      }
    }
  }

  @Transactional
  public void unenrollGroupFromCourse(UUID courseId, UUID groupId) {
    UUID requesterId = requestUserContext.requireUserId();
    accessService.requireTeacherMutation(courseId, requesterId);

    if (!courseGroupRepository.existsByCourseIdAndGroupId(courseId, groupId)) {
      throw com.university.lms.course.common.error.ApiException.notFound("Group enrollment not found in this course");
    }

    courseGroupRepository.deleteByCourseIdAndGroupId(courseId, groupId);
  }
}
