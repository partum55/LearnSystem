# 🚀 Повний гайд з налаштування LMS на Render

## 📊 Огляд вашої системи

Ваш проєкт складається з наступних компонентів:

1. **Django Backend** - основний API сервер (REST API)
2. **React Frontend** - веб-інтерфейс користувача
3. **PostgreSQL** - база даних
4. **Redis** - кеш та брокер повідомлень
5. **Celery Worker** - фонові задачі (обробка повідомлень)
6. **Celery Beat** - планувальник періодичних задач

---

## ⚠️ ВАЖЛИВА ІНФОРМАЦІЯ ПРО БЕЗКОШТОВНИЙ ПЛАН

**На Render Free Plan НЕ можна запускати Background Workers** (Celery Worker і Celery Beat).

Тому у вас є **два варіанти**:

### Варіант 1: Мінімальний (повністю безкоштовний)
- ✅ Django Backend
- ✅ React Frontend  
- ✅ PostgreSQL Database
- ❌ Redis (опціонально)
- ❌ Celery Worker
- ❌ Celery Beat

**Обмеження**: Не буде автоматичних email-сповіщень та фонових задач.

### Варіант 2: Повний (потребує платного плану для Celery)
- ✅ Всі компоненти включені
- 💰 ~$7/місяць за кожен Background Worker (Celery Worker + Celery Beat = $14/місяць)

**Я рекомендую почати з Варіанту 1**, система буде повністю функціональною, просто без автоматичних сповіщень.

---

## 🔧 ПОКРОКОВА ІНСТРУКЦІЯ

### Крок 0: Підготовка (локально на вашому комп'ютері)

1. **Переконайтесь що всі зміни збережені в Git:**
```bash
cd /home/parum/PycharmProjects/learn_system
git status
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

2. **Перевірте що у вас є обліковий запис на:**
   - GitHub (код має бути завантажений)
   - Render.com (зареєструйтесь на https://render.com)

---

### Крок 1: Створіть PostgreSQL базу даних

1. Зайдіть на https://dashboard.render.com
2. Натисніть **"New"** → **"PostgreSQL"**
3. Заповніть поля:
   - **Name**: `learn-ucu-postgres`
   - **Database**: `lms_db`
   - **User**: `postgres` (автоматично)
   - **Region**: **Frankfurt** (найближче до України)
   - **PostgreSQL Version**: 15
   - **Plan**: **Free**

4. Натисніть **"Create Database"**

5. ⚠️ **ВАЖЛИВО**: Після створення скопіюйте:
   - **Internal Database URL** (буде виглядати як: `postgresql://postgres:xxx@dpg-xxx.frankfurt-postgres.render.com/lms_db`)
   - Збережіть його - він знадобиться для Backend!

---

### Крок 2: (Опціонально) Створіть Redis

**Примітка**: Redis не обов'язковий для базової роботи системи, але покращить швидкість.

1. **New** → **Redis**
2. Налаштування:
   - **Name**: `learn-system-redis`
   - **Region**: **Frankfurt**
   - **Plan**: **Free** (25 MB)
   - **Eviction Policy**: `allkeys-lru`

3. **Create Redis**

4. Скопіюйте **Internal Redis URL**: `redis://red-xxx:6379`

---

### Крок 3: Створіть Django Backend (Web Service)

1. **New** → **Web Service**

2. **Connect Repository**:
   - Підключіть ваш GitHub репозиторій
   - Якщо репозиторій приватний, дайте Render доступ

