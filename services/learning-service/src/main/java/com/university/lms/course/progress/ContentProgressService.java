package com.university.lms.course.progress;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ContentProgressService {

    private final ContentProgressRepository repository;

    @Transactional
    public ContentProgress markComplete(UUID userId, UUID courseId, UUID moduleId, String contentType, UUID contentId) {
        return repository.findByUserIdAndContentTypeAndContentId(userId, contentType, contentId)
            .orElseGet(() -> {
                ContentProgress progress = ContentProgress.builder()
                    .userId(userId)
                    .courseId(courseId)
                    .moduleId(moduleId)
                    .contentType(contentType)
                    .contentId(contentId)
                    .build();
                return repository.save(progress);
            });
    }

    public Map<String, Object> getModuleProgress(UUID userId, UUID moduleId) {
        List<ContentProgress> items = repository.findByUserIdAndModuleId(userId, moduleId);
        List<Map<String, Object>> progressItems = items.stream()
            .map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("contentId", p.getContentId());
                map.put("contentType", p.getContentType());
                map.put("completedAt", p.getCompletedAt());
                return map;
            })
            .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("completed", items.size());
        result.put("items", progressItems);
        return result;
    }

    public Map<String, Object> getCourseProgress(UUID userId, UUID courseId) {
        List<ContentProgress> items = repository.findByUserIdAndCourseId(userId, courseId);

        Map<UUID, List<ContentProgress>> byModule = items.stream()
            .collect(Collectors.groupingBy(ContentProgress::getModuleId));

        List<Map<String, Object>> modules = byModule.entrySet().stream()
            .map(entry -> {
                Map<String, Object> mod = new HashMap<>();
                mod.put("moduleId", entry.getKey());
                mod.put("completed", entry.getValue().size());
                mod.put("items", entry.getValue().stream()
                    .map(p -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("contentId", p.getContentId());
                        map.put("contentType", p.getContentType());
                        map.put("completedAt", p.getCompletedAt());
                        return map;
                    })
                    .collect(Collectors.toList()));
                return mod;
            })
            .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("totalCompleted", items.size());
        result.put("modules", modules);
        return result;
    }
}
