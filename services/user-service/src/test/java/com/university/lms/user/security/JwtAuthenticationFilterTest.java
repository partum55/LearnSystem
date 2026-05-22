package com.university.lms.user.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.common.security.JwtAuthenticationFilter.UserDetails;
import com.university.lms.user.domain.User;
import com.university.lms.user.repository.UserRepository;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Queue;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class JwtAuthenticationFilterTest {

  @Test
  void getUserDetails_returnsExistingUser() {
    UUID userId = UUID.randomUUID();
    User user =
        User.builder()
            .id(userId)
            .email("teacher@example.com")
            .role(UserRole.TEACHER)
            .locale(UserLocale.UK)
            .isActive(true)
            .build();
    StubUserRepository repository = new StubUserRepository(Optional.of(user));
    JwtAuthenticationFilter filter = newFilter(repository.proxy());

    UserDetails details = filter.getUserDetails(userId, "ignored@example.com", "authenticated");

    assertThat(details).isNotNull();
    assertThat(details.getId()).isEqualTo(userId);
    assertThat(details.getEmail()).isEqualTo("teacher@example.com");
    assertThat(details.getRole()).isEqualTo("TEACHER");
    assertThat(details.isActive()).isTrue();
    assertThat(repository.saveCalls).isZero();
  }

  @Test
  void getUserDetails_defaultsExistingNullRoleToUser() {
    UUID userId = UUID.randomUUID();
    User user =
        User.builder()
            .id(userId)
            .email("user@example.com")
            .role(null)
            .locale(UserLocale.UK)
            .isActive(true)
            .build();
    StubUserRepository repository = new StubUserRepository(Optional.of(user));
    JwtAuthenticationFilter filter = newFilter(repository.proxy());

    UserDetails details = filter.getUserDetails(userId, "user@example.com", null);

    assertThat(details).isNotNull();
    assertThat(details.getRole()).isEqualTo("USER");
    assertThat(repository.saveCalls).isZero();
  }

  @Test
  void getUserDetails_autoProvisionsMissingSupabaseUser() {
    UUID userId = UUID.randomUUID();
    StubUserRepository repository = new StubUserRepository(Optional.empty());
    JwtAuthenticationFilter filter = newFilter(repository.proxy());

    UserDetails details = filter.getUserDetails(userId, "  New.User@Example.COM  ", "authenticated");

    User savedUser = repository.savedUser;

    assertThat(savedUser.getId()).isEqualTo(userId);
    assertThat(savedUser.getEmail()).isEqualTo("new.user@example.com");
    assertThat(savedUser.getDisplayName()).isEqualTo("new.user");
    assertThat(savedUser.getRole()).isEqualTo(UserRole.USER);
    assertThat(savedUser.getLocale()).isEqualTo(UserLocale.UK);
    assertThat(savedUser.isActive()).isTrue();
    assertThat(savedUser.isDeleted()).isFalse();
    assertThat(savedUser.isEmailVerified()).isTrue();

    assertThat(details).isNotNull();
    assertThat(details.getId()).isEqualTo(userId);
    assertThat(details.getEmail()).isEqualTo("new.user@example.com");
    assertThat(details.getRole()).isEqualTo("USER");
    assertThat(details.isActive()).isTrue();
  }

  @Test
  void getUserDetails_doesNotAutoProvisionWithoutEmail() {
    UUID userId = UUID.randomUUID();
    StubUserRepository repository = new StubUserRepository(Optional.empty());
    JwtAuthenticationFilter filter = newFilter(repository.proxy());

    UserDetails details = filter.getUserDetails(userId, " ", "authenticated");

    assertThat(details).isNull();
    assertThat(repository.saveCalls).isZero();
  }

  @Test
  void getUserDetails_recoversFromConcurrentAutoProvision() {
    UUID userId = UUID.randomUUID();
    User user =
        User.builder()
            .id(userId)
            .email("user@example.com")
            .role(UserRole.USER)
            .locale(UserLocale.UK)
            .isActive(true)
            .build();
    StubUserRepository repository = new StubUserRepository(Optional.empty(), Optional.of(user));
    repository.saveException = new DataIntegrityViolationException("duplicate key");
    JwtAuthenticationFilter filter = newFilter(repository.proxy());

    UserDetails details = filter.getUserDetails(userId, "user@example.com", "authenticated");

    assertThat(details).isNotNull();
    assertThat(details.getId()).isEqualTo(userId);
    assertThat(details.getRole()).isEqualTo("USER");
  }

  private JwtAuthenticationFilter newFilter(UserRepository userRepository) {
    return new JwtAuthenticationFilter(null, null, userRepository);
  }

  private static final class StubUserRepository implements InvocationHandler {
    private final Queue<Optional<User>> findResults = new ArrayDeque<>();
    private int saveCalls;
    private User savedUser;
    private RuntimeException saveException;

    @SafeVarargs
    private StubUserRepository(Optional<User>... findResults) {
      this.findResults.addAll(Arrays.asList(findResults));
    }

    private UserRepository proxy() {
      return (UserRepository)
          Proxy.newProxyInstance(
              UserRepository.class.getClassLoader(),
              new Class<?>[] {UserRepository.class},
              this);
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) {
      return switch (method.getName()) {
        case "findByIdAndIsDeletedFalse" -> findResults.isEmpty() ? Optional.empty() : findResults.remove();
        case "save" -> save(args[0]);
        case "toString" -> "StubUserRepository";
        case "hashCode" -> System.identityHashCode(proxy);
        case "equals" -> proxy == args[0];
        default -> throw new UnsupportedOperationException("Unexpected repository method: " + method.getName());
      };
    }

    private User save(Object entity) {
      saveCalls++;
      savedUser = (User) entity;
      if (saveException != null) {
        throw saveException;
      }
      return savedUser;
    }
  }
}
