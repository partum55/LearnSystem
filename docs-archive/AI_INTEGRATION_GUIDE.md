# 🤖 AI Integration Guide - Llama 3.1 для Генерації Курсів

Цей посібник описує інтеграцію AI-сервісу на базі Llama 3.1 для автоматичної генерації курсів, модулів, завдань та квізів у LMS системі.

## 📋 Зміст

1. [Огляд](#огляд)
2. [Архітектура](#архітектура)
3. [Встановлення та Запуск](#встановлення-та-запуск)
4. [Використання Frontend](#використання-frontend)
5. [API Endpoints](#api-endpoints)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Огляд

AI сервіс використовує **Llama 3.1** через **Ollama** для:
- ✅ Автоматичної генерації структури курсів
- ✅ Створення модулів з описами
- ✅ Генерації практичних завдань
- ✅ Створення квізів з питаннями та відповідями
- ✅ Редагування існуючого контенту
- ✅ Підтримки української та англійської мов

## 🏗️ Архітектура

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│  AI Service  │─────▶│   Ollama    │
│  (React)    │◀─────│  (Spring)    │◀─────│  (Llama)    │
│  Port 3000  │      │   Port 8084  │      │  Port 11434 │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │                     ▼
       │             ┌──────────────┐
       └────────────▶│ Course/User  │
                     │   Service    │
                     │  Port 8080   │
                     └──────────────┘
```

### Компоненти

1. **Frontend (React)**
   - Компонент `AICourseGenerator` для UI
   - API клієнт `api/ai.ts` для взаємодії з AI сервісом

2. **AI Service (Spring Boot)**
   - REST API на порту 8084
   - Інтеграція з Ollama через REST API
   - Збереження згенерованого контенту в БД

3. **Ollama (LLM Server)**
   - Сервер для запуску Llama 3.1
   - Локальна обробка AI запитів (без хмари!)
   - Порт 11434

---

## 🚀 Встановлення та Запуск

### Варіант 1: Швидкий старт (рекомендовано)

```bash
# З AI інтеграцією
./start.sh --with-ai

# Без AI (тільки базова система)
./start.sh
```

### Варіант 2: Docker Compose вручну

```bash
# Запустити всі сервіси включаючи AI
docker-compose --profile ai up -d

# Завантажити модель Llama 3.1 (виконати після старту)
docker exec lms-ollama ollama pull llama3.1

# Переглянути логи
docker-compose logs -f ai-service
```

### Варіант 3: Локальний розвиток

#### 1. Встановити Ollama локально

```bash
# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# Завантажити модель
ollama pull llama3.1

# Запустити сервер
ollama serve
```

#### 2. Запустити AI Service

```bash
cd backend-spring/lms-ai-service
mvn spring-boot:run
```

#### 3. Запустити Frontend

```bash
cd frontend
npm install
npm start
```

---

## 💻 Використання Frontend

### 1. Додати компонент у додаток

```typescript
// У вашому компоненті courses або dashboard
import { AICourseGenerator } from '../components/AICourseGenerator';

// У JSX
<AICourseGenerator 
  onCourseGenerated={(course) => {
    console.log('Generated course:', course);
    // Оновити список курсів
  }}
  onClose={() => setShowAIModal(false)}
/>
```

### 2. Приклад використання API безпосередньо

```typescript
import { aiApi } from '../api/ai';

// Згенерувати курс
const generateCourse = async () => {
  try {
    const response = await aiApi.generateCourse({
      prompt: "Створи курс з Machine Learning для початківців",
      language: "uk",
      include_modules: true,
      include_assignments: true,
      module_count: 6,
    });
    console.log(response.data);
  } catch (error) {
    console.error('AI Error:', error);
  }
};

// Згенерувати та зберегти
const generateAndSave = async (userId: string) => {
  const response = await aiApi.generateAndSaveCourse(
    {
      prompt: "Python для Data Science",
      language: "uk",
    },
    userId
  );
};

// Редагувати існуючий контент
const editContent = async () => {
  const response = await aiApi.editContent({
    entity_type: 'MODULE',
    entity_id: 'module-uuid',
    current_content: "Поточний опис модуля...",
    edit_prompt: "Додай більше практичних прикладів",
    language: "uk",
  });
};
```

---

## 🔌 API Endpoints

### Базова URL
```
http://localhost:8084/api
```

### 1. Генерація курсу (Preview)

**POST** `/ai/courses/generate`

```json
{
  "prompt": "Створи курс з основ програмування",
  "language": "uk",
  "include_modules": true,
  "include_assignments": true,
  "include_quizzes": true,
  "module_count": 4,
  "assignment_count": 3
}
```

**Response:**
```json
{
  "title": "Основи програмування",
  "description": "...",
  "academic_year": "2024-2025",
  "modules": [
    {
      "title": "Введення в програмування",
      "description": "...",
      "order_index": 1,
      "assignments": [...],
      "quizzes": [...]
    }
  ]
}
```

### 2. Генерація та збереження

**POST** `/ai/courses/generate-and-save`

Headers:
```
Authorization: Bearer <token>
X-User-Id: <user-uuid>
```

Body: той самий що й для `/generate`

### 3. Редагування контенту

**POST** `/ai/content/edit`

```json
{
  "entity_type": "MODULE",
  "entity_id": "uuid",
  "current_content": "Поточний текст...",
  "edit_prompt": "Зроби більш детальним",
  "language": "uk"
}
```

### 4. Генерація модулів

**POST** `/ai/modules/generate?courseId=<uuid>&prompt=...&moduleCount=4`

### 5. Генерація завдань

**POST** `/ai/assignments/generate?moduleId=<uuid>&moduleTopic=...&assignmentCount=3`

### 6. Генерація квізу

**POST** `/ai/quizzes/generate?moduleId=<uuid>&topic=...&questionCount=10`

### 7. Health Check

**GET** `/ai/health`

---

## 🔧 Конфігурація

### Environment Variables

**Backend (AI Service)**
```bash
LLAMA_API_URL=http://localhost:11434
LLAMA_MODEL=llama3.1
COURSE_SERVICE_URL=http://localhost:8081
ASSESSMENT_SERVICE_URL=http://localhost:8083
```

**Frontend**
```bash
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_AI_SERVICE_URL=http://localhost:8084/api
```

### Docker Compose

Сервіси AI доступні через профіль `ai`:

```yaml
# docker-compose.yml
services:
  ollama:
    profiles: [ai]
  ai-service:
    profiles: [ai]
```

---

## 🐛 Troubleshooting

### 1. Ollama не завантажує модель

```bash
# Перевірити статус
docker exec lms-ollama ollama list

# Завантажити модель вручну
docker exec lms-ollama ollama pull llama3.1

# Перевірити розмір диска
df -h
```

### 2. AI Service не може підключитися до Ollama

```bash
# Перевірити чи працює Ollama
curl http://localhost:11434/api/version

# Перевірити логи
docker logs lms-ollama
docker logs lms-ai-service

# Перезапустити
docker-compose restart ollama ai-service
```

### 3. Повільна генерація

**Причини:**
- Перший запуск завжди повільніший (завантаження моделі)
- Недостатньо RAM (потрібно мінімум 8GB)
- CPU замість GPU

**Рішення:**
```bash
# Зменшити розмір моделі
LLAMA_MODEL=llama3.1:8b  # замість llama3.1:70b

# Збільшити таймаут у application.yml
llama:
  api:
    timeout: 300000  # 5 хвилин
```

### 4. Frontend не бачить AI Service

```bash
# Перевірити .env у frontend
cat frontend/.env

# Має бути:
REACT_APP_AI_SERVICE_URL=http://localhost:8084/api

# Перезапустити frontend
cd frontend && npm start
```

### 5. CORS помилки

Переконайтеся що у `ai-service` є правильні CORS налаштування:

```yaml
# application.yml
spring:
  web:
    cors:
      allowed-origins: 
        - http://localhost:3000
      allowed-methods: [GET, POST, PUT, DELETE, OPTIONS]
```

---

## 📊 Моніторинг

### Перевірити статус всіх сервісів

```bash
docker-compose ps
```

### Логи AI Service

```bash
docker logs -f lms-ai-service
```

### Логи Ollama

```bash
docker logs -f lms-ollama
```

### Перевірити доступність API

```bash
# Health check
curl http://localhost:8084/actuator/health

# Ollama version
curl http://localhost:11434/api/version

# Test generation
curl -X POST http://localhost:8084/api/ai/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test course",
    "language": "uk",
    "include_modules": true
  }'
```

---

## 🎓 Приклади використання

### Приклад 1: Курс з Python

```json
{
  "prompt": "Створи повний курс з Python для початківців. Включи основи синтаксису, структури даних, ООП, та роботу з файлами. Додай практичні завдання після кожного модуля.",
  "language": "uk",
  "include_modules": true,
  "include_assignments": true,
  "include_quizzes": true,
  "module_count": 6,
  "assignment_count": 4,
  "quiz_count": 10
}
```

### Приклад 2: Курс з веб-розробки

```json
{
  "prompt": "Курс з веб-розробки: HTML, CSS, JavaScript, React. З акцентом на практику та реальні проєкти.",
  "language": "uk",
  "include_modules": true,
  "include_assignments": true,
  "module_count": 8
}
```

### Приклад 3: Редагування модуля

```json
{
  "entity_type": "MODULE",
  "current_content": "Цей модуль розглядає основи баз даних",
  "edit_prompt": "Додай секцію про NoSQL бази даних та MongoDB з прикладами",
  "language": "uk"
}
```

---

## 📚 Додаткові ресурси

- [Ollama Documentation](https://ollama.com/docs)
- [Llama 3.1 Model Card](https://ollama.com/library/llama3.1)
- [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/)

---

## 🤝 Внесок та підтримка

Якщо виникли проблеми або є ідеї для покращення AI інтеграції:

1. Перевірте [Troubleshooting](#troubleshooting)
2. Перегляньте логи сервісів
3. Створіть Issue з детальним описом

---

## 📝 Changelog

### v1.0.0 (2024-11-13)
- ✨ Початкова інтеграція Llama 3.1 через Ollama
- ✨ Frontend компонент AICourseGenerator
- ✨ API клієнт для AI сервісу
- ✨ Docker Compose з AI профілем
- ✨ Автоматизований скрипт запуску
- ✨ Підтримка української та англійської мов

