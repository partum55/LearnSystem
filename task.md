# TASK.md — Технічне завдання: LMS для університету

> **Короткий опис:**
> Внутрішня університетська Learning Management System (LMS) — веб‑застосунок, розгорнутий на Render.com. Підтримує дві мови (укр/англ), світлу/темну теми, адаптивний інтерфейс для десктопів, планшетів і мобільних браузерів. Студенти не можуть самостійно записуватися на курси — зарахування і керування списками курсів роблять викладачі/адміністратори.

---

## 1. Мета рішення
- Забезпечити зручний інструмент для створення й проведення курсів, завдань і тестів для різних спеціальностей — від гуманітарних до технічних.
- Автоматизувати рутинні процеси: автооцінювання тестів, журнал оцінок, сповіщення, імпорт списків студентів.
- Надати сучасний мінімалістичний UI, привабливий і доступний (WCAG‑ready).

---

## 2. Короткий перелік функцій (MVP)
1. Аутентифікація та ролі: SuperAdmin, Teacher, Student, (TA). Роль SuperAdmin з повним доступом.
2. Дашборди для кожної ролі (список курсів, поточні завдання/події, сповіщення).
3. Модуль курсів: створення курсу, структура (модулі/підрозділи), завантаження контенту (PDF, презентації, відео, посилання), версіонування.
4. Механізм зарахування студентів до курса викладачем/адміном. Імпорт списків (.csv) + API для інтеграції з SIS у майбутньому.
5. Конструктор тестів (Question Bank) з підтримкою: Multiple Choice, True/False, Fill in Blank, Matching, Numerical, Formula, Short Answer (ручне/напівавтоматичне). Питання з бпіофункцією (randomize, pools).
6. Автооцінювання для об'єктивних типів питань + можливість перерахунку (regrade). Ручне оцінювання для відкритих питань через SpeedGrader‑подібний інтерфейс.
7. Завдання (homework) — студенти завантажують файли або пишуть вбудовану відповідь; викладач оцінює/коментує; підтримка Rubrics/критеріїв оцінювання.
8. Журнал оцінок (Gradebook) з агрегацією результатів, вагами, експортом у CSV.
9. Сповіщення та календар (веб та email). Налаштування push/email/в системі.
10. Аналітика: активність студентів, середні бали, статистика по питанню (item analysis).
11. Мультимовність (i18n) та тема (dark/light toggle).
12. Файлове сховище: інтеграція з S3 або Render Disk для мультимедіа.

---

## 3. Нефункціональні вимоги
- **Доступність:** відповідність базовим WCAG 2.1 AA.
- **Продуктивність:** час відгуку основних сторінок < 300 ms при 95% запитів (після кешування). Позитивний UX для 1000 одночасних користувачів у першій фазі; можливість лінійно масштабувати.
- **Надійність:** RPO (backup) — 24 год., RTO — < 4 год.
- **Безпека:** JWT або OAuth2 for sessions, HTTPS тільки; логування подій; RBAC (role-based access control). (Деталі безпеки — додаємо у наступному релізі.)
- **Масштабованість:** незалежні бекенд-сервіси, горизонтальне масштабування фронтенду і бекенду.

---

## 4. Техстек (рекомендований)
- **Фронтенд:** React + TypeScript (Next.js optional for SSR) або Vue 3 + TypeScript. UI — Tailwind CSS + component library (Radix/Headless UI). i18n: react-i18next або vue-i18n.
- **Бекенд:** Node.js (NestJS або Express + TypeScript) або Python (Django Rest Framework, FastAPI). Рекомендація: **NestJS** (висока структурованість, DI, модульність).
- **ORM:** Prisma (Node) або TypeORM; для Django — native ORM.
- **БД:** PostgreSQL (Render Managed Postgres).
- **Кеш, брокер:** Redis (cache + job queue). Jobs: BullMQ або Redis Queue.
- **Файлове сховище:** S3-compatible (AWS S3 / DigitalOcean Spaces) або Render Disk для POC.
- **Search:** Elasticsearch або Postgres full‑text для пошуку по курсах/питанням.
- **CI/CD:** GitHub Actions → автотести → контейнер → Deploy to Render (Build + Deploy).
- **Контейнеризація:** Docker.
- **Моніторинг:** Prometheus + Grafana або Render built-in metrics + Sentry for error tracking.

