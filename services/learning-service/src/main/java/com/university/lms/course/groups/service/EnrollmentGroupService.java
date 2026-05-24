package com.university.lms.course.groups.service;

import com.university.lms.course.domain.EnrollmentGroup;
import com.university.lms.course.domain.EnrollmentGroupMember;
import com.university.lms.course.dto.EnrollmentGroupDto;
import com.university.lms.course.dto.EnrollmentGroupMemberDto;
import com.university.lms.course.gradebook.service.UserProfileClient;
import com.university.lms.course.repository.EnrollmentGroupMemberRepository;
import com.university.lms.course.repository.EnrollmentGroupRepository;
import com.university.lms.course.web.RequestUserContext;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EnrollmentGroupService {

  private final EnrollmentGroupRepository groupRepository;
  private final EnrollmentGroupMemberRepository memberRepository;
  private final UserProfileClient userProfileClient;
  private final RequestUserContext requestUserContext;

  private void requireAdmin() {
    String role = requestUserContext.requireUserRole();
    if (!"ADMIN".equalsIgnoreCase(role)) {
      throw com.university.lms.course.common.error.ApiException.forbidden(
          "Only platform administrators can manage global enrollment groups");
    }
  }

  @Transactional(readOnly = true)
  public List<EnrollmentGroupDto> listAll() {
    return groupRepository.findAll().stream()
        .map(group -> {
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

  @Transactional(readOnly = true)
  public EnrollmentGroupDto getById(UUID groupId) {
    EnrollmentGroup group = groupRepository.findById(groupId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Group not found"));
    List<EnrollmentGroupMember> members = memberRepository.findByGroupId(group.getId());
    return EnrollmentGroupDto.builder()
        .id(group.getId())
        .name(group.getName())
        .createdAt(group.getCreatedAt())
        .updatedAt(group.getUpdatedAt())
        .memberCount(members.size())
        .build();
  }

  @Transactional
  public EnrollmentGroupDto createGroup(String name) {
    requireAdmin();
    if (name == null || name.strip().isEmpty()) {
      throw com.university.lms.course.common.error.ApiException.badRequest("INVALID_INPUT", "Group name is required");
    }
    String cleanName = name.strip();
    if (groupRepository.existsByNameIgnoreCase(cleanName)) {
      throw com.university.lms.course.common.error.ApiException.badRequest("ALREADY_EXISTS", "Group with this name already exists");
    }
    EnrollmentGroup group = EnrollmentGroup.builder()
        .name(cleanName)
        .build();
    EnrollmentGroup saved = groupRepository.save(group);
    return EnrollmentGroupDto.builder()
        .id(saved.getId())
        .name(saved.getName())
        .createdAt(saved.getCreatedAt())
        .updatedAt(saved.getUpdatedAt())
        .memberCount(0)
        .build();
  }

  @Transactional
  public void deleteGroup(UUID groupId) {
    requireAdmin();
    if (!groupRepository.existsById(groupId)) {
      throw com.university.lms.course.common.error.ApiException.notFound("Group not found");
    }
    groupRepository.deleteById(groupId);
  }

  @Transactional(readOnly = true)
  public List<EnrollmentGroupMemberDto> getGroupMembers(UUID groupId) {
    if (!groupRepository.existsById(groupId)) {
      throw com.university.lms.course.common.error.ApiException.notFound("Group not found");
    }
    List<EnrollmentGroupMember> members = memberRepository.findByGroupId(groupId);
    return members.stream()
        .map(m -> {
          EnrollmentGroupMemberDto dto = EnrollmentGroupMemberDto.builder()
              .id(m.getId())
              .groupId(m.getGroup().getId())
              .userId(m.getUserId())
              .createdAt(m.getCreatedAt())
              .build();

          userProfileClient.findProfile(m.getUserId()).ifPresent(profile -> {
            dto.setUserName(profile.displayName());
            dto.setUserEmail(profile.email());
          });

          return dto;
        })
        .toList();
  }

  @Transactional
  public EnrollmentGroupMemberDto addGroupMember(UUID groupId, String email) {
    requireAdmin();
    EnrollmentGroup group = groupRepository.findById(groupId)
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("Group not found"));

    if (email == null || email.strip().isEmpty()) {
      throw com.university.lms.course.common.error.ApiException.badRequest("INVALID_INPUT", "Email is required");
    }

    UserProfileClient.UserProfile profile = userProfileClient.findProfileByEmail(email.strip())
        .orElseThrow(() -> com.university.lms.course.common.error.ApiException.notFound("User not found with email: " + email));

    if (memberRepository.existsByGroupIdAndUserId(groupId, profile.id())) {
      throw com.university.lms.course.common.error.ApiException.badRequest("ALREADY_EXISTS", "User is already a member of this group");
    }

    EnrollmentGroupMember member = EnrollmentGroupMember.builder()
        .group(group)
        .userId(profile.id())
        .build();
    EnrollmentGroupMember saved = memberRepository.save(member);

    return EnrollmentGroupMemberDto.builder()
        .id(saved.getId())
        .groupId(saved.getGroup().getId())
        .userId(saved.getUserId())
        .userName(profile.displayName())
        .userEmail(profile.email())
        .createdAt(saved.getCreatedAt())
        .build();
  }

  @Transactional
  public void removeGroupMember(UUID groupId, UUID userId) {
    requireAdmin();
    if (!groupRepository.existsById(groupId)) {
      throw com.university.lms.course.common.error.ApiException.notFound("Group not found");
    }
    memberRepository.deleteByGroupIdAndUserId(groupId, userId);
  }
}
