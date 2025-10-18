# LMS - Learning Management System

Університетська система управління навчанням (LMS) з підтримкою української та англійської мов, світлої/темної теми та адаптивним дизайном.

## 🚀 Технології

### Backend
- **Django 5.0** + Django REST Framework
- **PostgreSQL** - основна база даних
- **Redis** - кешування та черги задач
- **Celery** - фонові задачі
- **JWT** - автентифікація
- **Docker** - контейнеризація

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** - стилізація
- **Zustand** - управління станом
- **React Router** - маршрутизація
- **i18next** - мультимовність
- **Axios** - HTTP клієнт

## 📋 Вимоги

- Python 3.12+
- Node.js 18+ (якщо використовується фронтенд без Docker)
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (для контейнеризованого розгортання)

## 🔧 Встановлення та запуск

### Варіант 1: Використання Docker Compose (Рекомендовано)

1. **Клонуйте репозиторій:**
```bash
git clone <repository-url>
cd learn_system
```

2. **Створіть файл .env для backend:**
```bash
cp backend/.env.example backend/.env
```

3. **Відредагуйте backend/.env** (за потреби):
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=lms_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
```

4. **Запустіть всі сервіси:**
```bash
docker-compose up -d
```

5. **Створіть суперкористувача:**
```bash
docker-compose exec backend python manage.py createsuperuser
```

6. **Відкрийте у браузері:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/api/docs
- Admin Panel: http://localhost:8000/admin

### Варіант 2: Локальна розробка без Docker

#### Backend Setup

1. **Створіть та активуйте віртуальне середовище:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
```

2. **Встановіть залежності:**
```bash
pip install -r requirements.txt
```

3. **Створіть файл .env:**
```bash
cp .env.example .env
```

4. **Створіть базу даних PostgreSQL:**
```bash
createdb lms_db
```

5. **Виконайте міграції:**
```bash
python manage.py migrate
```

6. **Створіть суперкористувача:**
```bash
python manage.py createsuperuser
```

7. **Запустіть сервер розробки:**
```bash
python manage.py runserver
```

8. **У окремому терміналі запустіть Celery worker:**
```bash
celery -A lms_project worker -l info
```

9. **У ще одному терміналі запустіть Celery beat:**
```bash
celery -A lms_project beat -l info
```

#### Frontend Setup

1. **Перейдіть до директорії frontend:**
```bash
cd frontend
```

2. **Встановіть залежності:**
```bash
npm install
```

3. **Створіть файл .env.local:**
```bash
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
```

4. **Запустіть сервер розробки:**
```bash
npm start
```

5. **Відкрийте у браузері:**
http://localhost:3000

## 📚 Структура проєкту

```
learn_system/
├── backend/
│   ├── lms_project/          # Основні налаштування Django
│   ├── users/                # Модуль користувачів та автентифікації
│   ├── courses/              # Модуль курсів
│   ├── assessments/          # Тести та завдання
│   ├── submissions/          # Подання студентів
│   ├── notifications/        # Система сповіщень
│   ├── analytics/            # Аналітика та статистика
│   ├── requirements.txt      # Python залежності
│   └── manage.py            # Django CLI
├── frontend/
│   ├── src/
│   │   ├── api/             # API клієнт
│   │   ├── components/      # React компоненти
│   │   ├── pages/           # Сторінки додатку
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript типи
│   │   ├── i18n/            # Конфігурація мультимовності
│   │   └── App.tsx          # Головний компонент
│   └── package.json         # Node.js залежності
└── docker-compose.yml       # Docker конфігурація
```

## 🎯 Основні функції

### Для студентів:
- 📚 Перегляд курсів та навчальних матеріалів
- 📝 Виконання завдань та тестів
- 📊 Перегляд оцінок та прогресу
- 🔔 Отримання сповіщень про дедлайни
- 🌍 Вибір мови інтерфейсу (УКР/ENG)
- 🌗 Переключення теми (світла/темна)

### Для викладачів:
- ➕ Створення та управління курсами
- 📋 Створення тестів з банку питань
- ✅ Оцінювання робіт студентів
- 👥 Управління списками студентів
- 📈 Перегляд аналітики та статистики
- 📤 Імпорт студентів через CSV

### Для адміністраторів:
- 👤 Управління користувачами
- 🎓 Управління всіма курсами
- 📊 Системна аналітика
- ⚙️ Налаштування системи

## 🔑 API Endpoints

### Автентифікація
- `POST /api/auth/login/` - Вхід у систему
- `POST /api/auth/refresh/` - Оновлення токену
- `GET /api/auth/users/me/` - Отримати поточного користувача

### Курси
- `GET /api/courses/courses/` - Список курсів
- `POST /api/courses/courses/` - Створити курс
- `GET /api/courses/courses/{id}/` - Деталі курсу
- `POST /api/courses/courses/{id}/enroll_students/` - Записати студентів

### Модулі та ресурси
- `GET /api/courses/modules/` - Список модулів
- `POST /api/courses/modules/` - Створити модуль
- `POST /api/courses/resources/` - Додати ресурс

### Оголошення
- `GET /api/courses/announcements/` - Список оголошень
- `POST /api/courses/announcements/` - Створити оголошення

Повна документація API доступна за адресою: http://localhost:8000/api/docs/

## 🧪 Тестування

### Backend тести
```bash
cd backend
python manage.py test
```

### Frontend тести
```bash
cd frontend
npm test
```

## 🔐 Безпека

- JWT токени для автентифікації
- HTTPS для production
- CORS налаштування
- Валідація даних на сервері
- Захист від CSRF атак
- Rate limiting для API

## 📦 Деплой на Render.com

1. **Створіть новий Web Service:**
   - Підключіть GitHub репозиторій
   - Build Command: `cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `cd backend && gunicorn lms_project.wsgi:application`

2. **Створіть PostgreSQL Database:**
   - Додайте в Environment Variables `DATABASE_URL`

3. **Створіть Redis Instance:**
   - Додайте в Environment Variables `REDIS_URL`

4. **Налаштуйте Environment Variables:**
```
SECRET_KEY=<generate-strong-key>
DEBUG=False
ALLOWED_HOSTS=<your-render-url>
DATABASE_URL=<postgres-connection-string>
REDIS_URL=<redis-connection-string>
```

5. **Деплой Frontend:**
   - Створіть новий Static Site
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`

## 🤝 Внесок у розробку

1. Форкніть репозиторій
2. Створіть гілку для нової функції (`git checkout -b feature/AmazingFeature`)
3. Зробіть коміт змін (`git commit -m 'Add some AmazingFeature'`)
4. Пушніть до гілки (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

## 📝 Ліцензія

Цей проєкт створено для освітніх цілей.

## 📧 Контакти

Для питань та пропозицій звертайтеся до команди розробників.

---

**Розроблено з ❤️ для університетської спільноти**

