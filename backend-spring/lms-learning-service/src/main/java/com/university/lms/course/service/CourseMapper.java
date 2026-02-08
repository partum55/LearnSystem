package com.university.lms.course.service;

import com.university.lms.course.domain.*;
import com.university.lms.course.dto.*;
import org.springframework.stereotype.Component;

/**
 * Mapper for Course-related entities and DTOs. Using manual mapping for better control and clarity.
 */
@Component
public class CourseMapper {

  public CourseDto toDto(Course course) {
    if (course == null) {
      return null;
    }

    return CourseDto.builder()
        .id(course.getId())
        .code(course.getCode())
        .titleUk(course.getTitleUk())
        .titleEn(course.getTitleEn())
        .descriptionUk(course.getDescriptionUk())
        .descriptionEn(course.getDescriptionEn())
        .syllabus(course.getSyllabus())
        .ownerId(course.getOwnerId())
        .visibility(course.getVisibility())
        .thumbnailUrl(course.getThumbnailUrl())
        .startDate(course.getStartDate())
        .endDate(course.getEndDate())
        .academicYear(course.getAcademicYear())
        .departmentId(course.getDepartmentId())
        .maxStudents(course.getMaxStudents())
        .currentEnrollment(course.getCurrentEnrollment())
        .status(course.getStatus())
        .isPublished(course.getIsPublished())
        .createdAt(course.getCreatedAt())
        .updatedAt(course.getUpdatedAt())
        .hasCapacity(course.hasCapacity())
        .isActive(course.isActive())
        .moduleCount(course.getModules() != null ? course.getModules().size() : 0)
        .memberCount(course.getMembers() != null ? course.getMembers().size() : 0)
        .build();
  }

  public Course toEntity(CreateCourseRequest request, java.util.UUID ownerId) {
    if (request == null) {
      return null;
    }

    return Course.builder()
        .code(request.getCode())
        .titleUk(request.getTitleUk())
        .titleEn(request.getTitleEn())
        .descriptionUk(request.getDescriptionUk())
        .descriptionEn(request.getDescriptionEn())
        .syllabus(request.getSyllabus())
        .ownerId(ownerId)
        .visibility(
            request.getVisibility() != null
                ? request.getVisibility()
                : com.university.lms.common.domain.CourseVisibility.DRAFT)
        .thumbnailUrl(request.getThumbnailUrl())
        .startDate(request.getStartDate())
        .endDate(request.getEndDate())
        .academicYear(request.getAcademicYear())
        .departmentId(request.getDepartmentId())
        .maxStudents(request.getMaxStudents())
        .status(
            request.getStatus() != null
                ? request.getStatus()
                : com.university.lms.common.domain.CourseStatus.DRAFT)
        .isPublished(request.getIsPublished() != null ? request.getIsPublished() : false)
        .build();
  }

  public void updateEntityFromDto(Course course, UpdateCourseRequest request) {
    if (request == null) {
      return;
    }

    if (request.getTitleUk() != null) course.setTitleUk(request.getTitleUk());
    if (request.getTitleEn() != null) course.setTitleEn(request.getTitleEn());
    if (request.getDescriptionUk() != null) course.setDescriptionUk(request.getDescriptionUk());
    if (request.getDescriptionEn() != null) course.setDescriptionEn(request.getDescriptionEn());
    if (request.getSyllabus() != null) course.setSyllabus(request.getSyllabus());
    if (request.getVisibility() != null) course.setVisibility(request.getVisibility());
    if (request.getThumbnailUrl() != null) course.setThumbnailUrl(request.getThumbnailUrl());
    if (request.getStartDate() != null) course.setStartDate(request.getStartDate());
    if (request.getEndDate() != null) course.setEndDate(request.getEndDate());
    if (request.getAcademicYear() != null) course.setAcademicYear(request.getAcademicYear());
    if (request.getDepartmentId() != null) course.setDepartmentId(request.getDepartmentId());
    if (request.getMaxStudents() != null) course.setMaxStudents(request.getMaxStudents());
    if (request.getStatus() != null) course.setStatus(request.getStatus());
    if (request.getIsPublished() != null) course.setIsPublished(request.getIsPublished());
  }

  public CourseMemberDto toDto(CourseMember member) {
    if (member == null) {
      return null;
    }

    return CourseMemberDto.builder()
        .id(member.getId())
        .courseId(member.getCourse().getId())
        .courseCode(member.getCourse().getCode())
        .courseTitle(member.getCourse().getTitleUk())
        .userId(member.getUserId())
        .roleInCourse(member.getRoleInCourse())
        .addedBy(member.getAddedBy())
        .addedAt(member.getAddedAt())
        .updatedAt(member.getUpdatedAt())
        .enrollmentStatus(member.getEnrollmentStatus())
        .completionDate(member.getCompletionDate())
        .finalGrade(member.getFinalGrade())
        .build();
  }

  public ModuleDto toDto(com.university.lms.course.domain.Module module) {
    if (module == null) {
      return null;
    }

    ModuleDto dto =
        ModuleDto.builder()
            .id(module.getId())
            .courseId(module.getCourse().getId())
            .title(module.getTitle())
            .description(module.getDescription())
            .position(module.getPosition())
            .contentMeta(module.getContentMeta())
            .isPublished(module.getIsPublished())
            .publishDate(module.getPublishDate())
            .createdAt(module.getCreatedAt())
            .updatedAt(module.getUpdatedAt())
            .resourceCount(module.getResources() != null ? module.getResources().size() : 0)
            .isAvailable(module.isAvailable())
            .build();

    // Optionally include resources if loaded
    if (module.getResources() != null && !module.getResources().isEmpty()) {
      dto.setResources(module.getResources().stream().map(this::toDto).toList());
    }

    return dto;
  }

  public ResourceDto toDto(Resource resource) {
    if (resource == null) {
      return null;
    }

    return ResourceDto.builder()
        .id(resource.getId())
        .moduleId(resource.getModule().getId())
        .title(resource.getTitle())
        .description(resource.getDescription())
        .resourceType(resource.getResourceType())
        .fileUrl(resource.getFileUrl())
        .externalUrl(resource.getExternalUrl())
        .fileSize(resource.getFileSize())
        .mimeType(resource.getMimeType())
        .position(resource.getPosition())
        .isDownloadable(resource.getIsDownloadable())
        .textContent(resource.getTextContent())
        .metadata(resource.getMetadata())
        .createdAt(resource.getCreatedAt())
        .updatedAt(resource.getUpdatedAt())
        .build();
  }
}
