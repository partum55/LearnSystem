# LMS AI Service - Інтеграція з Llama API

## Опис

AI сервіс для автоматичного створення та редагування курсів, модулів, завдань та квізів за допомогою Llama API.

## Можливості

### 1. Генерація курсів
- Створення повної структури курсу з описом
- Автоматична генерація модулів
- Створення завдань різних типів
- Генерація квізів з питаннями та відповідями
- Підтримка української та англійської мов

### 2. Редагування контенту
- Редагування існуючих курсів за допомогою промптів
- Оновлення модулів
- Модифікація завдань та квізів

### 3. Збереження в БД
- Автоматичне збереження згенерованого контенту
- Інтеграція з Learning Service (course + assessment domains)
- Підтримка транзакцій

## Налаштування

### Конфігурація Llama API

Додайте в `application.yml` або встановіть змінні середовища:

```yaml
llama:
  api:
    url: http://localhost:11434  # URL Ollama сервера
    model: llama3.1              # Модель для використання
    timeout: 120000              # Таймаут у мілісекундах
    max-retries: 3               # Кількість повторних спроб
```

Змінні середовища:
```bash
LLAMA_API_URL=http://localhost:11434
LLAMA_MODEL=llama3.1
```

### Встановлення Ollama

1. Встановіть Ollama:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

2. Завантажте модель Llama:
```bash
ollama pull llama3.1
```

3. Запустіть Ollama сервер:
```bash
ollama serve
```

## API Endpoints

### 1. Генерація курсу (тільки preview)

**POST** `/api/ai/courses/generate`

Request:
```json
{
  "prompt": "Створи курс з основ програмування на Python для початківців",
  "language": "uk",
  "include_modules": true,
  "include_assignments": true,
  "include_quizzes": true,
  "academic_year": "2024-2025"
}
```

Response: Структура курсу у вигляді JSON (не зберігається в БД)

### 2. Генерація та збереження курсу

**POST** `/api/ai/courses/generate-and-save`

Headers:
```
Authorization: Bearer <token>
X-User-Id: <user-uuid>
```

Request: Той самий що й для `/generate`

Response: Збережений курс з усіма ID

### 3. Редагування контенту

**POST** `/api/ai/content/edit`

Request:
```json
{
  "prompt": "Додай більше практичних прикладів",
  "entity_type": "MODULE",
  "current_data": "{...JSON курентного модуля...}",
  "language": "uk"
}
```

### 4. Генерація тільки модулів

**POST** `/api/ai/modules/generate?courseId={uuid}&prompt={text}&language=uk&moduleCount=5`

### 5. Генерація завдань

**POST** `/api/ai/assignments/generate?moduleId={uuid}&moduleTopic={text}&language=uk&assignmentCount=3`

### 6. Генерація квізу

**POST** `/api/ai/quizzes/generate?courseId={uuid}&topic={text}&language=uk&questionCount=10&timeLimit=30`

## Приклади використання

### Приклад 1: Створення курсу з модулями

```bash
curl -X POST http://localhost:8085/api/ai/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Створи курс \"Вступ до Machine Learning\" з 6 модулів, що покривають основи ML, supervised learning, unsupervised learning, neural networks, deep learning та практичні проєкти",
    "language": "uk",
    "include_modules": true,
    "include_assignments": false,
    "include_quizzes": false,
    "academic_year": "2024-2025"
  }'
```

### Приклад 2: Створення та збереження повного курсу

```bash
curl -X POST http://localhost:8085/api/ai/courses/generate-and-save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: <user-uuid>" \
  -d '{
    "prompt": "Курс з веб-розробки: HTML, CSS, JavaScript, React, Node.js. Кожен модуль має містити 2-3 завдання та 1 квіз",
    "language": "uk",
    "include_modules": true,
    "include_assignments": true,
    "include_quizzes": true
  }'
```

### Приклад 3: Редагування модуля

