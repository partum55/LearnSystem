package com.university.lms.deadline.workload.repository;

import com.university.lms.deadline.workload.entity.WorkloadSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkloadSnapshotRepository extends JpaRepository<WorkloadSnapshot, Long> {

    Optional<WorkloadSnapshot> findByStudentIdAndDate(Long studentId, LocalDate date);

    List<WorkloadSnapshot> findByStudentIdAndDateBetween(Long studentId, LocalDate start, LocalDate end);
}

