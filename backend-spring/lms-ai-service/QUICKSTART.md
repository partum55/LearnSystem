# Швидкий старт AI Service

## Крок 1: Встановлення Ollama

```bash
# Встановлення Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Завантаження моделі Llama 3.1
ollama pull llama3.1

# Запуск Ollama (в окремому терміналі)
ollama serve
```

## Крок 2: Запуск сервісів

У різних терміналах запустіть:

```bash
# Термінал 1: Course Service
cd backend-spring/lms-course-service
mvn spring-boot:run

# Термінал 2: Assessment Service  
cd backend-spring/lms-assessment-service
mvn spring-boot:run

# Термінал 3: AI Service
cd backend-spring/lms-ai-service
mvn spring-boot:run
```

## Крок 3: Тестування

### Приклад 1: Генерація курсу (preview)

```bash
curl -X POST http://localhost:8084/api/ai/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Створи курс з основ Python програмування для початківців. Курс має охоплювати змінні, типи даних, умовні конструкції, цикли, функції та об'\''єктно-орієнтоване програмування.",
    "language": "uk",
    "include_modules": true,
    "include_assignments": false,
    "include_quizzes": false
  }'
```

### Приклад 2: Генерація курсу з завданнями та квізами

```bash
curl -X POST http://localhost:8084/api/ai/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Курс \"Веб-розробка з JavaScript\". 5 модулів: Основи JS, DOM, Async JS, React, Node.js. Кожен модуль має 2 практичних завдання та 1 квіз з 8 питань.",
    "language": "uk",
    "include_modules": true,
    "include_assignments": true,
    "include_quizzes": true,
    "academic_year": "2024-2025"
  }' | jq .
```

### Приклад 3: Генерація та збереження (потрібна авторизація)

```bash
# Спочатку отримайте токен від User Service
TOKEN="your-jwt-token"
USER_ID="your-user-uuid"

curl -X POST http://localhost:8084/api/ai/courses/generate-and-save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "prompt": "Курс Machine Learning для студентів 3 курсу. 8 модулів з теорією та практичними завданнями.",
    "language": "uk",
    "include_modules": true,
    "include_assignments": true,
    "include_quizzes": true
  }' | jq .
```

### Приклад 4: Редагування контенту

```bash
curl -X POST http://localhost:8084/api/ai/content/edit \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Зроби опис більш детальним, додай приклади використання у реальному житті та посилання на додаткові матеріали",
    "entity_type": "MODULE",
    "current_data": "{\"title\": \"Основи Python\", \"description\": \"Вступ до програмування\"}",
    "language": "uk"
  }'
```

### Приклад 5: Генерація тільки модулів

```bash
COURSE_ID="existing-course-uuid"

curl -X POST "http://localhost:8084/api/ai/modules/generate?courseId=$COURSE_ID&prompt=Створи 6 модулів для курсу з баз даних&language=uk&moduleCount=6" \
  -H "Content-Type: application/json" | jq .
```

### Приклад 6: Генерація завдань для модуля

```bash
MODULE_ID="existing-module-uuid"

curl -X POST "http://localhost:8084/api/ai/assignments/generate?moduleId=$MODULE_ID&moduleTopic=Функції в Python&language=uk&assignmentCount=4" \
  -H "Content-Type: application/json" | jq .
```

### Приклад 7: Генерація квізу

```bash
COURSE_ID="existing-course-uuid"

curl -X POST "http://localhost:8084/api/ai/quizzes/generate?courseId=$COURSE_ID&topic=Основи HTML та CSS&language=uk&questionCount=15&timeLimit=45" \
  -H "Content-Type: application/json" | jq .
```

## Підказки для кращих промптів

### ✅ Хороші промпти:

```
"Створи курс з Machine Learning для студентів 3 курсу. 
Курс має включати: основи ML, supervised learning (лінійна регресія, 
класифікація), unsupervised learning (кластеризація), нейронні мережі, 
deep learning та практичний проєкт."

"Курс веб-розробки з 8 модулів. Кожен модуль фокусується на окремій 
технології: HTML5, CSS3, JavaScript ES6+, React, Redux, Node.js, 
Express, MongoDB. Кожен модуль має практичне завдання та квіз."
```

### ❌ Погані промпти:

```
"Зроби курс"  // занадто загально
"Python"      // недостатньо деталей
```

## Перевірка статусу

```bash
# Health check
curl http://localhost:8084/api/ai/health

# Перевірка Ollama
curl http://localhost:11434/api/version
```

## Змінні середовища (опціонально)

Створіть файл `.env`:

```bash
LLAMA_API_URL=http://localhost:11434
LLAMA_MODEL=llama3.1
COURSE_SERVICE_URL=http://localhost:8081
ASSESSMENT_SERVICE_URL=http://localhost:8083
```

## Troubleshooting

### Проблема: "Connection refused to Ollama"

```bash
# Перевірте чи запущена Ollama
ps aux | grep ollama

# Якщо ні, запустіть:
ollama serve
```

### Проблема: "Model not found"

```bash
# Завантажте модель
ollama pull llama3.1

# Перевірте доступні моделі
ollama list
```

### Проблема: "Timeouts"

Збільште таймаут в `application.yml`:

```yaml
llama:
  api:
    timeout: 180000  # 3 хвилини
```

### Проблема: "Invalid JSON response"

AI іноді може додавати текст до JSON. Сервіс автоматично очищає markdown блоки, але якщо проблема залишається:

1. Використайте більш конкретний промпт
2. Додайте приклади у промпт
3. Спробуйте іншу модель: `ollama pull llama3.2`

## Альтернативні моделі

```bash
# Легша модель (швидше, але менш точна)
ollama pull llama3.2
export LLAMA_MODEL=llama3.2

# Потужніша модель (повільніше, але якісніше)
ollama pull llama3.1:70b
export LLAMA_MODEL=llama3.1:70b
```

## Логи

Логи знаходяться в консолі. Для детальнішого логування:

```yaml
logging:
  level:
    com.university.lms.ai: TRACE
    org.springframework.web.reactive: DEBUG
```

