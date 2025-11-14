# 🚀 Швидке налаштування Groq API (5 хвилин)

## Крок 1: Отримати безкоштовний API ключ

1. Перейти на **https://console.groq.com/**
2. Натиснути **"Sign Up"** (реєстрація безкоштовна)
3. Підтвердити email
4. Перейти у розділ **"API Keys"**
5. Натиснути **"Create API Key"**
6. Скопіювати ключ (він починається з `gsk_...`)

**Важливо**: Зберігайте ключ у безпечному місці! Він показується тільки один раз.

---

## Крок 2: Додати ключ у .env файл

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU

# Відкрити .env файл
nano .env

# Або просто додати через команду:
echo 'LLAMA_API_KEY=gsk_ваш_ключ_тут' >> .env
```

**Вміст .env** (перевірте що є ці рядки):
```bash
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_ваш_справжній_ключ_тут
LLAMA_MODEL=llama-3.1-70b-versatile
```

---

## Крок 3: Запустити систему

```bash
# Запустити з AI
./start.sh --with-ai

# Система запуститься БЕЗ Ollama, використовуючи Groq API
```

---

## Крок 4: Перевірити

```bash
# Перевірити що AI працює
./test-connection.sh

# Або вручну:
curl http://localhost:8084/actuator/health
```

Має повернути: `{"status":"UP"}`

---

## Крок 5: Використовувати!

1. Відкрити **http://localhost:3000**
2. Увійти як викладач
3. **Courses → 🤖 AI Generator**
4. Згенерувати курс!

---

## 🎯 Переваги Groq API

✅ **Безкоштовно** - generous free tier  
✅ **Швидко** - один з найшвидших API  
✅ **Без встановлення** - не потрібно завантажувати модель  
✅ **Надійно** - професійна інфраструктура  
✅ **Llama 3.1 70B** - потужна модель  

---

## 💰 Ліміти безкоштовного плану

- **14,400 запитів на день**
- **Llama 3.1 8B**: 30 запитів/хв, 7,000 токенів/хв
- **Llama 3.1 70B**: 30 запитів/хв, 6,000 токенів/хв

Для LMS це **більш ніж достатньо**!

---

## 🔧 Альтернативні моделі Groq

Якщо хочете швидшу, але менш потужну модель:

```bash
# У .env змінити:
LLAMA_MODEL=llama-3.1-8b-instant  # Швидша
```

Доступні моделі:
- `llama-3.1-70b-versatile` - Найпотужніша (рекомендовано)
- `llama-3.1-8b-instant` - Найшвидша
- `llama3-70b-8192` - Llama 3
- `mixtral-8x7b-32768` - Mixtral (альтернатива)

---

## 🐛 Troubleshooting

### Помилка: "Unauthorized"

```bash
# Перевірити чи правильний ключ
cat .env | grep LLAMA_API_KEY

# Ключ має починатись з gsk_
# Якщо ні - скопіюйте правильний ключ з Groq Console
```

### Помилка: "Rate limit exceeded"

Ви перевищили безкоштовний ліміт (14,400 запитів/день).
- Почекайте до наступного дня
- Або перейдіть на платний план ($0.27 за 1M токенів)

### AI не генерує

```bash
# Перевірити логи
docker logs lms-ai-service

# Перевірити чи сервіс запущений
docker ps | grep ai-service

# Перезапустити
docker-compose restart ai-service
```

---

## 📚 Документація Groq

- **Console**: https://console.groq.com/
- **Docs**: https://console.groq.com/docs
- **Models**: https://console.groq.com/docs/models
- **Pricing**: https://groq.com/pricing/

---

## ✅ Готово!

Тепер у вас працює **AI-генерація через Groq API** без локальної моделі!

```bash
# Запустити
./start.sh --with-ai

# Використовувати
http://localhost:3000 → Courses → 🤖 AI Generator
```

**Швидко, безкоштовно, без завантажень! 🚀**

