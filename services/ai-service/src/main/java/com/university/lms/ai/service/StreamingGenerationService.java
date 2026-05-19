package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.AIProgressEvent;
import com.university.lms.ai.dto.CourseGenerationRequest;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.infrastructure.metrics.AIMetricsCollector;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

/**
 * Service for streaming AI generation with progress updates. Uses managed thread pool via @Async
 * instead of raw Thread creation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StreamingGenerationService {

  private final CourseGenerationService courseGenerationService;
  private final ObjectMapper objectMapper;
  private final AIMetricsCollector metricsCollector;

  /** Generate course with streaming progress updates. Returns a Flux that emits progress events. */
  public Flux<AIProgressEvent> generateCourseWithProgress(CourseGenerationRequest request) {
    Sinks.Many<AIProgressEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

    // Start async generation using managed thread pool
    generateCourseAsync(request, sink);

    return sink.asFlux().delayElements(Duration.ofMillis(100)); // Smooth streaming
  }

  /** Async course generation - runs on managed thread pool. */
  @Async("aiTaskExecutor")
  public CompletableFuture<Void> generateCourseAsync(
      CourseGenerationRequest request, Sinks.Many<AIProgressEvent> sink) {

    long startTime = System.currentTimeMillis();

    return CompletableFuture.runAsync(
        () -> {
          try {
            // Step 1: Initialize
            sink.tryEmitNext(AIProgressEvent.progress("Ініціалізація генерації...", 5));
            metricsCollector.recordStreamingEvent("init", true);
            Thread.sleep(500);

            // Step 2: Generate course structure
            sink.tryEmitNext(AIProgressEvent.progress("Генерую структуру курсу...", 15));

            // Generate course (this is the actual AI call)
            GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

            // Step 3: Course generated
            sink.tryEmitNext(AIProgressEvent.progress("Курс згенеровано!", 40));
            sink.tryEmitNext(AIProgressEvent.data("course", response.getCourse()));
            metricsCollector.recordStreamingEvent("course_generated", true);

            // Step 4: Generate modules if requested
            if (request.getIncludeModules() && response.getModules() != null) {
              int moduleProgress = 40;
              int progressPerModule = 40 / Math.max(1, response.getModules().size());

              for (int i = 0; i < response.getModules().size(); i++) {
                moduleProgress += progressPerModule;
                sink.tryEmitNext(
                    AIProgressEvent.progress(
                        "Обробка модуля " + (i + 1) + "/" + response.getModules().size(),
                        moduleProgress));
                sink.tryEmitNext(AIProgressEvent.data("module", response.getModules().get(i)));
                metricsCollector.recordStreamingEvent("module_generated", true);
                Thread.sleep(300);
              }
            }

            // Step 5: Complete
            sink.tryEmitNext(AIProgressEvent.progress("Фінальна обробка...", 95));
            Thread.sleep(500);

            sink.tryEmitNext(AIProgressEvent.data("complete", response));
            sink.tryEmitNext(AIProgressEvent.complete("Генерація завершена успішно!"));
            sink.tryEmitComplete();

            // Record overall success
            long latencyMs = System.currentTimeMillis() - startTime;
            metricsCollector.recordGeneration("course_stream", "groq", latencyMs, true);

          } catch (Exception e) {
            log.error("Error during streaming generation", e);
            sink.tryEmitNext(AIProgressEvent.error("Помилка генерації: " + e.getMessage()));
            sink.tryEmitError(e);

            // Record failure
            long latencyMs = System.currentTimeMillis() - startTime;
            metricsCollector.recordGeneration("course_stream", "groq", latencyMs, false);
            metricsCollector.recordStreamingEvent("error", false);
          }
        });
  }

  /** Generate modules with streaming progress. */
  public Flux<AIProgressEvent> generateModulesWithProgress(
      String courseId, String prompt, int moduleCount) {

    Sinks.Many<AIProgressEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

    // Start async generation
    generateModulesAsync(courseId, prompt, moduleCount, sink);

    return sink.asFlux().delayElements(Duration.ofMillis(100));
  }

  /** Async module generation - runs on managed thread pool. */
  @Async("aiTaskExecutor")
  public CompletableFuture<Void> generateModulesAsync(
      String courseId, String prompt, int moduleCount, Sinks.Many<AIProgressEvent> sink) {

    long startTime = System.currentTimeMillis();

    return CompletableFuture.runAsync(
        () -> {
          try {
            sink.tryEmitNext(AIProgressEvent.progress("Генерую модулі...", 10));

            CourseGenerationRequest request =
                CourseGenerationRequest.builder()
                    .prompt(prompt)
                    .includeModules(true)
                    .includeAssignments(false)
                    .includeQuizzes(false)
                    .build();

            GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

            if (response.getModules() != null) {
              int progress = 20;
              int progressPerModule = 70 / Math.max(1, response.getModules().size());

              for (int i = 0; i < response.getModules().size(); i++) {
                progress += progressPerModule;
                sink.tryEmitNext(
                    AIProgressEvent.progress("Модуль " + (i + 1) + " готовий", progress));
                sink.tryEmitNext(AIProgressEvent.data("module", response.getModules().get(i)));
                metricsCollector.recordStreamingEvent("module_generated", true);
                Thread.sleep(200);
              }
            }

            sink.tryEmitNext(AIProgressEvent.complete("Модулі згенеровано!"));
            sink.tryEmitComplete();

            // Record success
            long latencyMs = System.currentTimeMillis() - startTime;
            metricsCollector.recordGeneration("module_stream", "groq", latencyMs, true);

          } catch (Exception e) {
            log.error("Error generating modules", e);
            sink.tryEmitNext(AIProgressEvent.error(e.getMessage()));
            sink.tryEmitError(e);

            // Record failure
            long latencyMs = System.currentTimeMillis() - startTime;
            metricsCollector.recordGeneration("module_stream", "groq", latencyMs, false);
          }
        });
  }
}
