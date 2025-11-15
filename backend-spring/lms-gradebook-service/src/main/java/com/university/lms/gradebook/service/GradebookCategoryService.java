package com.university.lms.gradebook.service;

import com.university.lms.gradebook.domain.GradebookCategory;
import com.university.lms.gradebook.dto.CreateCategoryRequest;
import com.university.lms.gradebook.dto.GradebookCategoryDto;
import com.university.lms.gradebook.mapper.GradebookCategoryMapper;
import com.university.lms.gradebook.repository.GradebookCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradebookCategoryService {

    private final GradebookCategoryRepository categoryRepository;
    private final GradebookCategoryMapper categoryMapper;

    public List<GradebookCategoryDto> getCategoriesForCourse(UUID courseId) {
        return categoryRepository.findByCourseIdOrderByPosition(courseId)
                .stream()
                .map(categoryMapper::toDto)
                .collect(Collectors.toList());
    }

    public GradebookCategoryDto getCategoryById(UUID categoryId) {
        GradebookCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
        return categoryMapper.toDto(category);
    }

    @Transactional
    public GradebookCategoryDto createCategory(CreateCategoryRequest request) {
        GradebookCategory category = categoryMapper.toEntity(request);
        category.setCourseId(request.getCourseId());
        GradebookCategory saved = categoryRepository.save(category);
        log.info("Created gradebook category: {} for course: {}", saved.getName(), saved.getCourseId());
        return categoryMapper.toDto(saved);
    }

    @Transactional
    public GradebookCategoryDto updateCategory(UUID categoryId, CreateCategoryRequest request) {
        GradebookCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));

        categoryMapper.updateEntityFromRequest(request, category);
        category.setCourseId(request.getCourseId());
        GradebookCategory updated = categoryRepository.save(category);
        log.info("Updated gradebook category: {}", categoryId);
        return categoryMapper.toDto(updated);
    }

    @Transactional
    public void deleteCategory(UUID categoryId) {
        categoryRepository.deleteById(categoryId);
        log.info("Deleted gradebook category: {}", categoryId);
    }
}