3. **Налаштування сервісу**:

   | Поле | Значення |
   |------|----------|
   | **Name** | `learn-system-backend` |
   | **Region** | **Frankfurt** |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | **Python 3** |
   | **Build Command** | `./build.sh` |
   | **Start Command** | `gunicorn lms_project.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
   | **Plan** | **Free** |

4. **Environment Variables** (натисніть "Advanced" → "Add Environment Variable"):

   ```
   SECRET_KEY = <залиште порожнім - Render згенерує автоматично>
   DEBUG = False
   ALLOWED_HOSTS = learn-system-backend.onrender.com
   DATABASE_URL = <вставте Internal Database URL з Кроку 1>
   PYTHON_VERSION = 3.12.0
   ```

   **Якщо створили Redis (опціонально)**:
   ```
   REDIS_URL = <вставте Internal Redis URL з Кроку 2>
   CELERY_BROKER_URL = <вставте той самий Redis URL>
   ```

   **Для CORS (додайте після створення Frontend)**:
   ```
   CORS_ALLOWED_ORIGINS = https://learn-system-frontend.onrender.com,http://localhost:3000
   CSRF_TRUSTED_ORIGINS = https://learn-system-frontend.onrender.com,https://learn-system-backend.onrender.com
   ```

5. Натисніть **"Create Web Service"**

6. Зачекайте 5-10 хвилин поки Render:
   - Встановить залежності (pip install)
   - Запустить міграції бази даних
   - Зберіє статичні файли
   - Запустить сервер

7. Перевірте логи (Logs tab) - має бути успішний деплой

---

### Крок 4: Створіть React Frontend (Web Service)

1. **New** → **Web Service**

2. **Connect Repository**: той самий репозиторій

3. **Налаштування**:

   | Поле | Значення |
   |------|----------|
   | **Name** | `learn-ucu` |
   | **Region** | **Frankfurt** |
   | **Branch** | `main` |
   | **Root Directory** | `frontend` |
   | **Runtime** | **Node** |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npx serve -s build -l $PORT` |
   | **Plan** | **Free** |

4. **Environment Variables**:

   ```
   REACT_APP_API_URL = https://learn-ucu-backend.onrender.com/api
   NODE_VERSION = 18.17.0
   ```

5. **Create Web Service**

6. Зачекайте 5-10 хвилин на збірку та деплой

---

### Крок 5: Оновіть CORS налаштування Backend

Тепер, коли ви знаєте URL обох сервісів, оновіть CORS:

1. Поверніться до **learn-ucu-backend** → **Environment** tab

2. Оновіть змінні:
   ```
   CORS_ALLOWED_ORIGINS = https://learn-ucu.onrender.com,http://localhost:3000
   CSRF_TRUSTED_ORIGINS = https://learn-ucu.onrender.com,https://learn-ucu-backend.onrender.com
   ```

3. Натисніть **"Save Changes"** - Backend автоматично перезапуститься

---

### Крок 6: Створіть суперюзера (адміністратора)

1. Зайдіть в **Dashboard** → **learn-ucu-backend**

2. Натисніть вкладку **"Shell"** (у верхньому меню)

3. У консолі виконайте:
   ```bash
   python manage.py createsuperuser
   ```

4. Введіть дані адміністратора:
   - **Email**: ваш email (наприклад: admin@example.com)
   - **First name**: ваше ім'я
   - **Last name**: ваше прізвище
   - **Password**: надійний пароль
   - **Password (again)**: повторіть пароль

5. Готово! Суперюзер створений.

---

### Крок 7: Перевірте що все працює

1. **Frontend**: 
   - Відкрийте `https://learn-ucu.onrender.com`
   - Має відкритись сторінка входу

2. **Backend API**:
   - Відкрийте `https://learn-ucu-backend.onrender.com/api/`
   - Має показати API endpoints

3. **Admin Panel**:
   - Відкрийте `https://learn-ucu-backend.onrender.com/admin/`
   - Увійдіть з даними суперюзера
   - Має відкритись Django Admin панель

4. **Спробуйте увійти у Frontend**:
   - Використайте дані суперюзера
   - Має працювати вхід та навігація

---

## 🎯 ОПЦІОНАЛЬНО: Celery Workers (платні - НЕ на FREE плані)

⚠️ **УВАГА**: Ви використовуєте FREE план, тому Celery Workers **НЕ ДОСТУПНІ**.

Background Workers потребують платного плану Starter ($7/міс за кожен воркер).

Ваша система працюватиме повністю без Celery, просто:
- ❌ Не буде автоматичних email-сповіщень
- ❌ Не буде фонових задач
- ✅ Всі інші функції працюють нормально

