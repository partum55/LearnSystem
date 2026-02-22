package com.university.lms.deadline.deadline.repository;

import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.entity.DeadlineType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface DeadlineRepository extends JpaRepository<Deadline, Long> {

    List<Deadline> findByStudentGroupId(Long studentGroupId);

    List<Deadline> findByStudentGroupIdAndDueAtBetween(Long studentGroupId, OffsetDateTime from, OffsetDateTime to);

    List<Deadline> findByDueAtBetween(OffsetDateTime from, OffsetDateTime to);

    long countByDueAtBetween(OffsetDateTime from, OffsetDateTime to);

    @Query("select d from Deadline d where d.studentGroupId = :studentGroupId and CAST(d.dueAt AS DATE) = :date")
    List<Deadline> findByStudentGroupIdAndDate(Long studentGroupId, java.time.LocalDate date);

    List<Deadline> findByStudentGroupIdAndType(Long studentGroupId, DeadlineType type);

    @Query("select distinct d.studentGroupId from Deadline d")
    List<Long> findDistinctStudentGroupIds();
}
