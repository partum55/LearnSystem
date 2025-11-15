package com.university.lms.gradebook.repository;

import com.university.lms.gradebook.domain.GradeHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GradeHistoryRepository extends JpaRepository<GradeHistory, UUID> {
    List<GradeHistory> findByGradebookEntry_Id(UUID entryId);
}