```bash
curl -X POST http://localhost:8085/api/ai/content/edit \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Зроби опис більш детальним та додай посилання на ресурси для самостійного вивчення",
    "entity_type": "MODULE",
    "current_data": "{\"title\": \"Основи Python\", \"description\": \"Вступ до Python\"}",
    "language": "uk"
  }'
```

## Структура відповіді

Згенерований курс має таку структуру:

```json
{
  "course": {
    "code": "CS101",
    "titleUk": "Назва курсу",
    "titleEn": "Course Title",
    "descriptionUk": "Опис українською",
    "descriptionEn": "Description in English",
    "syllabus": "Детальний силабус...",
    "startDate": "2024-09-01",
    "endDate": "2024-12-20",
    "academicYear": "2024-2025",
    "maxStudents": 30
  },
  "modules": [
    {
      "title": "Модуль 1",
      "description": "Опис модуля",
      "position": 1,
      "assignments": [
        {
          "title": "Завдання 1",
          "description": "Опис завдання",
          "assignmentType": "FILE_UPLOAD",
          "instructions": "Детальні інструкції",
          "position": 1,
          "maxPoints": 100,
          "timeLimit": null
        }
      ],
      "quizzes": [
        {
          "title": "Квіз 1",
          "description": "Опис квізу",
          "timeLimit": 30,
          "attemptsAllowed": 2,
          "shuffleQuestions": true,
          "questions": [
            {
              "questionText": "Питання?",
              "questionType": "MULTIPLE_CHOICE",
              "points": 10,
              "answerOptions": [
                {
                  "text": "Варіант A",
                  "isCorrect": true,
                  "feedback": "Правильно!"
                },
                {
                  "text": "Варіант B",
                  "isCorrect": false,
                  "feedback": "Неправильно"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Типи завдань

- `FILE_UPLOAD` - Завантаження файлів
- `TEXT` - Текстова відповідь
- `CODE` - Код-сабмішн
- `QUIZ` - Квіз
- `URL` - Посилання
- `MANUAL_GRADE` - Ручна оцінка
- `EXTERNAL` - Зовнішній інструмент

## Типи питань

- `MULTIPLE_CHOICE` - Вибір одного варіанту
- `TRUE_FALSE` - Так/Ні
- `SHORT_ANSWER` - Коротка відповідь
- `ESSAY` - Есе

## Запуск сервісу

```bash
cd backend-spring/lms-ai-service
mvn spring-boot:run
```

Або через батьківський проєкт:

```bash
cd backend-spring
mvn clean install
cd lms-ai-service
mvn spring-boot:run
```

## Вимоги

- Java 21
- Spring Boot 3.2.2
- Ollama з моделлю Llama 3.1
- Learning Service (порт 8089)

## Порт

За замовчуванням сервіс запускається на порту **8085**.

## Логування

Всі запити до Llama API логуються. Для налаштування рівня логування:

```yaml
logging:
  level:
    com.university.lms.ai: DEBUG
```

## Troubleshooting

### Помилка з'єднання з Ollama

Переконайтеся що Ollama запущена:
```bash
ollama serve
```

Перевірте доступність:
```bash
curl http://localhost:11434/api/version
```

### Таймаути

Якщо генерація займає багато часу, збільште таймаут:
```yaml
llama:
  api:
    timeout: 180000  # 3 хвилини
```

### Проблеми з JSON парсингом

AI іноді може повертати невалідний JSON. Сервіс автоматично очищає markdown блоки, але якщо проблема залишається, спробуйте:
- Використати більш конкретний промпт
- Додати приклади до системного промпту
- Змінити параметри температури

## Розробка

Для тестування без Ollama можна мокувати `LlamaApiService`:

```java
@MockBean
private LlamaApiService llamaApiService;

when(llamaApiService.generateJson(any(), any()))
    .thenReturn("{ ... test json ... }");
```
