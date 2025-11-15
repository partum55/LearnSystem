package com.university.lms.gradebook.repository;

import com.university.lms.gradebook.domain.GradebookEntry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@ExtendWith(SpringExtension.class)
class GradebookEntryRepositoryIntegrationTest {

    @Autowired
    private GradebookEntryRepository entryRepository;

    @Test
    void savingEntryShouldCalculatePercentageAndRetrieveByCourseAndStudent() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        GradebookEntry entry = GradebookEntry.builder()
                .courseId(courseId)
                .studentId(studentId)
                .assignmentId(assignmentId)
                .score(BigDecimal.valueOf(85))
                .maxScore(BigDecimal.valueOf(100))
                .build();

        GradebookEntry saved = entryRepository.save(entry);

        GradebookEntry persisted = entryRepository.findById(saved.getId())
                .orElseThrow(() -> new AssertionError("Entry not persisted"));

        assertThat(persisted.getPercentage())
                .as("percentage should be calculated on save")
                .isEqualByComparingTo("85.00");

        List<GradebookEntry> byCourse = entryRepository.findAllByCourseId(courseId);
        assertThat(byCourse)
                .hasSize(1)
                .first()
                .satisfies(e -> {
                    assertThat(e.getCourseId()).isEqualTo(courseId);
                    assertThat(e.getStudentId()).isEqualTo(studentId);
                });

        List<GradebookEntry> byCourseAndStudent = entryRepository.findByCourseIdAndStudentId(courseId, studentId);
        assertThat(byCourseAndStudent)
                .hasSize(1)
                .first()
                .extracting(GradebookEntry::getAssignmentId)
                .isEqualTo(assignmentId);
    }
}

