package com.university.lms.ai.config;

import java.lang.reflect.Method;
import java.util.concurrent.ThreadPoolExecutor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Configuration for async task execution. Replaces manual Thread creation with managed thread
 * pools.
 */
@Configuration
@EnableAsync
@Slf4j
public class AsyncConfig implements AsyncConfigurer {

  /**
   * Task executor for AI generation tasks. Configured with bounded queue to prevent OOM under load.
   */
  @Bean("aiTaskExecutor")
  public TaskExecutor aiTaskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);
    executor.setMaxPoolSize(10);
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("ai-gen-");
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    executor.setWaitForTasksToCompleteOnShutdown(true);
    executor.setAwaitTerminationSeconds(30);
    executor.initialize();

    log.info(
        "AI Task Executor initialized: corePoolSize={}, maxPoolSize={}, queueCapacity={}",
        executor.getCorePoolSize(),
        executor.getMaxPoolSize(),
        50);

    return executor;
  }

  /** Default async executor. */
  @Override
  public TaskExecutor getAsyncExecutor() {
    return aiTaskExecutor();
  }

  /** Exception handler for async tasks. */
  @Override
  public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
    return new AsyncExceptionHandler();
  }

  /** Custom exception handler for uncaught async exceptions. */
  @Slf4j
  private static class AsyncExceptionHandler implements AsyncUncaughtExceptionHandler {
    @Override
    public void handleUncaughtException(Throwable ex, Method method, Object... params) {
      log.error(
          "Uncaught exception in async method '{}': {}", method.getName(), ex.getMessage(), ex);
    }
  }
}
