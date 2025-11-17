package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.AIProgressEvent;
import com.university.lms.ai.dto.CourseGenerationRequest;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Duration;

/**
 * Service for streaming AI generation with progress updates
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StreamingGenerationService {

    private final CourseGenerationService courseGenerationService;
    private final ObjectMapper objectMapper;

    /**
     * Generate course with streaming progress updates
     */
    public Flux<AIProgressEvent> generateCourseWithProgress(CourseGenerationRequest request) {
        Sinks.Many<AIProgressEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

        // Start async generation
        new Thread(() -> {
            try {
                // Step 1: Initialize
                sink.tryEmitNext(AIProgressEvent.progress("Ініціалізація генерації...", 5));
                Thread.sleep(500);

                // Step 2: Generate course structure
                sink.tryEmitNext(AIProgressEvent.progress("Генерую структуру курсу...", 15));
                Thread.sleep(1000);

                // Generate course (this is the actual AI call)
                GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

                // Step 3: Course generated
                sink.tryEmitNext(AIProgressEvent.progress("Курс згенеровано!", 40));
                sink.tryEmitNext(AIProgressEvent.data("course", response.getCourse()));

                // Step 4: Generate modules if requested
                if (request.getIncludeModules() && response.getModules() != null) {
                    int moduleProgress = 40;
                    int progressPerModule = 40 / response.getModules().size();

                    for (int i = 0; i < response.getModules().size(); i++) {
                        moduleProgress += progressPerModule;
                        sink.tryEmitNext(AIProgressEvent.progress(
                                "Обробка модуля " + (i + 1) + "/" + response.getModules().size(),
                                moduleProgress
                        ));
                        sink.tryEmitNext(AIProgressEvent.data("module", response.getModules().get(i)));
                        Thread.sleep(300);
                    }
                }

                // Step 5: Complete
                sink.tryEmitNext(AIProgressEvent.progress("Фінальна обробка...", 95));
                Thread.sleep(500);

                sink.tryEmitNext(AIProgressEvent.data("complete", response));
                sink.tryEmitNext(AIProgressEvent.complete("Генерація завершена успішно!"));
                sink.tryEmitComplete();

            } catch (Exception e) {
                log.error("Error during streaming generation", e);
                sink.tryEmitNext(AIProgressEvent.error(
                        "Помилка генерації: " + e.getMessage()
                ));
                sink.tryEmitError(e);
            }
        }).start();

        return sink.asFlux()
                .delayElements(Duration.ofMillis(100)); // Smooth streaming
    }

    /**
     * Generate modules with streaming
     */
    public Flux<AIProgressEvent> generateModulesWithProgress(
            String courseId,
            String prompt,
            int moduleCount) {

        Sinks.Many<AIProgressEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

        new Thread(() -> {
            try {
                sink.tryEmitNext(AIProgressEvent.progress("Генерую модулі...", 10));

                CourseGenerationRequest request = CourseGenerationRequest.builder()
                        .prompt(prompt)
                        .includeModules(true)
                        .includeAssignments(false)
                        .includeQuizzes(false)
                        .build();

                GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

                if (response.getModules() != null) {
                    int progress = 20;
                    int progressPerModule = 70 / response.getModules().size();

                    for (int i = 0; i < response.getModules().size(); i++) {
                        progress += progressPerModule;
                        sink.tryEmitNext(AIProgressEvent.progress(
                                "Модуль " + (i + 1) + " готовий",
                                progress
                        ));
                        sink.tryEmitNext(AIProgressEvent.data("module", response.getModules().get(i)));
                        Thread.sleep(200);
                    }
                }

                sink.tryEmitNext(AIProgressEvent.complete("Модулі згенеровано!"));
                sink.tryEmitComplete();

            } catch (Exception e) {
                log.error("Error generating modules", e);
                sink.tryEmitNext(AIProgressEvent.error(e.getMessage()));
                sink.tryEmitError(e);
            }
        }).start();

        return sink.asFlux().delayElements(Duration.ofMillis(100));
    }
}