---

## 5. Архітектура (логічний огляд)
- **Клієнт:** SPA (React) з роутингом та кешуванням, підтримка PWA мінімально (для offline reading матеріалів).
- **API Gateway / BFF (Backend for Frontend):** один REST/GraphQL API для всіх клієнтів.
- **Сервіси:** Auth Service, User Service, Course Service, Assessment Service (Quiz & Grader), File Service, Notification Service, Analytics Service.
- **DB:** одна реляційна БД (Postgres) з чітким розподілом схем (schema per area) або таблицями з namespace.
- **Фонові задачі:** перевірка дедлайнів, надсилання нагадувань, генерування звітів, автогрейд — виконуються через job queue (Redis + worker processes).

---

## 6. Схема базових даних (основні таблиці)
> Нижче — мінімальний набір таблиць з ключовими полями

- **users**: id (UUID), email, display_name, locale, role, password_hash (nullable for SSO), created_at, updated_at
- **courses**: id, code, title_uk, title_en, description_uk, description_en, owner_id (teacher), visibility, created_at
- **course_members**: id, course_id, user_id, role_in_course (student/ta/teacher_assistant), added_by, added_at
- **modules**: id, course_id, title, position, content_meta (JSON), published
- **resources**: id, module_id, type (video/pdf/slide/link), storage_path, metadata (JSON)
- **assignments**: id, course_id, title, description, due_date, rubric (JSON), max_points
- **submissions**: id, assignment_id, user_id, files (JSON), text_answer, grade, grader_id, graded_at, feedback
- **question_bank**: id, course_id, type, stem, options (JSON), correct_answer (JSON), metadata
- **quizzes**: id, course_id, title, config (timed, attempts, randomize), question_ids (relation table)
- **quiz_attempts**: id, quiz_id, user_id, started_at, submitted_at, answers (JSON), auto_score, final_score, graded_by
- **gradebook**: id, course_id, user_id, aggregated_score (computed), breakdown (JSON)
- **notifications**: id, user_id, type, payload (JSON), read, created_at

---

## 7. API (зразкові ендпоїнти)
> Вкажу приклади REST endpoints; в реалізації можна замінити на GraphQL якщо команда віддає перевагу.

**Auth**
- `POST /api/auth/login` — логін (email/password або SSO redirect)
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Users**
- `GET /api/users/:id`
- `POST /api/users` — створення користувача (Admin)
- `POST /api/users/import` — імпорт CSV (масовий)

**Courses**
- `GET /api/courses` — список доступних (для role)
- `POST /api/courses` — створити курс (Teacher/Admin)
- `PUT /api/courses/:id`
- `POST /api/courses/:id/members` — додати студента/групу

**Modules & Resources**
- `POST /api/courses/:id/modules`
- `POST /api/modules/:id/resources` — загрузити файл (multipart)

**Assignments**
- `POST /api/courses/:id/assignments`
- `GET /api/assignments/:id/submissions`
- `POST /api/assignments/:id/submissions` — студент завантажує
- `POST /api/assignments/:id/submissions/:sid/grade` — викладач виставляє оцінку

**Quizzes**
- `POST /api/courses/:id/quizzes` — створити тест
- `POST /api/quizzes/:id/attempts` — почати/надіслати спробу
- `GET /api/quizzes/:id/attempts/:aid/grade` — отримати результат

**Admin**
- `GET /api/admin/health`
- `POST /api/admin/backup` — примусове бекапування

---

## 8. Робочі процеси (workflow)
### Створення курсу
1. Teacher → New Course form (meta + language + visibility + syllabus).  
2. Teacher додає модулі → завантажує ресурси → публікує курс.

### Зарахування студентів
1. Teacher або Admin імпортує CSV зі списком (email, student_id).  
2. Система створює/підтягує користувачів, додає їх до course_members як students.  
3. Сповіщення розсилаються автоматично.

