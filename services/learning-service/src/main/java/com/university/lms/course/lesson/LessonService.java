package com.university.lms.course.lesson;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final LessonStepRepository stepRepository;
    private final LessonStepProgressRepository progressRepository;

    public Lesson getLessonById(UUID id) {
        return lessonRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Lesson", "id", id));
    }

    public Map<String, Object> getLessonWithSteps(UUID lessonId) {
        Lesson lesson = getLessonById(lessonId);
        List<LessonStep> steps = stepRepository.findByLessonIdOrderByPositionAsc(lessonId);

        Map<String, Object> result = new HashMap<>();
        result.put("id", lesson.getId());
        result.put("moduleId", lesson.getModuleId());
        result.put("title", lesson.getTitle());
        result.put("summary", lesson.getSummary());
        result.put("position", lesson.getPosition());
        result.put("isPublished", lesson.getIsPublished());
        result.put("steps", steps.stream().map(this::stepToMap).collect(Collectors.toList()));
        return result;
    }

    @Transactional
    public Lesson createLesson(UUID moduleId, String title, String summary) {
        List<Lesson> existing = lessonRepository.findByModuleIdOrderByPositionAsc(moduleId);
        Lesson lesson = Lesson.builder()
            .moduleId(moduleId)
            .title(title)
            .summary(summary)
            .position(existing.size())
            .build();
        return lessonRepository.save(lesson);
    }

    @Transactional
    public Lesson updateLesson(UUID id, String title, String summary, Boolean isPublished) {
        Lesson lesson = getLessonById(id);
        if (title != null) lesson.setTitle(title);
        if (summary != null) lesson.setSummary(summary);
        if (isPublished != null) lesson.setIsPublished(isPublished);
        return lessonRepository.save(lesson);
    }

    @Transactional
    public LessonStep addStep(UUID lessonId, String blockType, String title, String content, List<Map<String, Object>> questions) {
        getLessonById(lessonId);
        List<LessonStep> existing = stepRepository.findByLessonIdOrderByPositionAsc(lessonId);
        LessonStep step = LessonStep.builder()
            .lessonId(lessonId)
            .blockType(blockType)
            .title(title)
            .content(content != null ? content : "")
            .position(existing.size())
            .questions(questions != null ? questions : new ArrayList<>())
            .build();
        return stepRepository.save(step);
    }

    @Transactional
    public LessonStep updateStep(UUID lessonId, UUID stepId, String title, String content, String blockType, List<Map<String, Object>> questions) {
        LessonStep step = stepRepository.findById(stepId)
            .orElseThrow(() -> new ResourceNotFoundException("LessonStep", "id", stepId));
        if (!step.getLessonId().equals(lessonId)) {
            throw new ValidationException("Step does not belong to this lesson");
        }
        if (title != null) step.setTitle(title);
        if (content != null) step.setContent(content);
        if (blockType != null) step.setBlockType(blockType);
        if (questions != null) step.setQuestions(questions);
        return stepRepository.save(step);
    }

    @Transactional
    public void deleteStep(UUID lessonId, UUID stepId) {
        LessonStep step = stepRepository.findById(stepId)
            .orElseThrow(() -> new ResourceNotFoundException("LessonStep", "id", stepId));
        if (!step.getLessonId().equals(lessonId)) {
            throw new ValidationException("Step does not belong to this lesson");
        }
        stepRepository.delete(step);
    }

    @Transactional
    public LessonStepProgress markStepComplete(UUID userId, UUID lessonId, UUID stepId) {
        LessonStep step = stepRepository.findById(stepId)
            .orElseThrow(() -> new ResourceNotFoundException("LessonStep", "id", stepId));
        if (!step.getLessonId().equals(lessonId)) {
            throw new ValidationException("Step does not belong to this lesson");
        }

        // Validate sequential unlock
        List<LessonStep> steps = stepRepository.findByLessonIdOrderByPositionAsc(lessonId);
        List<LessonStepProgress> completed = progressRepository.findByUserIdAndLessonId(userId, lessonId);
        Set<UUID> completedIds = completed.stream()
            .map(LessonStepProgress::getStepId)
            .collect(Collectors.toSet());

        for (LessonStep s : steps) {
            if (s.getId().equals(stepId)) break;
            if (!completedIds.contains(s.getId())) {
                throw new ValidationException("Previous steps must be completed first");
            }
        }

        return progressRepository.findByUserIdAndStepId(userId, stepId)
            .orElseGet(() -> {
                LessonStepProgress progress = LessonStepProgress.builder()
                    .userId(userId)
                    .lessonId(lessonId)
                    .stepId(stepId)
                    .build();
                return progressRepository.save(progress);
            });
    }

    public Map<String, Object> getProgress(UUID userId, UUID lessonId) {
        List<LessonStep> steps = stepRepository.findByLessonIdOrderByPositionAsc(lessonId);
        List<LessonStepProgress> completed = progressRepository.findByUserIdAndLessonId(userId, lessonId);
        Set<UUID> completedIds = completed.stream()
            .map(LessonStepProgress::getStepId)
            .collect(Collectors.toSet());

        List<Map<String, Object>> stepProgress = new ArrayList<>();
        boolean unlocked = true;
        for (LessonStep s : steps) {
            Map<String, Object> sp = new HashMap<>();
            sp.put("stepId", s.getId());
            sp.put("title", s.getTitle());
            sp.put("blockType", s.getBlockType());
            sp.put("completed", completedIds.contains(s.getId()));
            sp.put("unlocked", unlocked);
            if (!completedIds.contains(s.getId())) unlocked = false;
            stepProgress.add(sp);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalSteps", steps.size());
        result.put("completedSteps", completedIds.size());
        result.put("steps", stepProgress);
        return result;
    }

    private Map<String, Object> stepToMap(LessonStep step) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", step.getId());
        map.put("lessonId", step.getLessonId());
        map.put("blockType", step.getBlockType());
        map.put("title", step.getTitle());
        map.put("content", step.getContent());
        map.put("contentFormat", step.getContentFormat());
        map.put("position", step.getPosition());
        map.put("questions", step.getQuestions());
        return map;
    }
}
