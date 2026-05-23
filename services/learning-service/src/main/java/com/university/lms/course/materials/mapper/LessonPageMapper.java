package com.university.lms.course.materials.mapper;

import com.university.lms.course.materials.dto.LessonPageDto;
import com.university.lms.course.materials.entity.LessonPage;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LessonPageMapper {
  public LessonPageDto toDto(LessonPage page) {
    Map<String, Object> settings = page.getSettings() == null
        ? new HashMap<>()
        : new HashMap<>(page.getSettings());
    return new LessonPageDto(
        page.getId(),
        page.getType(),
        page.getPosition() == null ? 0 : page.getPosition(),
        page.getTitle(),
        page.getContent(),
        page.getContentFormat(),
        settings);
  }
}