### Тест/Quiz lifecycle
1. Teacher створює питання в Question Bank або додає у Quiz (pool або fixed set).  
2. Налаштування: час, attempts, shuffle, random draw.  
3. Студент проходить тест → автооцінювання для об’єктивних питань.  
4. Для відкритих питань викладач переглядає і ставить оцінки (SpeedGrader).  
5. Результат пишеться в Gradebook.

### Завдання та оцінювання
1. Teacher створює завдання з rubric.  
2. Student надсилає submission.  
3. Worker перевіряє дедлайни, надсилає нагадування.  
4. Teacher оцінює, коментує.  
5. Оцінка відображається в Gradebook.

---

## 9. UI/UX вимоги — конкретика
- **Головний дашборд (Student):** активні курси, поточні дедлайни, останні повідомлення, прогрес (%) у курсах. Кнопка «Показати календар» та «Мої оцінки». Всі тексти локалізовані.
- **Головний дашборд (Teacher):** список курсів, коротка статистика (кількість студентів, незадіяних робіт на перевірку), швидкий доступ до конструктору тестів і списку студентів.
- **Course page:** бокова навігація по модулям, статус публікації, кнопки «Додати ресурс», «Створити завдання», «Створити тест».
- **Quiz builder:** drag&drop створення питань, preview режим, налаштування таймера, attempts, randomization. Експорт/імпорт питань (GIFT, XML).
- **SpeedGrader:** інтерфейс для перевірки завдань з можливістю залишити коментар шаблони (canned feedback) і застосування rubric.
- **Gradebook:** фільтрація по студентам/завданням, обчислення ваг, експорт у CSV.
- **Темна/світла тема:** перемикач у header; збереження вибору в профілі користувача або localStorage.

---

## 10. Інтеграції (обов'язково/опціонально)
**Обов'язково:**
- Render Postgres (host DB).  
- SMTP (університетська пошта) для нотифікацій.  
- S3-compatible storage.

**Опціонально (фази):**
- SIS (Student Information System) API — синхронізація груп/розкладу/оценок.
- SSO: SAML/LDAP/OAuth2 для єдиної автентифікації.
- Плагін перевірки плагіату (Turnitin або open-source альтернативи).
- Proctoring / lockdown browser інтеграція (опціонально для екзаменів).
- Code autograder / judge (для комп'ютерних спеціальностей) — можливість підключити контейнерний sandbox (e.g., Judge0, Docker runners).
- SCORM/xAPI support (опціонально для eLearning контенту).

---

## 11. Тестування та QA
- Unit tests для бекенду і фронтенду.  
- Integration tests для основних workflows (course creation, enrollment, quiz taking, grading).  
- E2E tests (Cypress / Playwright).  
- Load testing сценарії: 1000, 5000, 10k користувачів з наголосом на peak concurrent при іспитах.

---

## 12. Розгортання та CI/CD
1. Репозиторій моноліт / mono-repo (frontend + backend) або індивідуальні репо для сервісів.  
2. GitHub Actions: lint → unit tests → build → docker image → push → Render automatic deploy.  
3. Міграції БД (Prisma Migrate / Django migrations) виконуються під час релізу.
4. Моніторинг деплоїв та rollback план.

---

## 13. Бекап/Відновлення
- Daily DB backups (automated by Render or custom), зберігання останніх 30 днів.  
- Бекап файлового сховища (snapshots) раз на тиждень.
- Playbook для відновлення: тестове відновлення бази раз на квартал.

---
## 14. Acceptance Criteria (вимірювані)
- Створити курс, додати 3 модулі, завантажити 5 файлів і опублікувати — пройшло без помилок.
- Teacher імпортує CSV з 200 студентами → всі користувачі створені/оновлені і зараховані в курс.
- Quiz з 20 питань (авто) — система автооцінює >95% спроб та записує у gradebook.
- Page load (course page) — TTFB < 300ms при 95% запитів на тестовому середовищі.
- Е2E сценарії (10) пройшли без помилок.


