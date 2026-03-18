package com.university.lms.ai.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

/** Configuration for WebClient to communicate with Llama API */
@Configuration
@RequiredArgsConstructor
public class WebClientConfig {

  private final LlamaApiProperties llamaApiProperties;

  @Bean
  public WebClient llamaWebClient() {
    HttpClient httpClient =
        HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, llamaApiProperties.getTimeout())
            .responseTimeout(Duration.ofMillis(llamaApiProperties.getTimeout()))
            .doOnConnected(
                conn ->
                    conn.addHandlerLast(
                            new ReadTimeoutHandler(
                                llamaApiProperties.getTimeout(), TimeUnit.MILLISECONDS))
                        .addHandlerLast(
                            new WriteTimeoutHandler(
                                llamaApiProperties.getTimeout(), TimeUnit.MILLISECONDS)));

    // No default Authorization header — API key is set per-request
    // to support per-user API keys
    return WebClient.builder()
        .baseUrl(llamaApiProperties.getUrl())
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .build();
  }
}
