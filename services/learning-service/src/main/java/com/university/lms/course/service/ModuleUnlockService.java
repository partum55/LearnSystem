package com.university.lms.course.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.domain.Module;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Resolves conditional unlock rules for course modules. */
@Service
@RequiredArgsConstructor
public class ModuleUnlockService {

  private static final String META_UNLOCK_AFTER_MODULE_ID = "unlockAfterModuleId";
  private static final String META_UNLOCK_REQUIRED_COMPLETION_PERCENT =
      "unlockRequiredCompletionPercent";

  private final ModuleRepository moduleRepository;
  private final AssignmentRepository assignmentRepository;
  private final SubmissionRepository submissionRepository;

  /** Computes unlock state for all published modules in a course for a specific student. */
  public Map<UUID, Boolean> resolveUnlockStates(UUID courseId, UUID studentId) {
    List<Module> publishedModules = moduleRepository.findPublishedModulesByCourse(courseId);
    return resolveUnlockStates(publishedModules, studentId);
  }

  /** Computes unlock state for a specific set of published modules for a student. */
  public Map<UUID, Boolean> resolveUnlockStates(List<Module> publishedModules, UUID studentId) {
    Map<UUID, Module> modulesById = new HashMap<>();
    for (Module module : publishedModules) {
      modulesById.put(module.getId(), module);
    }

    Map<UUID, Boolean> states = new HashMap<>();
    for (Module module : publishedModules) {
      states.put(module.getId(), isUnlocked(module, studentId, modulesById, states));
    }
    return states;
  }

  /** Returns true when module is currently unlocked for student. */
  public boolean isUnlocked(Module module, UUID studentId) {
    List<Module> publishedModules =
        moduleRepository.findPublishedModulesByCourse(module.getCourse().getId());
    Map<UUID, Module> modulesById = new HashMap<>();
    for (Module candidate : publishedModules) {
      modulesById.put(candidate.getId(), candidate);
    }
    return isUnlocked(module, studentId, modulesById, new HashMap<>());
  }

  private boolean isUnlocked(
      Module module,
      UUID studentId,
      Map<UUID, Module> modulesById,
      Map<UUID, Boolean> alreadyComputed) {
    Map<String, Object> metadata = module.getContentMeta();
    if (metadata == null || metadata.isEmpty()) {
      return true;
    }

    UUID dependencyModuleId = readUuid(metadata.get(META_UNLOCK_AFTER_MODULE_ID));
    if (dependencyModuleId == null) {
      return true;
    }

    Module dependency = modulesById.get(dependencyModuleId);
    if (dependency == null) {
      return true;
    }

    if (alreadyComputed.containsKey(dependencyModuleId)
        && !Boolean.TRUE.equals(alreadyComputed.get(dependencyModuleId))) {
      return false;
    }

    double requiredPercent =
        readDouble(metadata.get(META_UNLOCK_REQUIRED_COMPLETION_PERCENT), 100.0d);
    double completionPercent = calculateModuleCompletionPercent(dependency.getId(), studentId);
    return completionPercent >= requiredPercent;
  }

  private double calculateModuleCompletionPercent(UUID moduleId, UUID studentId) {
    List<Assignment> assignments = assignmentRepository.findByModuleIdOrderByPositionAsc(moduleId);
    List<Assignment> requiredAssignments =
        assignments.stream().filter(Assignment::requiresSubmission).toList();
    if (requiredAssignments.isEmpty()) {
      return 100.0d;
    }

    List<UUID> assignmentIds = requiredAssignments.stream().map(Assignment::getId).toList();
    Collection<Submission> submissions =
        submissionRepository.findByAssignmentIdInAndUserId(assignmentIds, studentId);

    Set<UUID> completedAssignmentIds = new HashSet<>();
    for (Submission submission : submissions) {
      if (isCompletedSubmissionStatus(submission.getStatus())) {
        completedAssignmentIds.add(submission.getAssignmentId());
      }
    }

    double completedCount = requiredAssignments.stream().filter(a -> completedAssignmentIds.contains(a.getId())).count();
    return (completedCount / requiredAssignments.size()) * 100.0d;
  }

  private boolean isCompletedSubmissionStatus(String status) {
    if (status == null) {
      return false;
    }
    String normalized = status.trim().toUpperCase();
    return "SUBMITTED".equals(normalized)
        || "IN_REVIEW".equals(normalized)
        || "GRADED".equals(normalized)
        || "GRADED_DRAFT".equals(normalized)
        || "GRADED_PUBLISHED".equals(normalized);
  }

  private UUID readUuid(Object value) {
    if (value == null) {
      return null;
    }
    try {
      return UUID.fromString(String.valueOf(value));
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  private double readDouble(Object value, double fallback) {
    if (value == null) {
      return fallback;
    }
    if (value instanceof Number number) {
      return number.doubleValue();
    }
    try {
      return Double.parseDouble(String.valueOf(value));
    } catch (NumberFormatException ex) {
      return fallback;
    }
  }
}