**Якщо в майбутньому захочете додати Celery (на платному плані):**

### Крок 8A: Створіть Celery Worker

1. **New** → **Background Worker**
2. Налаштування:
   - **Name**: `learn-ucu-celery-worker`
   - **Region**: Frankfurt
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `celery -A lms_project worker -l info`
   - **Plan**: **Starter** ($7/місяць)

3. **Environment Variables**: скопіюйте ВСІ змінні з Backend

### Крок 8B: Створіть Celery Beat (планувальник)

1. **New** → **Background Worker**
2. Налаштування:
   - **Name**: `learn-ucu-celery-beat`
   - **Region**: Frankfurt
## 📊 Підсумок: Ваші сервіси на Render (FREE план)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `celery -A lms_project beat -l info`
   - **Plan**: **Starter** ($7/місяць)

3. **Environment Variables**: скопіюйте ВСІ змінні з Backend
| PostgreSQL | Database | Internal only | ✅ Free |
| Redis | Cache (опціонально) | Internal only | ✅ Free |
| Django Backend | Web Service | `https://learn-ucu-backend.onrender.com` | ✅ Free |
| React Frontend | Web Service | `https://learn-ucu.onrender.com` | ✅ Free |
| ~~Celery Worker~~ | ~~Background Worker~~ | - | ❌ Недоступно на Free |
| ~~Celery Beat~~ | ~~Background Worker~~ | - | ❌ Недоступно на Free |

**Загальна вартість на FREE плані**: **$0/місяць** ✅

**Обмеження FREE плану**:
- Sleep після 15 хв неактивності (використайте UptimeRobot)
- PostgreSQL: 1 GB storage
- Redis: 25 MB
- RAM: 512 MB на сервіс
- Bandwidth: 100 GB/міс
| Redis | Cache | Internal only | Free |
| Django Backend | Web Service | `https://learn-system-backend.onrender.com` | Free |
| React Frontend | Web Service | `https://learn-system-frontend.onrender.com` | Free |
| Celery Worker | Background Worker | - | $7/міс (опціонально) |
| Celery Beat | Background Worker | - | $7/міс (опціонально) |

**Загальна вартість**: 
- Без Celery: **$0/місяць** ✅
- З Celery: **$14/місяць**

---

## ⚙️ Налаштування автоматичного деплою

Render автоматично редеплоїть при push до GitHub:

1. Зробіть зміни у коді локально
2. Закомітьте та запушіть:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push origin main
   ```
3. Render автоматично:
   -Detects the push
   - Rebuilds the service
   - Deploys new version

---

## 🔍 Моніторинг та логи

### Перегляд логів:
1. Dashboard → Виберіть сервіс
2. Вкладка **"Logs"**
3. Бачите real-time логи

### Метрики:
1. Вкладка **"Metrics"**
2. Бачите CPU, Memory, Bandwidth

### Alerts:
1. Вкладка **"Settings"** → **"Notifications"**
2. Налаштуйте email алерти при падінні сервісу

---

## ⚠️ Важливі обмеження Free Plan

1. **Sleep після неактивності**:
   - Сервіси "засинають" після 15 хвилин без запитів
   - Перший запит після пробудження: 30-60 секунд
   - **Рішення**: Використайте [UptimeRobot](https://uptimerobot.com/) для ping кожні 14 хвилин

2. **Обмеження ресурсів**:
   - RAM: 512 MB
   - CPU: Shared
   - PostgreSQL: 1 GB storage
   - Redis: 25 MB
   - Bandwidth: 100 GB/місяць

3. **Build часи**:
   - Максимум 15 хвилин на білд

---

## 🛠️ Troubleshooting (Вирішення проблем)

### Проблема 1: Backend не запускається

**Симптоми**: Сервіс показує "Deploy failed"

**Рішення**:
1. Перевірте логи (Logs tab)
2. Найчастіші причини:
   - Відсутній `DATABASE_URL`
   - Помилка в міграціях
   - Відсутня залежність в `requirements.txt`

### Проблема 2: Frontend не може підключитись до API

**Симптоми**: Помилки CORS або 404

**Рішення**:
1. Перевірте `REACT_APP_API_URL` у Frontend environment variables
2. Перевірте `CORS_ALLOWED_ORIGINS` у Backend
3. URL має бути БЕЗ слешу в кінці

### Проблема 3: Static files не завантажуються

**Симптоми**: CSS/JS не працює в admin панелі

**Рішення**:
```bash
# У Shell backend сервісу
python manage.py collectstatic --no-input
```

### Проблема 4: Database connection error

**Симптоми**: `could not connect to server`

   - Додайте monitor для `https://learn-ucu-backend.onrender.com/api/health/`
