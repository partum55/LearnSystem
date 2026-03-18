package com.university.lms.gradebook.service;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.gradebook.domain.GradebookCategory;
import com.university.lms.gradebook.dto.CreateCategoryRequest;
import com.university.lms.gradebook.dto.GradebookCategoryDto;
import com.university.lms.gradebook.mapper.GradebookCategoryMapper;
import com.university.lms.gradebook.repository.GradebookCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradebookCategoryService {

    private final GradebookCategoryRepository categoryRepository;
    private final GradebookCategoryMapper categoryMapper;
    private final CourseMemberRepository courseMemberRepository;

    public List<GradebookCategoryDto> getCategoriesForCourse(UUID courseId, UUID userId) {
        validateCourseAccess(courseId, userId);
        return categoryRepository.findByCourseIdOrderByPosition(courseId)
                .stream()
                .map(categoryMapper::toDto)
                .collect(Collectors.toList());
    }

    public GradebookCategoryDto getCategoryById(UUID categoryId, UUID userId) {
        GradebookCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
        validateCourseAccess(category.getCourseId(), userId);
        return categoryMapper.toDto(category);
    }

    @Transactional
    public GradebookCategoryDto createCategory(CreateCategoryRequest request, UUID userId) {
        validateCourseManagement(request.getCourseId(), userId);
        List<GradebookCategory> existing = categoryRepository.findByCourseIdOrderByPosition(request.getCourseId());
        int insertPosition = clampInsertPosition(request.getPosition(), existing.size());

        for (GradebookCategory category : existing) {
            if (category.getPosition() >= insertPosition) {
                category.setPosition(category.getPosition() + 1);
            }
        }
        if (!existing.isEmpty()) {
            categoryRepository.saveAll(existing);
        }

        GradebookCategory category = categoryMapper.toEntity(request);
        category.setCourseId(request.getCourseId());
        category.setPosition(insertPosition);
        category.setDropLowest(request.getDropLowest() == null ? 0 : request.getDropLowest());
        GradebookCategory saved = categoryRepository.save(category);
        log.info("Created gradebook category: {} for course: {}", saved.getName(), saved.getCourseId());
        return categoryMapper.toDto(saved);
    }

    @Transactional
    public GradebookCategoryDto updateCategory(UUID categoryId, CreateCategoryRequest request, UUID userId) {
        GradebookCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
        validateCourseManagement(category.getCourseId(), userId);

        if (!category.getCourseId().equals(request.getCourseId())) {
            throw new IllegalArgumentException("Category courseId cannot be changed");
        }

        Integer currentPosition = category.getPosition();
        categoryMapper.updateEntityFromRequest(request, category);
        category.setCourseId(request.getCourseId());
        if (category.getDropLowest() == null) {
            category.setDropLowest(0);
        }

        if (request.getPosition() != null && !request.getPosition().equals(currentPosition)) {
            moveCategory(category, request.getPosition());
        }

        GradebookCategory updated = categoryRepository.save(category);
        log.info("Updated gradebook category: {}", categoryId);
        return categoryMapper.toDto(updated);
    }

    @Transactional
    public void deleteCategory(UUID categoryId, UUID userId) {
        GradebookCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
        validateCourseManagement(category.getCourseId(), userId);
        UUID courseId = category.getCourseId();
        categoryRepository.delete(category);
        normalizePositions(courseId);
        log.info("Deleted gradebook category: {}", categoryId);
    }

    @Transactional
    public void reorderCategories(UUID courseId, List<UUID> categoryIds, UUID userId) {
        validateCourseManagement(courseId, userId);
        List<GradebookCategory> categories = categoryRepository.findByCourseIdOrderByPosition(courseId);
        if (categories.isEmpty()) {
            return;
        }

        if (categoryIds == null || categoryIds.size() != categories.size()) {
            throw new IllegalArgumentException("Category reorder request must include all category IDs");
        }

        Set<UUID> expected = categories.stream().map(GradebookCategory::getId).collect(Collectors.toSet());
        Set<UUID> actual = Set.copyOf(categoryIds);
        if (!expected.equals(actual)) {
            throw new IllegalArgumentException("Category reorder request contains invalid IDs");
        }

        Map<UUID, GradebookCategory> categoryMap = new LinkedHashMap<>();
        for (GradebookCategory category : categories) {
            categoryMap.put(category.getId(), category);
        }

        for (int i = 0; i < categoryIds.size(); i++) {
            GradebookCategory category = categoryMap.get(categoryIds.get(i));
            category.setPosition(i);
        }

        categoryRepository.saveAll(categoryMap.values());
        log.info("Reordered {} categories for course {}", categoryIds.size(), courseId);
    }

    private void moveCategory(GradebookCategory category, int requestedPosition) {
        List<GradebookCategory> categories = categoryRepository.findByCourseIdOrderByPosition(category.getCourseId());
        int targetPosition = clampMovePosition(requestedPosition, Math.max(categories.size() - 1, 0));
        int currentPosition = category.getPosition();

        if (targetPosition == currentPosition) {
            return;
        }

        for (GradebookCategory current : categories) {
            if (current.getId().equals(category.getId())) {
                current.setPosition(targetPosition);
                continue;
            }

            int position = current.getPosition();
            if (targetPosition > currentPosition
                    && position > currentPosition
                    && position <= targetPosition) {
                current.setPosition(position - 1);
            } else if (targetPosition < currentPosition
                    && position >= targetPosition
                    && position < currentPosition) {
                current.setPosition(position + 1);
            }
        }

        category.setPosition(targetPosition);
        categoryRepository.saveAll(categories);
    }

    private void normalizePositions(UUID courseId) {
        List<GradebookCategory> categories = categoryRepository.findByCourseIdOrderByPosition(courseId);
        for (int i = 0; i < categories.size(); i++) {
            categories.get(i).setPosition(i);
        }
        if (!categories.isEmpty()) {
            categoryRepository.saveAll(categories);
        }
    }

    private int clampInsertPosition(Integer requestedPosition, int size) {
        if (requestedPosition == null) {
            return size;
        }
        if (requestedPosition < 0) {
            return 0;
        }
        return Math.min(requestedPosition, size);
    }

    private int clampMovePosition(int requestedPosition, int maxPosition) {
        if (requestedPosition < 0) {
            return 0;
        }
        return Math.min(requestedPosition, maxPosition);
    }

    private void validateCourseAccess(UUID courseId, UUID userId) {
        if (!courseMemberRepository.existsByCourseIdAndUserId(courseId, userId)
                && !courseMemberRepository.canUserManageCourse(courseId, userId)) {
            throw new ValidationException("User does not have access to this course");
        }
    }

    private void validateCourseManagement(UUID courseId, UUID userId) {
        if (!courseMemberRepository.canUserManageCourse(courseId, userId)) {
            throw new ValidationException("User does not have permission to manage categories for this course");
        }
    }
}
