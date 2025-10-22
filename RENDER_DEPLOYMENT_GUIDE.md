# 🚀 Гайд з деплою LMS системи на Render

## 📋 Передумови

1. **GitHub акаунт** - ваш код має бути на GitHub
2. **Render акаунт** - створіть на [render.com](https://render.com)
3. **Підготовлений код** - всі файли мають бути закомічені в Git

---

## 🔧 Крок 1: Підготовка коду

### 1.1 Оновіть settings.py для продакшену

Переконайтесь що у `backend/lms_project/settings.py` є:

```python
# Для PostgreSQL на Render
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600
    )
}
```

### 1.2 Додайте dj-database-url в requirements.txt

```bash
cd backend
echo "dj-database-url==2.1.0" >> requirements.txt
```

### 1.3 Створіть .env файл (локально, НЕ комітити!)

```bash
# backend/.env.example
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app.onrender.com,localhost
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
CELERY_BROKER_URL=redis://host:6379/0
```

### 1.4 Оновіть frontend для продакшену

У `frontend/package.json` додайте:

```json
{
  "scripts": {
    "build": "react-scripts build",
    "start": "serve -s build -l $PORT"
  },
  "dependencies": {
    "serve": "^14.2.1"
  }
}
```

---

## 📦 Крок 2: Підготовка GitHub репозиторію

```bash
# Переконайтесь що всі зміни закомічені
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## 🌐 Крок 3: Створення сервісів на Render

### Варіант A: Автоматичний деплой (рекомендовано) 🎯

1. **Зайдіть на [Render Dashboard](https://dashboard.render.com/)**

2. **Натисніть "New" → "Blueprint"**

3. **Підключіть ваш GitHub репозиторій**

4. **Render автоматично знайде файл `render.yaml`** і створить всі сервіси:
   - PostgreSQL база даних
   - Redis кеш
   - Django Backend
   - Celery Worker
   - Celery Beat
   - React Frontend

5. **Налаштуйте змінні середовища** (якщо треба):
   - `ALLOWED_HOSTS` - додайте ваш домен (наприклад: `your-backend.onrender.com`)
   - `REACT_APP_API_URL` - URL вашого backend'у

### Варіант B: Ручне створення сервісів

#### 3.1 Створіть PostgreSQL базу даних

1. New → PostgreSQL
2. Name: `lms-postgres`
3. Database: `lms_db`
4. User: `postgres`
5. Plan: **Free**
6. Create Database
7. **Збережіть Internal Database URL** - він знадобиться!

#### 3.2 Створіть Redis

1. New → Redis
2. Name: `lms-redis`
3. Plan: **Free**
4. Create Redis
5. **Збережіть Internal Redis URL**

#### 3.3 Створіть Backend (Django)

1. New → Web Service
2. Підключіть GitHub репозиторій
3. Налаштування:
   - **Name**: `lms-backend`
   - **Region**: Frankfurt (найближче до України)
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn lms_project.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
   - **Plan**: Free

4. **Environment Variables**:
   ```
   SECRET_KEY=<generate-random-string>
   DEBUG=False
   ALLOWED_HOSTS=lms-backend.onrender.com
   DATABASE_URL=<paste-postgres-internal-url>
   REDIS_URL=<paste-redis-internal-url>
   CELERY_BROKER_URL=<paste-redis-internal-url>
   PYTHON_VERSION=3.12.0
   ```

#### 3.4 Створіть Celery Worker

1. New → Background Worker
2. Налаштування:
   - **Name**: `lms-celery-worker`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `celery -A lms_project worker -l info`
   - **Plan**: Free

3. Додайте ті ж Environment Variables що і для Backend

#### 3.5 Створіть Celery Beat

1. New → Background Worker
2. Налаштування:
   - **Name**: `lms-celery-beat`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `celery -A lms_project beat -l info`
   - **Plan**: Free

3. Додайте ті ж Environment Variables

#### 3.6 Створіть Frontend (React)

1. New → Web Service
2. Налаштування:
   - **Name**: `lms-frontend`
   - **Root Directory**: `frontend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm install -g serve && serve -s build -l $PORT`
   - **Plan**: Free

3. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://lms-backend.onrender.com/api
   NODE_VERSION=18.17.0
   ```

---

## ⚙️ Крок 4: Налаштування CORS

Оновіть `backend/lms_project/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    'https://lms-frontend.onrender.com',
    'http://localhost:3000',  # для локальної розробки
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'https://lms-frontend.onrender.com',
    'https://lms-backend.onrender.com',
]
```

Закомітьте і запушіть зміни:
```bash
git add .
git commit -m "Configure CORS for Render"
git push
```

Render автоматично передеплоїть сервіси.

---

## 🎯 Крок 5: Створення суперюзера

Після успішного деплою:

1. Зайдіть в **Render Dashboard → lms-backend → Shell**
2. Виконайте:
   ```bash
   python manage.py createsuperuser
   ```
3. Введіть email, ім'я та пароль

---

## 🔍 Крок 6: Перевірка

1. **Backend**: https://lms-backend.onrender.com/api/
2. **Frontend**: https://lms-frontend.onrender.com
3. **Admin Panel**: https://lms-backend.onrender.com/admin/

---

## 📊 Моніторинг та логи

- **Логи Backend**: Dashboard → lms-backend → Logs
- **Логи Celery**: Dashboard → lms-celery-worker → Logs
- **Метрики**: Dashboard → Service → Metrics

---

## ⚠️ Важливі примітки про Free Plan

### Обмеження безкоштовного плану:
- **Sleep після 15 хв неактивності** - перший запит буде повільний (30-60 сек)
- **750 годин/місяць** - достатньо для одного сервісу 24/7
- **PostgreSQL**: 1 GB storage
- **Redis**: 25 MB storage
- **Bandwidth**: 100 GB/місяць

### Як уникнути засинання:
1. Використовуйте **UptimeRobot** або **Cron-job.org** для пінгу кожні 14 хвилин
2. Додайте health check endpoint:
   ```bash
   https://lms-backend.onrender.com/api/health/
   ```

---

## 🔧 Troubleshooting

### Проблема: Backend не запускається
**Рішення**: Перевірте логи, можливо не встановлені всі залежності або помилка міграції

### Проблема: Frontend не може підключитись до Backend
**Рішення**: 
1. Перевірте `REACT_APP_API_URL` у змінних середовища Frontend
2. Перевірте CORS налаштування в Backend

### Проблема: Static files не завантажуються
**Рішення**: 
```bash
# У Shell backend сервісу
python manage.py collectstatic --noinput
```

### Проблема: Database помилки
**Рішення**: Перевірте що `DATABASE_URL` правильний та PostgreSQL сервіс запущений

---

## 🎓 Додаткові покращення

### Використання власного домену

1. Купіть домен (наприклад на namecheap.com)
2. У Render Dashboard → Service → Settings → Custom Domain
3. Додайте ваш домен та налаштуйте DNS записи

### Налаштування Email

Додайте змінні середовища:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Backup бази даних

Render автоматично робить backups PostgreSQL на платних планах.
Для Free плану - експортуйте дані вручну:
```bash
# У Shell
python manage.py dumpdata > backup.json
```

---

## 📞 Підтримка

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)

---

## ✅ Чеклист деплою

- [ ] Код на GitHub
- [ ] `render.yaml` створено
- [ ] `build.sh` створено та виконуваний
- [ ] `dj-database-url` додано в requirements.txt
- [ ] settings.py налаштовано для продакшену
- [ ] Frontend налаштовано з `serve`
- [ ] CORS налаштовано
- [ ] PostgreSQL створено
- [ ] Redis створено
- [ ] Backend задеплоєно
- [ ] Celery Worker запущено
- [ ] Celery Beat запущено
- [ ] Frontend задеплоєно
- [ ] Суперюзер створено
- [ ] Все працює! 🎉

---

**Успіхів з деплоєм! 🚀**

