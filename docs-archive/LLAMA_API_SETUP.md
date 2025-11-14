# 🔑 Налаштування Llama API

## 📋 Зміст
1. [Ollama (Локальний сервер)](#ollama-локальний-сервер)
2. [Зовнішні Llama API провайдери](#зовнішні-llama-api-провайдери)
3. [Налаштування Backend](#налаштування-backend)
4. [Перевірка з'єднання](#перевірка-зєднання)

---

## 🦙 Ollama (Локальний сервер) - РЕКОМЕНДОВАНО

**Ollama не потребує API ключа!** Це локальний сервер, який працює на вашому комп'ютері.

### Переваги:
- ✅ Безкоштовно
- ✅ Приватність (дані не йдуть в хмару)
- ✅ Без обмежень на запити
- ✅ Швидкість (локально)

### Встановлення:

#### Linux/Mac:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows:
Завантажте з: https://ollama.com/download

### Запуск:

```bash
# 1. Запустити сервер
ollama serve

# 2. Завантажити модель (у новому терміналі)
ollama pull llama3.1

# 3. Перевірити
curl http://localhost:11434/api/version
```

### Налаштування у проєкті:

**`.env` (root)**:
```bash
# Ollama локально
LLAMA_API_URL=http://localhost:11434
LLAMA_MODEL=llama3.1
# API KEY не потрібен!
```

**Docker Compose** (вже налаштовано):
```bash
./start.sh --with-ai
```

---

## 🌐 Зовнішні Llama API провайдери

Якщо ви хочете використовувати хмарний API замість локального Ollama:

### Варіант 1: Groq (Швидкий, безкоштовний tier)

**Реєстрація**: https://console.groq.com/

**Отримати API ключ**:
1. Зареєструватись на Groq
2. Перейти в Console → API Keys
3. Створити новий ключ
4. Скопіювати ключ

**Налаштування**:

`.env`:
```bash
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
LLAMA_MODEL=llama-3.1-70b-versatile
```

**Оновити backend config** (`backend-spring/lms-ai-service/src/main/resources/application.yml`):
```yaml
llama:
  api:
    url: ${LLAMA_API_URL:https://api.groq.com/openai/v1}
    key: ${LLAMA_API_KEY:}  # Додати цей рядок
    model: ${LLAMA_MODEL:llama-3.1-70b-versatile}
```

### Варіант 2: Together AI

**Реєстрація**: https://api.together.xyz/

**Отримати API ключ**:
1. Sign up на Together AI
2. Settings → API Keys
3. Generate new key

**Налаштування**:

`.env`:
```bash
LLAMA_API_URL=https://api.together.xyz/v1
LLAMA_API_KEY=xxxxxxxxxxxxxxxxxxxxx
LLAMA_MODEL=meta-llama/Llama-3.1-70B-Instruct-Turbo
```

### Варіант 3: Replicate

**Реєстрація**: https://replicate.com/

**Отримати API ключ**:
1. Sign up
2. Account → API tokens
3. Create token

**Налаштування**:

`.env`:
```bash
LLAMA_API_URL=https://api.replicate.com/v1
LLAMA_API_KEY=r8_xxxxxxxxxxxxxxxxxxxxx
LLAMA_MODEL=meta/llama-2-70b-chat
```

### Варіант 4: OpenRouter (Підтримує багато моделей)

**Реєстрація**: https://openrouter.ai/

**Налаштування**:

`.env`:
```bash
LLAMA_API_URL=https://openrouter.ai/api/v1
LLAMA_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxx
LLAMA_MODEL=meta-llama/llama-3.1-70b-instruct
```

---

## 🔧 Налаштування Backend

### 1. Оновити LlamaApiProperties.java

Якщо використовуєте зовнішній API, потрібно додати підтримку API ключа:

```java
// backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/config/LlamaApiProperties.java

@ConfigurationProperties(prefix = "llama.api")
public class LlamaApiProperties {
    private String url = "http://localhost:11434";
    private String key; // ДОДАТИ ЦЕ ПОЛЕ
    private String model = "llama3.1";
    private int timeout = 120000;
    private int maxRetries = 3;
    
    // Getters and Setters
    public String getKey() {
        return key;
    }
    
    public void setKey(String key) {
        this.key = key;
    }
    
    // ...existing getters/setters...
}
```

### 2. Оновити LlamaApiService.java

Додати Authorization header:

```java
// backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/service/LlamaApiService.java

private WebClient webClient;

public LlamaApiService(LlamaApiProperties properties) {
    WebClient.Builder builder = WebClient.builder()
        .baseUrl(properties.getUrl())
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
    
    // Додати API key якщо він є
    if (properties.getKey() != null && !properties.getKey().isEmpty()) {
        builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getKey());
    }
    
    this.webClient = builder.build();
}
```

### 3. Docker Compose з API ключем

**docker-compose.yml**:
```yaml
services:
  ai-service:
    environment:
      - LLAMA_API_URL=${LLAMA_API_URL}
      - LLAMA_API_KEY=${LLAMA_API_KEY}  # Додати
      - LLAMA_MODEL=${LLAMA_MODEL}
```

---

## ✅ Перевірка з'єднання

### Для Ollama (локально):

```bash
# 1. Перевірити чи працює Ollama
curl http://localhost:11434/api/version

# Має повернути:
# {"version":"0.x.x"}

# 2. Перевірити модель
curl http://localhost:11434/api/tags

# 3. Тестовий запит
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Hello, how are you?",
  "stream": false
}'
```

### Для зовнішніх API:

#### Groq:
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $LLAMA_API_KEY"
```

#### Together AI:
```bash
curl https://api.together.xyz/v1/models \
  -H "Authorization: Bearer $LLAMA_API_KEY"
```

### Перевірка через AI Service:

```bash
# Запустити проєкт
./start.sh --with-ai

# Перевірити health
curl http://localhost:8084/actuator/health

# Тестова генерація
curl -X POST http://localhost:8084/api/ai/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test course",
    "language": "uk",
    "include_modules": true
  }'
```

---

## 🎯 Рекомендації

### Для розробки (Development):
✅ **Ollama локально** - безкоштовно, приватно, без лімітів

### Для production (без потужного сервера):
- **Groq** - швидкий, безкоштовний tier
- **Together AI** - хороші ціни
- **OpenRouter** - багато моделей

### Для production (з потужним сервером):
✅ **Ollama на сервері** - повний контроль, приватність

---

## 🔒 Безпека API Ключів

### ❌ НЕ РОБИТИ:
```bash
# НЕ коммітити .env файли з ключами
git add .env  # ❌ WRONG

# НЕ хардкодити ключі у код
LLAMA_API_KEY="gsk_xxxxxx"  # ❌ WRONG
```

### ✅ РОБИТИ:
```bash
# Використовувати .env файли (які в .gitignore)
echo "LLAMA_API_KEY=your_key_here" >> .env

# Використовувати змінні середовища
export LLAMA_API_KEY="your_key_here"

# У production використовувати secrets management
# - Docker secrets
# - Kubernetes secrets
# - AWS Secrets Manager
# - Azure Key Vault
```

---

## 📊 Порівняння опцій

| Провайдер | Вартість | Швидкість | Приватність | Складність |
|-----------|----------|-----------|-------------|------------|
| **Ollama (локально)** | ✅ Безкоштовно | ⚡ Швидко | 🔒 Максимум | 🟢 Легко |
| **Groq** | 💰 Free tier | ⚡⚡ Дуже швидко | ⚠️ Хмара | 🟢 Легко |
| **Together AI** | 💰 Pay-as-you-go | ⚡ Швидко | ⚠️ Хмара | 🟢 Легко |
| **Replicate** | 💰💰 Дорожче | ⚡ Швидко | ⚠️ Хмара | 🟡 Середнє |
| **OpenRouter** | 💰 Гнучко | ⚡ Варіюється | ⚠️ Хмара | 🟢 Легко |

---

## 🎓 Приклади використання

### З Ollama (без ключа):
```typescript
// Frontend автоматично працює
// Просто запустіть: ./start.sh --with-ai
```

### З зовнішнім API:
```bash
# 1. Отримати ключ на Groq
# 2. Додати в .env
echo "LLAMA_API_KEY=gsk_xxxxxx" >> .env

# 3. Оновити docker-compose.yml (вже зроблено вище)

# 4. Запустити
docker-compose --profile ai up -d

# 5. Використовувати через UI
# Відкрити http://localhost:3000
# Courses → 🤖 AI Generator
```

---

## 🐛 Troubleshooting

### Помилка: "Connection refused" (Ollama)
```bash
# Перевірити чи працює
ps aux | grep ollama

# Запустити якщо немає
ollama serve
```

### Помилка: "Unauthorized" (зовнішній API)
```bash
# Перевірити ключ
echo $LLAMA_API_KEY

# Перевірити формат
# Groq: має починатись з "gsk_"
# Together: довга hex строка
# OpenRouter: починається з "sk-or-"
```

### Помилка: "Model not found"
```bash
# Ollama - завантажити модель
ollama pull llama3.1

# Зовнішній API - перевірити назву моделі
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $LLAMA_API_KEY"
```

---

## 📚 Додаткові ресурси

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Groq API Docs](https://console.groq.com/docs)
- [Together AI Docs](https://docs.together.ai/)
- [OpenRouter Docs](https://openrouter.ai/docs)

---

**Рекомендація**: Почніть з **Ollama локально** - це найпростіший та безкоштовний варіант!

