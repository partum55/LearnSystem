package com.university.lms.course.web;

import com.university.lms.course.dto.AnnouncementDto;
import com.university.lms.course.dto.CreateAnnouncementRequest;
import com.university.lms.course.dto.UpdateAnnouncementRequest;
import com.university.lms.course.service.AnnouncementService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** REST controller for course announcements. */
@RestController
@RequestMapping("/courses/{courseId}/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

  private final AnnouncementService announcementService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  public ResponseEntity<List<AnnouncementDto>> getAnnouncements(@PathVariable UUID courseId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    List<AnnouncementDto> announcements =
        announcementService.getAnnouncements(courseId, userId, userRole);
    return ResponseEntity.ok(announcements);
  }

  @GetMapping("/{announcementId}")
  public ResponseEntity<AnnouncementDto> getAnnouncement(
      @PathVariable UUID courseId, @PathVariable UUID announcementId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    AnnouncementDto announcement =
        announcementService.getAnnouncement(courseId, announcementId, userId, userRole);
    return ResponseEntity.ok(announcement);
  }

  @PostMapping
  public ResponseEntity<AnnouncementDto> createAnnouncement(
      @PathVariable UUID courseId, @Valid @RequestBody CreateAnnouncementRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    AnnouncementDto announcement =
        announcementService.createAnnouncement(courseId, request, userId, userRole);
    return ResponseEntity.status(HttpStatus.CREATED).body(announcement);
  }

  @PutMapping("/{announcementId}")
  public ResponseEntity<AnnouncementDto> updateAnnouncement(
      @PathVariable UUID courseId,
      @PathVariable UUID announcementId,
      @Valid @RequestBody UpdateAnnouncementRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    AnnouncementDto announcement =
        announcementService.updateAnnouncement(courseId, announcementId, request, userId, userRole);
    return ResponseEntity.ok(announcement);
  }

  @DeleteMapping("/{announcementId}")
  public ResponseEntity<Void> deleteAnnouncement(
      @PathVariable UUID courseId, @PathVariable UUID announcementId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    announcementService.deleteAnnouncement(courseId, announcementId, userId, userRole);
    return ResponseEntity.noContent().build();
  }
}
