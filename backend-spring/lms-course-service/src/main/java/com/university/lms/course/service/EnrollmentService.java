package com.university.lms.course.service;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.dto.CourseMemberDto;
import com.university.lms.course.dto.EnrollUserRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service for managing course enrollments and memberships.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentService {

    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final CourseMapper courseMapper;

    /**
     * Enroll a user in a course.
     */
    @Transactional
    public CourseMemberDto enrollUser(UUID courseId, EnrollUserRequest request, UUID enrolledBy, String requesterRole) {
        log.info("Enrolling user {} in course {} with role {}", request.getUserId(), courseId, request.getRoleInCourse());

        Course course = findCourseById(courseId);
        enforceEnrollmentPermission(courseId, request.getUserId(), request.getRoleInCourse(), enrolledBy, requesterRole);

        // Check if user is already enrolled
        if (courseMemberRepository.existsByCourseIdAndUserId(courseId, request.getUserId())) {
            throw new ValidationException("User is already enrolled in this course");
        }

        // Check capacity for students
        if ("STUDENT".equals(request.getRoleInCourse())) {
            if (!course.hasCapacity()) {
                throw new ValidationException("Course has reached maximum capacity");
            }
        }

        // Check if course is published for student enrollment
        if ("STUDENT".equals(request.getRoleInCourse()) && !course.isActive()) {
            throw new ValidationException("Cannot enroll in unpublished course");
        }

        CourseMember member = CourseMember.builder()
            .course(course)
            .userId(request.getUserId())
            .roleInCourse(request.getRoleInCourse())
            .addedBy(enrolledBy)
            .enrollmentStatus("active")
            .build();

        CourseMember savedMember = courseMemberRepository.save(member);
        log.info("User {} enrolled successfully in course {}", request.getUserId(), courseId);

        return courseMapper.toDto(savedMember);
    }

    /**
     * Unenroll a user from a course.
     */
    @Transactional
    public void unenrollUser(UUID courseId, UUID userId, UUID requestedBy, String requesterRole) {
        log.info("Unenrolling user {} from course {}", userId, courseId);

        CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

        // Check permissions - user can unenroll themselves, or instructors can unenroll others
        if (!userId.equals(requestedBy)
                && !courseMemberRepository.canUserManageCourse(courseId, requestedBy)
                && !isSuperAdmin(requesterRole)) {
            throw new ValidationException("You don't have permission to unenroll this user");
        }

        // Don't allow unenrolling course owner
        if (member.getCourse().getOwnerId().equals(userId)) {
            throw new ValidationException("Cannot unenroll course owner");
        }

        courseMemberRepository.delete(member);
        log.info("User {} unenrolled successfully from course {}", userId, courseId);
    }

    /**
     * Drop enrollment (student initiated).
     */
    @Transactional
    public void dropEnrollment(UUID courseId, UUID userId) {
        log.info("User {} dropping enrollment from course {}", userId, courseId);

        CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

        if (!"STUDENT".equals(member.getRoleInCourse())) {
            throw new ValidationException("Only students can drop enrollment");
        }

        member.setEnrollmentStatus("dropped");
        courseMemberRepository.save(member);

        log.info("User {} dropped enrollment from course {}", userId, courseId);
    }

    /**
     * Complete enrollment.
     */
    @Transactional
    public void completeEnrollment(UUID courseId, UUID userId) {
        log.info("Completing enrollment for user {} in course {}", userId, courseId);

        CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

        member.setEnrollmentStatus("completed");
        member.setCompletionDate(LocalDateTime.now());
        courseMemberRepository.save(member);

        log.info("Enrollment completed for user {} in course {}", userId, courseId);
    }

    /**
     * Get course members.
     */
    public PageResponse<CourseMemberDto> getCourseMembers(UUID courseId, Pageable pageable, UUID requesterId, String requesterRole) {
        log.debug("Fetching members for course: {}", courseId);

        // Verify course exists
        findCourseById(courseId);
        enforceViewMembersPermission(courseId, requesterId, requesterRole);

        Page<CourseMember> memberPage = courseMemberRepository.findByCourseId(courseId, pageable);
        return mapToPageResponse(memberPage);
    }

    /**
     * Get course members by role.
     */
    public PageResponse<CourseMemberDto> getCourseMembers(UUID courseId, String role, Pageable pageable, UUID requesterId, String requesterRole) {
        log.debug("Fetching members for course: {} with role: {}", courseId, role);

        // Verify course exists
        findCourseById(courseId);
        enforceViewMembersPermission(courseId, requesterId, requesterRole);

        Page<CourseMember> memberPage = courseMemberRepository.findByCourseId(courseId, pageable);
        Page<CourseMember> filteredPage = memberPage.map(m ->
            m.getRoleInCourse().equals(role) ? m : null
        );

        return mapToPageResponse(filteredPage);
    }

    /**
     * Get user's enrollments.
     */
    public PageResponse<CourseMemberDto> getUserEnrollments(UUID userId, Pageable pageable) {
        log.debug("Fetching enrollments for user: {}", userId);

        Page<CourseMember> memberPage = courseMemberRepository.findByUserId(userId, pageable);
        return mapToPageResponse(memberPage);
    }

    /**
     * Get user's active enrollments.
     */
    public PageResponse<CourseMemberDto> getUserActiveEnrollments(UUID userId, Pageable pageable) {
        log.debug("Fetching active enrollments for user: {}", userId);

        Page<CourseMember> memberPage = courseMemberRepository.findActiveEnrollmentsForUser(userId, pageable);
        return mapToPageResponse(memberPage);
    }

    /**
     * Check if user is enrolled in course.
     */
    public boolean isUserEnrolled(UUID courseId, UUID userId) {
        return courseMemberRepository.existsByCourseIdAndUserId(courseId, userId);
    }

    /**
     * Get user's enrollment in a course.
     */
    public CourseMemberDto getEnrollment(UUID courseId, UUID userId, UUID requesterId, String requesterRole) {
        log.debug("Fetching enrollment for user {} in course {}", userId, courseId);
        if (!userId.equals(requesterId)
                && !courseMemberRepository.canUserManageCourse(courseId, requesterId)
                && !isSuperAdmin(requesterRole)) {
            throw new ValidationException("You don't have permission to view this enrollment");
        }

        CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

        return courseMapper.toDto(member);
    }

    public java.util.List<Long> getStudentIdsByCourseId(UUID courseId, UUID requesterId, String requesterRole) {
        enforceViewMembersPermission(courseId, requesterId, requesterRole);
        return courseMemberRepository.findStudentIdsByCourseId(courseId);
    }

    // Helper methods
    private Course findCourseById(UUID courseId) {
        return courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
    }

    private void enforceEnrollmentPermission(UUID courseId, UUID targetUserId, String targetRole, UUID requesterId, String requesterRole) {
        boolean isSelfEnrollment = requesterId.equals(targetUserId);
        boolean isInstructor = courseMemberRepository.canUserManageCourse(courseId, requesterId);
        boolean isAdmin = isSuperAdmin(requesterRole);

        if (isAdmin || isInstructor) {
            return;
        }

        if (!isSelfEnrollment) {
            throw new ValidationException("Only instructors or admins can enroll other users");
        }

        if (!"STUDENT".equals(targetRole)) {
            throw new ValidationException("Self-enrollment is only permitted for students");
        }
    }

    private void enforceViewMembersPermission(UUID courseId, UUID requesterId, String requesterRole) {
        if (isSuperAdmin(requesterRole)) {
            return;
        }
        if (!courseMemberRepository.canUserManageCourse(courseId, requesterId)) {
            throw new ValidationException("You don't have permission to view course members");
        }
    }

    private boolean isSuperAdmin(String requesterRole) {
        return requesterRole != null && requesterRole.equals("SUPERADMIN");
    }

    private PageResponse<CourseMemberDto> mapToPageResponse(Page<CourseMember> page) {
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
