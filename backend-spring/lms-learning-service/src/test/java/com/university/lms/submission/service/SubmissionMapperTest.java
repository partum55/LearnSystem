package com.university.lms.submission.service;

import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionComment;
import com.university.lms.submission.domain.SubmissionFile;
import com.university.lms.submission.dto.SubmissionResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SubmissionMapperTest {

    private final SubmissionMapper mapper = new SubmissionMapper();

    @Test
    void toResponseShouldMapFilesAndCommentsAndDeriveFallbackName() {
        Submission submission = Submission.builder()
                .id(UUID.randomUUID())
                .assignmentId(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .studentEmail("jane.doe@example.com")
                .status("SUBMITTED")
                .build();

        SubmissionFile newestFile = SubmissionFile.builder()
                .id(UUID.randomUUID())
                .filename("new.txt")
                .fileUrl("/files/new")
                .fileSize(20L)
                .build();
        newestFile.setUploadedAt(LocalDateTime.of(2026, 2, 8, 12, 0));

        SubmissionFile oldestFile = SubmissionFile.builder()
                .id(UUID.randomUUID())
                .filename("old.txt")
                .fileUrl("/files/old")
                .fileSize(10L)
                .build();
        oldestFile.setUploadedAt(LocalDateTime.of(2026, 2, 8, 10, 0));

        SubmissionComment latestComment = SubmissionComment.builder()
                .id(UUID.randomUUID())
                .authorId(UUID.randomUUID())
                .authorName("Teacher")
                .authorEmail("teacher@example.com")
                .comment("latest")
                .build();
        latestComment.setCreatedAt(LocalDateTime.of(2026, 2, 8, 13, 0));

        SubmissionComment earliestComment = SubmissionComment.builder()
                .id(UUID.randomUUID())
                .authorId(UUID.randomUUID())
                .authorName("TA")
                .authorEmail("ta@example.com")
                .comment("earliest")
                .build();
        earliestComment.setCreatedAt(LocalDateTime.of(2026, 2, 8, 9, 0));

        submission.setFiles(List.of(newestFile, oldestFile));
        submission.setComments(List.of(latestComment, earliestComment));

        SubmissionResponse response = mapper.toResponse(submission);

        assertThat(response.getStudentName()).isEqualTo("Jane Doe");
        assertThat(response.getFiles()).extracting(file -> file.getFilename())
                .containsExactly("old.txt", "new.txt");
        assertThat(response.getComments()).extracting(comment -> comment.getComment())
                .containsExactly("earliest", "latest");
    }

    @Test
    void deriveNameFromEmailShouldReturnStudentForBlankEmail() {
        assertThat(mapper.deriveNameFromEmail(" ")).isEqualTo("Student");
        assertThat(mapper.deriveNameFromEmail(null)).isEqualTo("Student");
    }
}
