package com.university.lms.ai.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Configuration for WebClient to communicate with Llama API
 */
@Configuration
@RequiredArgsConstructor
public class WebClientConfig {

    private final LlamaApiProperties llamaApiProperties;

    @Bean
    public WebClient llamaWebClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, llamaApiProperties.getTimeout())
                .responseTimeout(Duration.ofMillis(llamaApiProperties.getTimeout()))
                .doOnConnected(conn ->
                    conn.addHandlerLast(new ReadTimeoutHandler(llamaApiProperties.getTimeout(), TimeUnit.MILLISECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(llamaApiProperties.getTimeout(), TimeUnit.MILLISECONDS)));

        WebClient.Builder builder = WebClient.builder()
                .baseUrl(llamaApiProperties.getUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient));

        // Додати Authorization header якщо є API ключ (для Groq, Together AI, etc.)
        if (llamaApiProperties.getKey() != null && !llamaApiProperties.getKey().isEmpty()) {
            builder.defaultHeader("Authorization", "Bearer " + llamaApiProperties.getKey());
        }

        return builder.build();
    }
}

