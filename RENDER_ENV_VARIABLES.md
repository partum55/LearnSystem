# 🔐 Змінні середовища для Render (Free Tier)

## Інструкція по заповненню Environment Variables

⚠️ **Важливо**: На безкоштовному плані Render **НЕ підтримує Background Workers**, тому Celery сервіси видалені з конфігурації.

Ваша LMS система буде працювати з:
- ✅ Django Backend (Web Service)
- ✅ React Frontend (Web Service)  
- ✅ PostgreSQL Database
- ❌ Celery Workers (недоступні на free tier)

---

## 🗄️ Database: learn-ucu-postgres
**Нічого заповнювати не треба** - Render автоматично створить базу даних.

---

## 🌐 Web Service: learn-ucu-backend

### Обов'язкові змінні:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | **Залиште порожнім** - Render автоматично згенерує |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `learn-ucu-backend.onrender.com,learn-ucu.onrender.com` |
| `DATABASE_URL` | **Автоматично підключиться** до learn-ucu-postgres |
| `REDIS_URL` | **Залиште порожнім** (опціонально для кешування) |
| `PYTHON_VERSION` | `3.12.0` |

---

## 🎨 Web Service: learn-ucu (Frontend)

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://learn-ucu-backend.onrender.com/api` |
| `NODE_VERSION` | `18.17.0` |

---

## 📝 Покрокова інструкція:

### Крок 1: Створіть сервіси через Blueprint
1. Натисніть **"Apply"** на сторінці Blueprint
2. Заповніть змінні як вказано вище
3. Натисніть **"Create"**

Render створить:
- 📦 PostgreSQL база даних (`learn-ucu-postgres`)
- 🔧 Django Backend (`learn-ucu-backend`)
- 🎨 React Frontend (`learn-ucu`)

### Крок 2: (Опціонально) Створіть Redis для кешування
Redis потрібен тільки для кешування. Якщо хочете кращу продуктивність:

1. Dashboard → **New** → **Redis**
2. Назва: `learn-ucu-redis`
3. Plan: **Free**
4. Region: **Frankfurt**
5. Create Redis

Після створення:
1. Скопіюйте **Internal Redis URL** (формат: `redis://red-xxxxx:6379`)
2. Dashboard → learn-ucu-backend → Environment
3. Додайте змінну:
   ```
   REDIS_URL=redis://red-xxxxxxxxxxxxx:6379
   ```
4. Save Changes

### Крок 3: Оновіть CORS налаштування

Додайте у `backend/lms_project/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'https://learn-ucu.onrender.com',
    'http://localhost:3000',
]

CSRF_TRUSTED_ORIGINS = [
    'https://learn-ucu.onrender.com',
    'https://learn-ucu-backend.onrender.com',
]
```

Закомітьте і запушіть:
```bash
git add backend/lms_project/settings.py
git commit -m "Configure CORS for production"
git push origin main
```

### Крок 4: Створіть суперюзера
1. Dashboard → learn-ucu-backend → **Shell**
2. Виконайте:
   ```bash
   python manage.py createsuperuser
   ```
3. Введіть email, display_name та пароль

---

## ✅ Фінальні URL вашого проекту:

- **Frontend (головний сайт)**: https://learn-ucu.onrender.com
- **Backend API**: https://learn-ucu-backend.onrender.com/api
- **Admin Panel**: https://learn-ucu-backend.onrender.com/admin
- **API Docs**: https://learn-ucu-backend.onrender.com/api/schema/swagger-ui/

---

## 🔍 Перевірка після деплою:

### Перевірте Backend:
```bash
curl https://learn-ucu-backend.onrender.com/api/
```

Має повернути JSON відповідь.

### Перевірте Frontend:
Відкрийте у браузері: https://learn-ucu.onrender.com

### Перевірте Admin:
https://learn-ucu-backend.onrender.com/admin

---

## ⚠️ Про відсутність Celery на Free Tier:

### Що не працюватиме:
- ❌ Асинхронні email повідомлення (будуть надсилатись синхронно)
- ❌ Фонові задачі (scheduled tasks)
- ❌ Celery Beat для періодичних завдань

### Що працюватиме нормально:
- ✅ Вся основна функціональність LMS
- ✅ Створення курсів та завдань
- ✅ Здача робіт студентами
- ✅ Оцінювання викладачами
- ✅ Журнал оцінок
- ✅ Аналітика

### Як отримати Celery:
Якщо вам потрібні асинхронні задачі, є два варіанти:
1. **Перейти на платний план** Render ($7/міс) - отримаєте Background Workers
2. **Використати альтернативу**: Django Q з SQLite або простий scheduler

---

## 🆙 Апгрейд до платного плану (опціонально):

Якщо вирішите апгрейднутись:
1. Dashboard → Upgrade Plan
2. Оберіть **Starter Plan** ($7/міс для web service)
3. Зможете додати Background Workers для Celery

Тоді використовуйте повну версію `render.yaml` з Celery workers.

---

## ⚠️ Troubleshooting:

### Якщо backend не запускається:
1. Перегляньте логи: Dashboard → learn-ucu-backend → Logs
2. Перевірте чи всі змінні середовища встановлені
3. Перевірте чи DATABASE_URL правильний

### Якщо Frontend не може підключитись:
1. Перевірте REACT_APP_API_URL у змінних frontend
2. Перевірте CORS налаштування в backend
3. Перевірте чи backend запущений

### Повільна перша відповідь:
- На free tier сервіси "засинають" після 15 хв неактивності
- Перше пробудження займає 30-60 секунд
- Використовуйте UptimeRobot для підтримки активності

---

## 📞 Підтримка:
Детальний гайд: `RENDER_DEPLOYMENT_GUIDE.md`

