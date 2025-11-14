# 🎯 Генерація елементів з контекстом - Посібник

## 📚 Зміст

1. [Огляд можливостей](#огляд-можливостей)
2. [Використання у UI](#використання-у-ui)
3. [API приклади](#api-приклади)
4. [Поради по промптам](#поради-по-промптам)
5. [Приклади з контекстом](#приклади-з-контекстом)

---

## 🌟 Огляд можливостей

### Що можна генерувати:

#### 1. 📚 Модулі
- Для існуючого курсу
- З контекстом курсу
- Множинна генерація (1-12 модулів)

#### 2. 📝 Завдання (Assignments)
- Для конкретного модуля
- З контекстом курсу + модуля
- Різні типи подання (FILE, TEXT, URL, CODE)
- Налаштування балів та складності

#### 3. ❓ Квізи
- Для конкретного модуля
- З контекстом теми
- Налаштування кількості питань (5-50)
- Ліміт часу та складність

---

## 🎨 Використання у UI

### 1. Генерація модулів на сторінці курсу

**Де**: Course Detail → вкладка "Modules"

**Кнопка**: 🤖 AI Генерація

**Контекст передається автоматично**:
- Код курсу
- Назва курсу
- Опис курсу

**Приклад**:
```
Курс: CS101: Intro to Programming - Learn Python basics

Ваш промпт: "Створи 4 модулі про основи Python з практикою"

AI отримає:
Контекст: CS101: Intro to Programming - Learn Python basics
Промпт: Створи 4 модулі про основи Python з практикою
```

### 2. Генерація завдань у модулі

**Де**: Course Detail → розгорнути модуль → кнопка "🤖 AI Завдання"

**Контекст передається автоматично**:
- Курс
- Назва модуля
- Опис модуля

**Додатково можна вказати**:
- Тип подання (File/Text/URL/Code)
- Максимальний бал
- Кількість завдань

**Приклад**:
```
Курс: CS101: Intro to Programming
Модуль: Variables and Data Types: Learn about different data types

Ваш промпт: "Практичні завдання на роботу зі змінними"

Параметри:
- Тип: CODE
- Бал: 100
- Кількість: 3
```

### 3. Генерація квізів

**Використання**:
```
Контекст: Модуль "Functions in Python"

Промпт: "Квіз на перевірку знань про функції"

Параметри:
- Складність: MEDIUM
- Питань: 10
- Час: 30 хв
```

---

## 🔌 API приклади

### 1. Генерація модулів з контекстом

```typescript
import { aiApi } from '../api/ai';

// Базова генерація
const generateModules = async () => {
  const result = await aiApi.generateModules({
    courseId: "course-uuid-123",
    prompt: "Створи 4 модулі про Python",
    language: "uk",
    moduleCount: 4
  });
  console.log(result.data);
};

// З додатковим контекстом
const generateModulesWithContext = async () => {
  const courseContext = "Курс для студентів 1 курсу з базовими знаннями програмування";
  
  const result = await aiApi.generateModules({
    courseId: "course-uuid-123",
    prompt: "Створи поглиблені модулі про ООП в Python",
    language: "uk",
    moduleCount: 3,
    context: courseContext,
    durationWeeks: 2 // Кожен модуль на 2 тижні
  });
  console.log(result.data);
};
```

### 2. Генерація завдань з контекстом

```typescript
// Базова генерація
const generateAssignments = async () => {
  const result = await aiApi.generateAssignments({
    moduleId: "module-uuid-456",
    moduleTopic: "Робота з файлами в Python",
    language: "uk",
    assignmentCount: 3
  });
};

// З повним контекстом
const generateAssignmentsWithContext = async () => {
  const fullContext = `
Курс: CS101 - Intro to Programming
Модуль: File I/O - Reading and writing files
Студенти: 1 курс, базовий рівень
  `;
  
  const result = await aiApi.generateAssignments({
    moduleId: "module-uuid-456",
    moduleTopic: "Практичні завдання на роботу з файлами",
    language: "uk",
    assignmentCount: 4,
    context: fullContext,
    maxScore: 100,
    submissionType: "CODE"
  });
};
```

### 3. Генерація квізів з контекстом

```typescript
const generateQuiz = async () => {
  const moduleContext = "Студенти вже знають основи Python та функції";
  
  const result = await aiApi.generateQuiz({
    moduleId: "module-uuid-789",
    topic: "Декоратори та замикання в Python",
    language: "uk",
    questionCount: 15,
    context: moduleContext,
    timeLimit: 45,
    difficulty: "HARD"
  });
};
```

---

## 💡 Поради по промптам

### ✅ Добрі промпти:

#### Для модулів:
```
❌ Погано: "Модулі про програмування"

✅ Добре: "Створи 4 модулі про ООП в Python: 
1) Класи та об'єкти (теорія)
2) Інкапсуляція та приватні атрибути
3) Наслідування та поліморфізм
4) Практичний проєкт: система управління бібліотекою"
```

#### Для завдань:
```
❌ Погано: "Завдання з функцій"

✅ Добре: "Створи 3 практичні завдання на функції:
1) Просте завдання на створення функцій з параметрами
2) Середнє завдання з використанням *args і **kwargs
3) Складне завдання на створення декоратора"
```

#### Для квізів:
```
❌ Погано: "Питання про списки"

✅ Добре: "Квіз на перевірку розуміння списків в Python:
- Операції зі списками (індексація, слайсинг)
- Методи списків (append, extend, sort)
- List comprehensions
- Різниця між списками і кортежами"
```

### 🎯 Використання контексту:

#### Контекст курсу:
```typescript
const courseContext = `
Назва: Data Science with Python
Рівень: Середній
Попередні знання: Базовий Python, математика
Мета: Навчити аналізу даних та ML
`;
```

#### Контекст модуля:
```typescript
const moduleContext = `
Модуль: NumPy Basics
Тривалість: 2 тижні
Теми: arrays, indexing, operations, broadcasting
Попередній модуль: Python lists and loops
`;
```

#### Додатковий контекст:
```typescript
const additionalContext = `
Особливості:
- Студенти вже знають pandas
- Фокус на практичні приклади
- Включити реальні dataset
- Додати візуалізацію з matplotlib
`;
```

---

## 📖 Приклади з контекстом

### Приклад 1: Курс з Data Science

```typescript
// Генерація модулів
const result = await aiApi.generateModules({
  courseId: "ds-course-id",
  prompt: `
Створи 6 модулів для курсу Data Science:

Модуль 1: Intro to NumPy (1 тиждень)
Модуль 2: Pandas DataFrame (2 тижні)
Модуль 3: Data Cleaning (1 тиждень)
Модуль 4: Exploratory Data Analysis (2 тижні)
Модуль 5: Data Visualization (1 тиждень)
Модуль 6: Machine Learning Basics (2 тижні)

Кожен модуль має містити:
- Теоретичну частину
- Практичні приклади
- Домашнє завдання
  `,
  language: "uk",
  moduleCount: 6,
  context: "Студенти 2 курсу, знають Python та основи статистики"
});

// Генерація завдань для модуля
const assignments = await aiApi.generateAssignments({
  moduleId: "numpy-module-id",
  moduleTopic: "NumPy arrays та операції",
  language: "uk",
  assignmentCount: 3,
  context: `
Модуль: NumPy Basics
Студенти вже знають: Python lists, loops, functions
Нові теми: ndarray, indexing, broadcasting, vectorization
  `,
  maxScore: 100,
  submissionType: "CODE",
  prompt: `
Створи 3 практичні завдання:

1. Легке (30 балів): 
   - Створення arrays
   - Базові операції
   
2. Середнє (40 балів):
   - Indexing та slicing
   - Математичні операції
   - Broadcasting
   
3. Складне (30 балів):
   - Реальний датасет
   - Аналіз та обробка
   - Візуалізація результатів
  `
});
```

### Приклад 2: Курс веб-розробки

```typescript
// Контекст курсу
const courseContext = `
Курс: Full Stack Web Development
Тривалість: 16 тижнів
Stack: React, Node.js, MongoDB
Рівень: Початковий до середнього
`;

// Генерація модуля з React
const reactModule = await aiApi.generateModules({
  courseId: "web-course-id",
  prompt: `
Модуль: React Fundamentals

Теми:
1. JSX та компоненти
2. Props та State
3. Hooks (useState, useEffect)
4. Event handling
5. Forms та валідація
6. Практичний проєкт: Todo App
  `,
  language: "uk",
  moduleCount: 1,
  context: courseContext + "\nСтуденти вже знають HTML, CSS, JavaScript",
  durationWeeks: 3
});

// Генерація завдань для React
const reactAssignments = await aiApi.generateAssignments({
  moduleId: reactModule.data.moduleId,
  moduleTopic: "React Components and State",
  language: "uk",
  assignmentCount: 4,
  context: `
Студенти вже створили прості компоненти
Потрібно закріпити: hooks, state management, props
  `,
  prompt: `
Завдання на закріплення React:

1. Створити компонент Counter з useState (легке)
2. Створити форму реєстрації з валідацією (середнє)
3. Fetch API та відображення даних з useEffect (середнє)
4. Todo App з CRUD операціями (складне)
  `,
  maxScore: 100,
  submissionType: "URL" // Посилання на GitHub/deployed app
});
```

### Приклад 3: Курс Machine Learning

```typescript
// Генерація квізу з контекстом
const mlQuiz = await aiApi.generateQuiz({
  moduleId: "ml-module-id",
  topic: "Supervised Learning: Regression and Classification",
  language: "uk",
  questionCount: 20,
  context: `
Курс: Machine Learning Fundamentals
Модуль: Supervised Learning
Студенти вивчили:
- Linear Regression
- Logistic Regression
- Decision Trees
- Random Forest
- Evaluation metrics (MSE, accuracy, precision, recall)

Не вивчали ще:
- Neural Networks
- Deep Learning
- Advanced algorithms
  `,
  timeLimit: 60,
  difficulty: "MEDIUM",
  prompt: `
Створи квіз на перевірку розуміння supervised learning:

Типи питань:
- 40% теоретичні (концепції, визначення)
- 30% на розуміння (коли використовувати який алгоритм)
- 30% практичні (інтерпретація результатів, вибір метрик)

Складність:
- 5 легких питань (базові концепції)
- 10 середніх питань (застосування)
- 5 складних питань (критичне мислення)
  `
});
```

---

## 🎓 Практичні сценарії

### Сценарій 1: Підготовка нового курсу

```typescript
// 1. Генерація структури курсу
const course = await aiApi.generateCourse({
  prompt: "Курс з Cybersecurity для початківців",
  language: "uk",
  include_modules: true,
  include_assignments: true,
  include_quizzes: true,
  module_count: 8,
  academic_year: "2024-2025"
});

// 2. Доповнення кожного модуля додатковими завданнями
for (const module of course.data.modules) {
  const additionalAssignments = await aiApi.generateAssignments({
    moduleId: module.id,
    moduleTopic: module.title,
    context: `
Курс: Cybersecurity Basics
Модуль: ${module.title}
Опис: ${module.description}
    `,
    prompt: "Додай 2 практичні лабораторні роботи",
    assignmentCount: 2,
    maxScore: 50
  });
}
```

### Сценарій 2: Оновлення існуючого курсу

```typescript
// Існуючий модуль потребує оновлення
const updatedModule = await aiApi.editContent({
  entity_type: "MODULE",
  entity_id: "old-module-id",
  current_content: "Старий опис модуля про Docker...",
  edit_prompt: `
Оновити модуль з урахуванням:
- Нових версій Docker (Docker Compose v2)
- Kubernetes basics
- CI/CD з Docker
- Best practices 2024
  `,
  language: "uk"
});

// Генерація нових завдань для оновленого модуля
const newAssignments = await aiApi.generateAssignments({
  moduleId: "old-module-id",
  moduleTopic: "Docker and Containerization - Updated 2024",
  context: "Оновлений модуль включає Docker Compose v2 та intro to K8s",
  prompt: "Сучасні практичні завдання з Docker",
  assignmentCount: 3
});
```

---

## 🚀 Tips & Tricks

### 1. Ітеративна генерація

```typescript
// Спочатку згенерувати базову структуру
const basic = await aiApi.generateModules({
  courseId: "course-id",
  prompt: "4 модулі про Python basics",
  moduleCount: 4
});

// Потім додати деталі до кожного
for (const module of basic.data.modules) {
  await aiApi.generateAssignments({
    moduleId: module.id,
    moduleTopic: module.title,
    context: module.description,
    prompt: "Практичні завдання різної складності",
    assignmentCount: 3
  });
  
  await aiApi.generateQuiz({
    moduleId: module.id,
    topic: module.title,
    context: module.description,
    questionCount: 10
  });
}
```

### 2. Використання шаблонів

```typescript
// Шаблон для генерації завдань
const assignmentTemplate = {
  beginner: {
    context: "Студенти 1 курс, базові знання",
    maxScore: 50,
    count: 2
  },
  intermediate: {
    context: "Студенти 2-3 курс, хороша база",
    maxScore: 75,
    count: 3
  },
  advanced: {
    context: "Студенти 4 курс, поглиблені знання",
    maxScore: 100,
    count: 4
  }
};

// Використання
const level = "intermediate";
const template = assignmentTemplate[level];

await aiApi.generateAssignments({
  moduleId: "module-id",
  moduleTopic: "Advanced Python",
  context: template.context,
  assignmentCount: template.count,
  maxScore: template.maxScore,
  prompt: "Завдання рівня " + level
});
```

### 3. Batch генерація

```typescript
// Генерація для всіх модулів одразу
const moduleIds = ["mod-1", "mod-2", "mod-3"];
const moduleTopics = [
  "Python Basics",
  "Data Structures",
  "OOP"
];

const results = await Promise.all(
  moduleIds.map((id, index) =>
    aiApi.generateAssignments({
      moduleId: id,
      moduleTopic: moduleTopics[index],
      language: "uk",
      assignmentCount: 3,
      context: `Модуль ${index + 1} з 3, прогресивна складність`
    })
  )
);
```

---

## 📝 Висновок

Використовуйте контекст для:
- ✅ Кращої релевантності згенерованого контенту
- ✅ Консистентності між модулями
- ✅ Адаптації під рівень студентів
- ✅ Інтеграції з існуючими матеріалами

**Ключ до успіху**: Детальний контекст + специфічний промпт = якісний результат! 🎯

