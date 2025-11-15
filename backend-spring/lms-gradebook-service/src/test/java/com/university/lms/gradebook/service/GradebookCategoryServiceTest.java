package com.university.lms.gradebook.service;

import com.university.lms.gradebook.domain.GradebookCategory;
import com.university.lms.gradebook.dto.CreateCategoryRequest;
import com.university.lms.gradebook.dto.GradebookCategoryDto;
import com.university.lms.gradebook.mapper.GradebookCategoryMapper;
import com.university.lms.gradebook.repository.GradebookCategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GradebookCategoryServiceTest {

    @Mock
    private GradebookCategoryRepository categoryRepository;

    @Mock
    private GradebookCategoryMapper categoryMapper;

    @InjectMocks
    private GradebookCategoryService categoryService;

    private UUID courseId;
    private UUID categoryId;
    private GradebookCategory mockCategory;
    private GradebookCategoryDto mockCategoryDto;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        categoryId = UUID.randomUUID();

        mockCategory = GradebookCategory.builder()
                .id(categoryId)
                .courseId(courseId)
                .name("Homework")
                .weight(BigDecimal.valueOf(30))
                .dropLowest(1)
                .position(1)
                .build();

        mockCategoryDto = GradebookCategoryDto.builder()
                .id(categoryId)
                .courseId(courseId)
                .name("Homework")
                .weight(BigDecimal.valueOf(30))
                .dropLowest(1)
                .position(1)
                .build();
    }

    @Test
    void getCategoriesForCourse_ShouldReturnCategories() {
        // Given
        when(categoryRepository.findByCourseIdOrderByPosition(courseId))
                .thenReturn(List.of(mockCategory));
        when(categoryMapper.toDto(mockCategory)).thenReturn(mockCategoryDto);

        // When
        List<GradebookCategoryDto> result = categoryService.getCategoriesForCourse(courseId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Homework");
        verify(categoryRepository).findByCourseIdOrderByPosition(courseId);
    }

    @Test
    void createCategory_ShouldSaveAndReturnDto() {
        // Given
        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .courseId(courseId)
                .name("Exams")
                .weight(BigDecimal.valueOf(50))
                .dropLowest(0)
                .position(2)
                .build();

        when(categoryMapper.toEntity(request)).thenReturn(mockCategory);
        when(categoryRepository.save(mockCategory)).thenReturn(mockCategory);
        when(categoryMapper.toDto(mockCategory)).thenReturn(mockCategoryDto);

        // When
        GradebookCategoryDto result = categoryService.createCategory(request);

        // Then
        assertThat(result).isNotNull();
        verify(categoryRepository).save(mockCategory);
        verify(categoryMapper).toDto(mockCategory);
    }

    @Test
    void deleteCategory_ShouldCallRepository() {
        // When
        categoryService.deleteCategory(categoryId);

        // Then
        verify(categoryRepository).deleteById(categoryId);
    }

    @Test
    void getCategoryById_NotFound_ShouldThrowException() {
        // Given
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> categoryService.getCategoryById(categoryId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Category not found");
    }
}

