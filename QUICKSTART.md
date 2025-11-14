# 🎯 Швидкий старт після інтеграції

## ✅ Що було зроблено

### 1. **Frontend з'єднано з Backend**
- ✅ Frontend `.env` оновлено на Spring Boot API (port 8080)
- ✅ Docker Compose налаштовано для всіх сервісів
- ✅ CORS конфігурація для frontend-backend комунікації

### 2. **AI Інтеграція (Llama 3.1) готова**
- ✅ AI Service додано в Docker Compose
- ✅ Ollama сервер налаштований
- ✅ Frontend API клієнт створено (`api/ai.ts`)
- ✅ React компонент AI генератора (`AICourseGenerator.tsx`)
- ✅ AI кнопка додана на сторінку курсів

### 3. **Нові файли**
```
frontend/src/api/ai.ts                    # API клієнт для AI
frontend/src/components/AICourseGenerator.tsx  # UI компонент
start.sh                                   # Скрипт запуску
test-connection.sh                         # Тест з'єднань
AI_INTEGRATION_GUIDE.md                   # Повна документація
```

---

## 🚀 Швидкий запуск

### Варіант 1: Без AI (базова система)
```bash
./start.sh
```

### Варіант 2: З AI інтеграцією (рекомендовано для тестування)
```bash
./start.sh --with-ai
```

### Варіант 3: З усім (включаючи Python backend)
```bash
./start.sh --with-ai --with-python
```

---

## 🧪 Перевірка з'єднання

```bash
# Запустити тести
./test-connection.sh

# Має показати:
# ✅ PostgreSQL Running
# ✅ Redis Running
# ✅ Spring Boot API Running
# ✅ React Frontend Running
# ✅ Frontend accessible at http://localhost:3000
# ✅ API accessible at http://localhost:8080
```

---

## 📍 URL сервісів

| Сервіс | URL | Опис |
|--------|-----|------|
| **Frontend** | http://localhost:3000 | React додаток |
| **Spring API** | http://localhost:8080/api | Backend API |
| **AI Service** | http://localhost:8084/api | AI генерація (з --with-ai) |
| **Ollama** | http://localhost:11434 | Llama сервер (з --with-ai) |
| **PostgreSQL** | localhost:5432 | База даних |
| **Redis** | localhost:6379 | Кеш |

---

## 🎨 Як використовувати AI генератор

### 1. Запустити з AI
```bash
./start.sh --with-ai
```

### 2. Відкрити браузер
```
http://localhost:3000
```

### 3. Увійти як викладач/адмін

### 4. Перейти на сторінку курсів
```
Courses → кнопка "🤖 AI Generator"
```

### 5. Заповнити форму
```
Опис: "Створи курс з Python для початківців"
Мова: Українська
Модулі: ✅ (4 модулі)
Завдання: ✅ (3 на модуль)
Квізи: ✅ (10 питань)
```

### 6. Натиснути "Згенерувати курс"
- Чекати 30-60 секунд (перший раз може бути довше)
- Переглянути згенерований курс
- Натиснути "Зберегти курс"

---

## 🔧 Налаштування

### Frontend конфігурація
```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_AI_SERVICE_URL=http://localhost:8084/api
```

### Backend конфігурація
```bash
# .env (корінь проєкту)
REACT_APP_API_URL=http://localhost:8080/api
LLAMA_API_URL=http://ollama:11434
LLAMA_MODEL=llama3.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📊 Моніторинг

### Переглянути логи всіх сервісів
```bash
docker-compose logs -f
```

### Переглянути логи конкретного сервісу
```bash
docker-compose logs -f backend-spring    # Spring Boot
docker-compose logs -f frontend          # React
docker-compose logs -f ai-service        # AI Service
docker-compose logs -f ollama            # Ollama
```

### Статус контейнерів
```bash
docker-compose ps
```

### Використання ресурсів
```bash
docker stats
```

---

## 🐛 Troubleshooting

### 1. Frontend не підключається до API
```bash
# Перевірити .env
cat frontend/.env

# Має бути:
REACT_APP_API_URL=http://localhost:8080/api

# Перезапустити frontend
docker-compose restart frontend
```

### 2. AI Service не працює
```bash
# Переконатися що запущено з --with-ai
./start.sh --with-ai

# Завантажити модель
docker exec lms-ollama ollama pull llama3.1

# Перевірити логи
docker logs lms-ai-service
docker logs lms-ollama
```

### 3. Ollama завантажує модель дуже довго
```bash
# Це нормально, модель ~4-8 GB
# Перевірити прогрес
docker logs -f lms-ollama

# Після завантаження перезапустити AI service
docker-compose restart ai-service
```

### 4. Порти зайняті
```bash
# Перевірити які порти використовуються
sudo lsof -i :3000  # Frontend
sudo lsof -i :8080  # Spring
sudo lsof -i :8084  # AI Service
sudo lsof -i :11434 # Ollama

# Зупинити існуючі контейнери
docker-compose down
```

### 5. Помилка при запуску Docker
```bash
# Перевірити чи працює Docker
sudo systemctl status docker

# Запустити Docker
sudo systemctl start docker

# Дати права користувачу
sudo usermod -aG docker $USER
# Вийти і зайти знову
```

---

## 🎓 Приклади промптів для AI

### Python курс
```
Створи повний курс з Python для початківців. 
Включи основи синтаксису, змінні, цикли, функції, 
ООП та роботу з файлами. Додай практичні завдання 
після кожного модуля.
```

### Web Development
```
Курс з веб-розробки: HTML, CSS, JavaScript, React. 
З акцентом на практику та створення реальних проєктів. 
Включи завдання на створення особистого сайту.
```

### Data Science
```
Курс Data Science: Python, NumPy, Pandas, Matplotlib, 
Machine Learning. З практичними прикладами аналізу 
даних та візуалізації.
```

---

## 📚 Додаткова документація

- **Повна AI документація**: `AI_INTEGRATION_GUIDE.md`
- **Міграція Django→Spring**: `DJANGO_TO_SPRING_MIGRATION.md`
- **Апендикс міграції**: `MIGRATION_APPENDIX.md`

---

## ✅ Чеклист перевірки

- [ ] Docker запущено
- [ ] Запущено `./start.sh` або `./start.sh --with-ai`
- [ ] Frontend доступний на http://localhost:3000
- [ ] API доступний на http://localhost:8080/api
- [ ] Можна увійти в систему
- [ ] Кнопка "AI Generator" видима на сторінці курсів
- [ ] (З AI) Ollama завантажив модель llama3.1
- [ ] (З AI) AI Service працює на порту 8084
- [ ] Тест `./test-connection.sh` пройшов успішно

---

## 🎉 Готово!

Тепер ви можете:
1. ✅ Працювати з frontend через React
2. ✅ Використовувати Spring Boot API
3. ✅ Генерувати курси за допомогою AI
4. ✅ Моніторити всі сервіси

**Насолоджуйтесь роботою з LMS! 🚀**

