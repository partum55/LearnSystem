# 🎯 Швидкий старт: Деплой на Render за 10 хвилин

## Крок 1: Встановіть залежність (локально)
```bash
cd backend
pip install dj-database-url==2.1.0

cd ../frontend
npm install serve
```

## Крок 2: Закомітьте зміни в Git
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Крок 3: Зайдіть на Render
1. Відкрийте https://dashboard.render.com/
2. Натисніть **"New"** → **"Blueprint"**
3. Підключіть ваш GitHub репозиторій
4. Render автоматично знайде файл `render.yaml` ✅

## Крок 4: Налаштуйте змінні середовища

### Для Backend (lms-backend):
```
ALLOWED_HOSTS=lms-backend.onrender.com
```

### Для Frontend (lms-frontend):
```
REACT_APP_API_URL=https://lms-backend.onrender.com/api
```

## Крок 5: Оновіть CORS в settings.py
Додайте у `backend/lms_project/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'https://lms-frontend.onrender.com',
    'http://localhost:3000',
]

CSRF_TRUSTED_ORIGINS = [
    'https://lms-frontend.onrender.com',
    'https://lms-backend.onrender.com',
]
```

Закомітьте:
```bash
git add .
git commit -m "Configure CORS"
git push
```

## Крок 6: Створіть суперюзера
1. Зайдіть в Render Dashboard → lms-backend → **Shell**
2. Виконайте:
```bash
python manage.py createsuperuser
```

## ✅ Готово!
- Frontend: https://lms-frontend.onrender.com
- Backend API: https://lms-backend.onrender.com/api
- Admin: https://lms-backend.onrender.com/admin

---

## ⚠️ Важливо про Free Plan
- Сервіси "засинають" після 15 хвилин неактивності
- Перший запит після пробудження займає ~30-60 секунд
- Використовуйте [UptimeRobot](https://uptimerobot.com/) для підтримки активності

## 🔧 Якщо щось не працює
Дивіться детальний гайд: **RENDER_DEPLOYMENT_GUIDE.md**

