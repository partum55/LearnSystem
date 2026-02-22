package com.university.lms.submission.service;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.submission.domain.Submission;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubmissionAccessServiceTest {

    private final SubmissionAccessService accessService = new SubmissionAccessService();

    @Test
    void assertCanAccessShouldAllowInternalContextWithoutRequester() {
        Submission submission = submissionOwnedBy(UUID.randomUUID());

        assertThatCode(() -> accessService.assertCanAccess(submission, null, null))
                .doesNotThrowAnyException();
    }

    @Test
    void assertCanAccessShouldAllowStaffRequester() {
        Submission submission = submissionOwnedBy(UUID.randomUUID());

        assertThatCode(() -> accessService.assertCanAccess(submission, UUID.randomUUID(), "TEACHER"))
                .doesNotThrowAnyException();
    }

    @Test
    void assertCanAccessShouldRejectDifferentStudent() {
        Submission submission = submissionOwnedBy(UUID.randomUUID());

        assertThatThrownBy(() -> accessService.assertCanAccess(submission, UUID.randomUUID(), "STUDENT"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("do not have access");
    }

    @Test
    void assertOwnerOrStaffShouldAllowOwner() {
        UUID ownerId = UUID.randomUUID();
        Submission submission = submissionOwnedBy(ownerId);

        assertThatCode(() -> accessService.assertOwnerOrStaff(submission, ownerId, "STUDENT"))
                .doesNotThrowAnyException();
    }

    @Test
    void assertOwnerOrStaffShouldRejectNonOwnerStudent() {
        Submission submission = submissionOwnedBy(UUID.randomUUID());

        assertThatThrownBy(() -> accessService.assertOwnerOrStaff(submission, UUID.randomUUID(), "STUDENT"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("submission owner");
    }

    private static Submission submissionOwnedBy(UUID userId) {
        return Submission.builder()
                .assignmentId(UUID.randomUUID())
                .userId(userId)
                .status("DRAFT")
                .build();
    }
}
