# 🚀 LMS Quick Action Plan

## 🔥 ЗАРАЗ (Все виконано!)
- ✅ Видалено дубльований JwtService
- ✅ Виправлено pom.xml (видалено неіснуючі модулі)
- ✅ Налаштовано Redis JSON серіалізацію
- ✅ Перевірено RateLimitingFilter

## 📋 ЦЕЙ ТИЖДЕНЬ (Priority 1)

### Backend TODO's ✅ ВСЕ ВИКОНАНО!
```java
// 1. UserService.java - Email verification ✅
@Async
public void sendVerificationEmail(User user) {
    // ✅ ГОТОВО: Створено EmailService з async відправкою
    // ✅ ГОТОВО: Підтримка Gmail SMTP
    // ✅ ГОТОВО: Fallback для development (mail.enabled=false)
}

// 2. AuthController.java - Token refresh ✅
@PostMapping("/refresh")
public ResponseEntity<?> refreshToken(@RequestHeader("X-Refresh-Token") String token) {
    // ✅ ГОТОВО: Валідація refresh token
    // ✅ ГОТОВО: Генерація нових access + refresh tokens
    // ✅ ГОТОВО: Перевірка active user
}

// 3. AuthController.java - Logout ✅
@PostMapping("/logout")
public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
    // ✅ ГОТОВО: Blacklist token в Redis
    // ✅ ГОТОВО: Fallback в in-memory для development
    // ✅ ГОТОВО: Graceful error handling
}

// 4. QuizAttemptService.java - Auto-grading ✅
private void autoGradeAttempt(QuizAttempt attempt) {
    // ✅ ГОТОВО: Підтримка 8 типів питань
    // ✅ ГОТОВО: MULTIPLE_CHOICE, TRUE_FALSE, NUMERICAL
    // ✅ ГОТОВО: FILL_BLANK, MATCHING, ORDERING
    // ✅ ГОТОВО: Розумна обробка помилок
}
```

**Нові файли:**
- ✅ `EmailService.java` - Async email sending
- ✅ `RedisCacheConfig.java` - JSON serialization для Redis
- ✅ Оновлено `application.yml` - Spring Mail config
- ✅ 3 нових методи в `UserService.java`
- ✅ 8 grading методів в `QuizAttemptService.java`

### Frontend Warnings
```typescript
// Обгорнути fetch функції в useCallback
const fetchMembers = useCallback(() => {
  // logic
}, [courseId]);

useEffect(() => {
  fetchMembers();
}, [fetchMembers]);
```

**Файли для виправлення:**
- `CourseMembersTab.tsx`
- `CreateAssignmentModal.tsx`
- `CreateQuizModal.tsx`
- `QuizBuilder.tsx`
- `QuizDetail.tsx`
- `QuizResults.tsx`
- `QuizTaking.tsx`
- `SpeedGrader.tsx`

## 🎯 НАСТУПНИЙ ТИЖДЕНЬ (Priority 2)

### 1. API Gateway
```bash
cd backend-spring
mkdir lms-api-gateway
# Додати Spring Cloud Gateway
```

### 2. Monitoring Stack
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
  grafana:
    image: grafana/grafana
  zipkin:
    image: openzipkin/zipkin
```

### 3. Database Optimization
```sql
-- Додати індекси
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_quiz_course ON quizzes(course_id);
CREATE INDEX idx_submission_assignment ON submissions(assignment_id, user_id);
```

## 📚 ДОВГОСТРОКОВО (Priority 3)

### Архітектурні зміни
1. **Розділити lms-common:**
   ```
   lms-common-domain/
   lms-common-security/
   lms-common-web/
   lms-common-messaging/
   ```

2. **Service Discovery:**
   - Додати Eureka Server
   - Налаштувати Eureka Clients

3. **Config Server:**
   - Централізована конфігурація
   - Vault для секретів

### Видалити/Перенести
- ❌ `backend-python-archive/` → окремий репо
- ❌ `docs-archive/` → Wiki
- ❌ Celery сервіси з docker-compose → окремий файл

## 🛠️ КОРИСНІ КОМАНДИ

### Перезапуск системи
```bash
docker-compose down -v
cd backend-spring && mvn clean package -DskipTests && cd ..
docker-compose up --build
```

### Очистка Redis
```bash
docker exec lms-redis redis-cli FLUSHALL
```

### Перевірка здоров'я
```bash
curl http://localhost:8080/api/actuator/health
curl http://localhost:3000
curl http://localhost:8085/api/ai/health
```

### Логи
```bash
docker-compose logs -f backend-spring
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 📊 Відстеження прогресу

### Week 1: Foundation ✅
- [x] Fix critical errors
- [x] Configure Redis
- [x] Clean up duplicates

### Week 2: TODOs
- [x] Email verification
- [x] Token refresh
- [x] Logout with blacklist
- [x] Auto-grading
- [ ] Fix ESLint warnings (Frontend - 8 files)

### Week 3: Architecture
- [ ] API Gateway
- [ ] Service Discovery
- [ ] Monitoring stack

### Week 4: Optimization
- [ ] Database indices
- [ ] Performance tuning
- [ ] Load testing

---

**Файли для огляду:**
- 📄 `PROJECT_ANALYSIS.md` - Повний аналіз проєкту
- 📄 `FIXES_REPORT.md` - Звіт про виправлення
- 📄 Цей файл - Швидкий action plan

