package com.university.lms.submission.service;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.submission.domain.Submission;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.UUID;

/**
 * Authorization checks for submission operations.
 */
@Component
public class SubmissionAccessService {

    public void assertCanAccess(Submission submission, UUID requesterId, String requesterRole) {
        if (requesterId == null && !StringUtils.hasText(requesterRole)) {
            // Internal service-to-service read where no end-user context is propagated.
            return;
        }

        if (isStaff(requesterRole)) {
            return;
        }

        if (requesterId == null || !submission.getUserId().equals(requesterId)) {
            throw new ValidationException("You do not have access to this submission");
        }
    }

    public void assertOwnerOrStaff(Submission submission, UUID requesterId, String requesterRole) {
        if (isStaff(requesterRole)) {
            return;
        }

        if (!submission.getUserId().equals(requesterId)) {
            throw new ValidationException("Only submission owner or teaching staff can perform this action");
        }
    }

    public void assertStaff(String requesterRole, String errorMessage) {
        if (!isStaff(requesterRole)) {
            throw new ValidationException(errorMessage);
        }
    }

    public boolean isStaff(String role) {
        if (!StringUtils.hasText(role)) {
            return false;
        }

        String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
        return "TEACHER".equals(normalizedRole)
                || "TA".equals(normalizedRole)
                || "SUPERADMIN".equals(normalizedRole);
    }
}