1. Перевірте що PostgreSQL сервіс запущений
2. Перевірте що `DATABASE_URL` правильний (Internal URL)
3. Database та Backend мають бути в одному регіоні (Frankfurt)

### Проблема 5: Повільний перший запит

**Це нормально для Free Plan!**

**Пояснення**: Сервіс засинає після 15 хв неактивності

**Рішення**:
1. Використайте [UptimeRobot](https://uptimerobot.com/):
   - Створіть безкоштовний акаунт
   - Додайте monitor для `https://learn-system-backend.onrender.com/api/health/`
   - Інтервал: кожні 5 хвилин
2. Або апгрейдьте до Starter Plan ($7/міс) - без sleep

---

## 🎓 Додаткові покращення

### 1. Власний домен

1. Купіть домен (наприклад на namecheap.com)
2. Dashboard → Service → Settings → **Custom Domain**
3. Додайте домен (наприклад: `learn.yourdomain.com`)
4. Налаштуйте DNS записи як вказано

### 2. Email налаштування

Додайте у Backend environment variables:

```
EMAIL_BACKEND = django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = your-email@gmail.com
EMAIL_HOST_PASSWORD = your-app-password
DEFAULT_FROM_EMAIL = LMS System <your-email@gmail.com>
```

**Примітка**: Для Gmail потрібен App Password, не звичайний пароль!

### 3. Backup бази даних

Free PostgreSQL НЕ має автоматичних backup'ів.

**Рішення**:
1. Dashboard → PostgreSQL → **Backups** tab
2. Manual Backup → **Create Backup**
3. Робіть це регулярно (раз на тиждень)

Або використайте команду:
```bash
# У Shell backend
python manage.py dumpdata > backup.json
```

### 4. Health Check для UptimeRobot

Створіть простий endpoint у `backend/core/views.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    # Перевірка DB
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "ok"
Тепер можна пінгувати: `https://learn-ucu-backend.onrender.com/api/health/`
        db_status = "error"
    
    return Response({
        "status": "ok",
        "database": db_status
    })
```

Додайте у `backend/core/urls.py`:
```python
path('health/', views.health_check, name='health_check'),
```

Тепер можна пінгувати: `https://learn-system-backend.onrender.com/api/health/`

---

## 📝 Чеклист фінальної перевірки

- [ ] PostgreSQL база створена та працює
- [ ] Backend деплоїться успішно
- [ ] Frontend деплоїться успішно
- [ ] CORS налаштований правильно
- [ ] Суперюзер створений
- [ ] Можу увійти в admin панель
- [ ] Можу увійти через frontend
- [ ] API endpoints відповідають
- [ ] Static files завантажуються
- [ ] Media files upload працює
- [ ] (Опціонально) Redis підключений
- [ ] (Опціонально) Celery workers працюють
- [ ] UptimeRobot налаштований (щоб уникнути sleep)

---

## 🆘 Потрібна допомога?

1. **Render документація**: https://render.com/docs
2. **Render community**: https://community.render.com
3. **Django документація**: https://docs.djangoproject.com

---

## 🎉 Вітаю! Ваша LMS система на Render!

Тепер у вас є повністю функціональна Learning Management System у production!

**Наступні кроки**:
1. Додайте користувачів через admin панель
2. Створіть курси
3. Налаштуйте власний домен (опціонально)
4. Налаштуйте UptimeRobot
5. Регулярно робіть backup бази даних

Успіхів! 🚀

