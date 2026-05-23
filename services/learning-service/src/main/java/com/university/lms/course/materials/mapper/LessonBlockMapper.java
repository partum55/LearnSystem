package com.university.lms.course.materials.mapper;

import com.university.lms.course.materials.dto.LessonBlockDto;
import com.university.lms.course.materials.entity.LessonBlock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LessonBlockMapper {
  public LessonBlockDto toDto(LessonBlock block) {
    Map<String, Object> settings = block.getSettings() == null
        ? new HashMap<>()
        : new HashMap<>(block.getSettings());
    return new LessonBlockDto(
        block.getId(),
        block.getType(),
        block.getPosition() == null ? 0 : block.getPosition(),
        block.getTitle(),
        block.getContent(),
        block.getContentFormat(),
        settings);
  }
}
