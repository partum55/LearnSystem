package com.university.lms.course.materials.mapper;

import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.entity.LearningItem;
import com.university.lms.course.materials.entity.LearningItemType;
import com.university.lms.course.materials.repository.LessonPageRepository;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LearningItemMapper {
  private final LessonPageRepository lessonPageRepository;

  public LearningItemDto toDto(LearningItem item) {
    Map<String, Object> responseSettings = new HashMap<>();
    if (item.getContentJson() != null) {
      responseSettings.putAll(item.getContentJson());
    }
    if (item.getSettings() != null) {
      responseSettings.putAll(item.getSettings());
    }
    if (item.getType() == LearningItemType.LESSON) {
      responseSettings.put("learningItemId", item.getId());
      responseSettings.put("pageCount", lessonPageRepository.findByLearningItemIdOrderByPositionAsc(item.getId()).size());
      responseSettings.put("blockCount", lessonPageRepository.findByLearningItemIdOrderByPositionAsc(item.getId()).size());
    }
    return new LearningItemDto(
        item.getId(),
        item.getModule().getId(),
        item.getType(),
        item.getTitle(),
        item.getDescription(),
        item.getPosition() == null ? 0 : item.getPosition(),
        item.getStatus(),
        responseSettings);
  }
}
