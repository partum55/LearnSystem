package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.VplTestCase;
import com.university.lms.course.assessment.dto.VplTestCaseDto;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.VplTestCaseRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing VPL test cases.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VplTestCaseService {

    private final VplTestCaseRepository testCaseRepository;
    private final AssignmentRepository assignmentRepository;

    public List<VplTestCaseDto> getTestCasesForAssignment(UUID assignmentId) {
        return testCaseRepository.findByAssignmentIdOrderByPositionAsc(assignmentId)
                .stream()
                .map(VplTestCaseDto::fullView)
                .toList();
    }

    public List<VplTestCaseDto> getTestCasesForStudent(UUID assignmentId) {
        return testCaseRepository.findByAssignmentIdOrderByPositionAsc(assignmentId)
                .stream()
                .map(VplTestCaseDto::hiddenView)
                .toList();
    }

    @Transactional
    public VplTestCaseDto createTestCase(UUID assignmentId, VplTestCaseDto dto) {
        validateAssignmentExists(assignmentId);

        VplTestCase testCase = VplTestCase.builder()
                .assignmentId(assignmentId)
                .name(dto.getName())
                .input(dto.getInput())
                .expectedOutput(dto.getExpectedOutput())
                .checkMode(dto.getCheckMode() != null ? dto.getCheckMode() : "TRIM")
                .testCode(dto.getTestCode())
                .hidden(dto.getHidden() != null ? dto.getHidden() : false)
                .required(dto.getRequired() != null ? dto.getRequired() : false)
                .weight(dto.getWeight() != null ? dto.getWeight() : 1)
                .position(getNextPosition(assignmentId))
                .build();

        return VplTestCaseDto.fullView(testCaseRepository.save(testCase));
    }

    @Transactional
    public VplTestCaseDto updateTestCase(UUID assignmentId, UUID testId, VplTestCaseDto dto) {
        VplTestCase testCase = testCaseRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("VplTestCase", "id", testId));

        if (!testCase.getAssignmentId().equals(assignmentId)) {
            throw new IllegalArgumentException("Test case does not belong to assignment");
        }

        if (dto.getName() != null) testCase.setName(dto.getName());
        if (dto.getInput() != null) testCase.setInput(dto.getInput());
        if (dto.getExpectedOutput() != null) testCase.setExpectedOutput(dto.getExpectedOutput());
        if (dto.getCheckMode() != null) testCase.setCheckMode(dto.getCheckMode());
        if (dto.getTestCode() != null) testCase.setTestCode(dto.getTestCode());
        if (dto.getHidden() != null) testCase.setHidden(dto.getHidden());
        if (dto.getRequired() != null) testCase.setRequired(dto.getRequired());
        if (dto.getWeight() != null) testCase.setWeight(dto.getWeight());

        return VplTestCaseDto.fullView(testCaseRepository.save(testCase));
    }

    @Transactional
    public void deleteTestCase(UUID assignmentId, UUID testId) {
        VplTestCase testCase = testCaseRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("VplTestCase", "id", testId));

        if (!testCase.getAssignmentId().equals(assignmentId)) {
            throw new IllegalArgumentException("Test case does not belong to assignment");
        }

        testCaseRepository.delete(testCase);
    }

    @Transactional
    public void reorderTestCases(UUID assignmentId, List<UUID> orderedIds) {
        validateAssignmentExists(assignmentId);

        List<VplTestCase> testCases = testCaseRepository.findByAssignmentIdOrderByPositionAsc(assignmentId);

        for (int i = 0; i < orderedIds.size(); i++) {
            UUID id = orderedIds.get(i);
            VplTestCase testCase = testCases.stream()
                    .filter(tc -> tc.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("VplTestCase", "id", id));

            testCase.setPosition(i);
            testCaseRepository.save(testCase);
        }
    }

    @Transactional
    public void deleteAllByAssignment(UUID assignmentId) {
        testCaseRepository.deleteByAssignmentId(assignmentId);
    }

    private void validateAssignmentExists(UUID assignmentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new ResourceNotFoundException("Assignment", "id", assignmentId);
        }
    }

    private int getNextPosition(UUID assignmentId) {
        List<VplTestCase> existing = testCaseRepository.findByAssignmentIdOrderByPositionAsc(assignmentId);
        return existing.isEmpty() ? 0 : existing.get(existing.size() - 1).getPosition() + 1;
    }
}