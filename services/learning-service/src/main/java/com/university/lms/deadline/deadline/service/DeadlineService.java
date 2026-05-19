package com.university.lms.deadline.deadline.service;

import com.university.lms.deadline.deadline.dto.CreateDeadlineRequest;
import com.university.lms.deadline.deadline.dto.DeadlineDto;
import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.mapper.DeadlineMapper;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeadlineService {

    private final DeadlineRepository deadlineRepository;
    private final DeadlineMapper deadlineMapper;

    public List<DeadlineDto> getDeadlinesForGroup(Long studentGroupId, OffsetDateTime from, OffsetDateTime to) {
        return deadlineRepository.findByStudentGroupIdAndDueAtBetween(studentGroupId, from, to)
                .stream().map(deadlineMapper::toDto).toList();
    }

    public DeadlineDto getDeadline(Long id) {
        return deadlineRepository.findById(id)
                .map(deadlineMapper::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Deadline not found"));
    }

    @Transactional
    public DeadlineDto createDeadline(CreateDeadlineRequest request) {
        Deadline deadline = Deadline.builder()
                .courseId(request.getCourseId())
                .studentGroupId(request.getStudentGroupId())
                .title(request.getTitle())
                .description(request.getDescription())
                .dueAt(request.getDueAt())
                .estimatedEffort(request.getEstimatedEffort())
                .type(request.getType())
                .createdAt(OffsetDateTime.now())
                .build();
        Deadline saved = deadlineRepository.save(deadline);
        return deadlineMapper.toDto(saved);
    }
}

