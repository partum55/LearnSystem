# 🚀 ГОТОВО! AI через Groq API (без завантаження моделі)

## ✅ Налаштовано для використання Groq API

Система налаштована для роботи з **Groq API** - швидким, безкоштовним хмарним сервісом.

**Ви НЕ потрібно**:
- ❌ Завантажувати модель (4-8 GB)
- ❌ Встановлювати Ollama
- ❌ Мати потужний комп'ютер

**Вам потрібно**:
- ✅ Безкоштовний API ключ (2 хвилини)
- ✅ Інтернет
- ✅ Docker

---

## 🎯 Швидкий старт (5 хвилин)

### Крок 1: Отримати API ключ

1. Перейти на **https://console.groq.com/**
2. Зареєструватись (безкоштовно)
3. Перейти у **"API Keys"**
4. Натиснути **"Create API Key"**
5. Скопіювати ключ (починається з `gsk_...`)

### Крок 2: Додати ключ

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU

# Додати ключ у .env
nano .env

# Або через команду:
echo "LLAMA_API_KEY=gsk_ваш_ключ_тут" >> .env
```

**Перевірте що у .env є**:
```bash
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_ваш_справжній_ключ
LLAMA_MODEL=llama-3.1-70b-versatile
```

### Крок 3: Запустити

```bash
./start.sh --with-ai
```

### Крок 4: Використовувати

```
http://localhost:3000
→ Courses 
→ 🤖 AI Generator
→ Генерувати курс!
```

---

## 📁 Що було змінено

### Backend
```
✅ application.yml - додано LLAMA_API_KEY
✅ LlamaApiProperties.java - додано поле key
✅ WebClientConfig.java - Authorization header
✅ Дефолт: Groq API замість Ollama
```

### Конфігурація
```
✅ .env - Groq API за замовчуванням
✅ docker-compose.yml - AI сервіс без Ollama
✅ Ollama тепер опціональний (--profile ollama)
```

### Документація
```
✅ GROQ_SETUP_QUICK.md - швидкий гайд (5 хв)
✅ AI_README.md - оновлена рекомендація
✅ Цей файл - інструкції для API
```

---

## 🎯 Переваги Groq API

| Параметр | Groq API | Ollama локально |
|----------|----------|-----------------|
| **Встановлення** | 2 хвилини | 30+ хвилин |
| **Розмір** | 0 MB | 4-8 GB |
| **Швидкість** | ⚡⚡⚡ Дуже швидко | ⚡⚡ Швидко |
| **Вартість** | Безкоштовно | Безкоштовно |
| **Потужність ПК** | Будь-яка | Мінімум 8GB RAM |
| **Інтернет** | Потрібен | Не потрібен |
| **Модель** | Llama 3.1 70B | Llama 3.1 8B/70B |

**Для більшості випадків Groq API - кращий вибір!**

---

## 📊 Ліміти безкоштовного Groq

- **14,400 запитів на день** (достатньо для 100+ генерацій)
- **30 запитів на хвилину**
- **6,000 токенів на хвилину**

Для LMS це **більш ніж достатньо**!

---

## 🔧 Якщо хочете Ollama (локально)

```bash
# 1. Змінити .env:
LLAMA_API_URL=http://ollama:11434
LLAMA_MODEL=llama3.1
# LLAMA_API_KEY не потрібен

# 2. Запустити з Ollama:
docker-compose --profile ai --profile ollama up -d

# 3. Завантажити модель:
docker exec lms-ollama ollama pull llama3.1
```

---

## 🐛 Troubleshooting

### Помилка: "Unauthorized"

```bash
# Перевірити ключ
cat .env | grep LLAMA_API_KEY

# Має бути: LLAMA_API_KEY=gsk_...
# Якщо ні - скопіюйте правильний ключ з console.groq.com
```

### Помилка: "Rate limit"

Перевищено ліміт (14,400/день).
- Почекайте до наступного дня
- Або створіть новий обліковий запис

### AI не працює

```bash
# Перевірити статус
docker logs lms-ai-service

# Перезапустити
docker-compose restart ai-service

# Перевірити
curl http://localhost:8084/actuator/health
```

---

## 📚 Документація

| Файл | Опис |
|------|------|
| **GROQ_SETUP_QUICK.md** | 🚀 Швидке налаштування Groq (5 хв) |
| **LLAMA_API_SETUP.md** | 🔑 Всі провайдери API |
| **AI_CONTEXT_GENERATION_GUIDE.md** | 🎯 Приклади використання |

---

## ✅ Чеклист

```
□ Зареєструвався на console.groq.com
□ Отримав API ключ (gsk_...)
□ Додав у .env: LLAMA_API_KEY=gsk_...
□ Перевірив .env: LLAMA_API_URL=https://api.groq.com/openai/v1
□ Запустив: ./start.sh --with-ai
□ Відкрив: http://localhost:3000
□ Перевірив кнопку: Courses → 🤖 AI Generator
□ Згенерував тестовий курс
```

---

## 🎉 Готово!

**Тепер у вас працює AI-генерація через Groq API!**

```bash
# Запустити
./start.sh --with-ai

# Відкрити
http://localhost:3000

# Генерувати
Courses → 🤖 AI Generator → Створити курс!
```

**Швидко, безкоштовно, без завантажень! 🚀**

---

**Дата**: 13 листопада 2024  
**Налаштовано на**: Groq API (Llama 3.1 70B)  
**Статус**: ✅ ГОТОВО

