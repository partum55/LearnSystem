package com.university.lms.course.groups.controller;

import com.university.lms.course.dto.EnrollmentGroupDto;
import com.university.lms.course.dto.EnrollmentGroupMemberDto;
import com.university.lms.course.groups.service.EnrollmentGroupService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/enrollment-groups")
@RequiredArgsConstructor
public class EnrollmentGroupController {

  private final EnrollmentGroupService groupService;

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<EnrollmentGroupDto>> listAllGroups() {
    return ResponseEntity.ok(groupService.listAll());
  }

  @GetMapping("/{groupId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<EnrollmentGroupDto> getGroupById(@PathVariable UUID groupId) {
    return ResponseEntity.ok(groupService.getById(groupId));
  }

  @PostMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<EnrollmentGroupDto> createGroup(@RequestBody Map<String, String> payload) {
    String name = payload.get("name");
    return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(name));
  }

  @DeleteMapping("/{groupId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> deleteGroup(@PathVariable UUID groupId) {
    groupService.deleteGroup(groupId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{groupId}/members")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<EnrollmentGroupMemberDto>> getGroupMembers(@PathVariable UUID groupId) {
    return ResponseEntity.ok(groupService.getGroupMembers(groupId));
  }

  @PostMapping("/{groupId}/members")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<EnrollmentGroupMemberDto> addGroupMember(
      @PathVariable UUID groupId, @RequestBody Map<String, String> payload) {
    String email = payload.get("email");
    return ResponseEntity.status(HttpStatus.CREATED).body(groupService.addGroupMember(groupId, email));
  }

  @DeleteMapping("/{groupId}/members/{userId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> removeGroupMember(
      @PathVariable UUID groupId, @PathVariable UUID userId) {
    groupService.removeGroupMember(groupId, userId);
    return ResponseEntity.noContent().build();
  }
}
