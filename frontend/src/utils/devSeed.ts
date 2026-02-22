/**
 * Dev-only utilities for quick login and test data seeding.
 * Only used when import.meta.env.DEV is true.
 */
import apiClient from '../api/client';
import { setAccessToken, setRefreshToken } from '../api/token';

// ── Test credentials ──────────────────────────────────────────────────
const TEST_TEACHER = {
  email: 'teacher@test.com',
  password: 'Teacher123!',
  firstName: 'Test',
  lastName: 'Teacher',
  role: 'TEACHER',
};

const TEST_STUDENT = {
  email: 'student@test.com',
  password: 'Student123!',
  firstName: 'Test',
  lastName: 'Student',
  role: 'STUDENT',
};

const TEST_COURSE_CODE = 'CS-TEST-101';

// ── Helpers ───────────────────────────────────────────────────────────

interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
}

async function tryLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

async function register(creds: typeof TEST_TEACHER) {
  await apiClient.post('/auth/register', {
    email: creds.email,
    password: creds.password,
    firstName: creds.firstName,
    lastName: creds.lastName,
    role: creds.role,
    locale: 'EN',
  });
}

async function loginOrRegister(creds: typeof TEST_TEACHER): Promise<LoginResponse> {
  try {
    return await tryLogin(creds.email, creds.password);
  } catch {
    // Account doesn't exist yet — register, then login
    await register(creds);
    return await tryLogin(creds.email, creds.password);
  }
}

function storeTokens(data: LoginResponse) {
  if (data.accessToken) setAccessToken(data.accessToken);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
}

// ── Public API ────────────────────────────────────────────────────────

export type DevLoginRole = 'TEACHER' | 'STUDENT';

export interface DevLoginResult {
  user: Record<string, unknown>;
}

/**
 * Login as a dev test user. Registers the account if it doesn't exist.
 * For TEACHER role, also seeds test course data.
 */
export async function devLogin(role: DevLoginRole): Promise<DevLoginResult> {
  const creds = role === 'TEACHER' ? TEST_TEACHER : TEST_STUDENT;
  const data = await loginOrRegister(creds);
  storeTokens(data);

  if (role === 'TEACHER') {
    await seedTestData();
  }

  if (role === 'STUDENT') {
    await enrollStudentInTestCourse();
  }

  return { user: data.user || {} };
}

// ── Seed logic ────────────────────────────────────────────────────────

async function findTestCourse(): Promise<string | null> {
  try {
    const res = await apiClient.get<{ content?: Record<string, unknown>[]; } | Record<string, unknown>[]>(
      '/courses/my?size=100'
    );
    const courses = Array.isArray(res.data) ? res.data : (res.data.content || []);
    const found = courses.find(
      (c) => (c.code as string) === TEST_COURSE_CODE
    );
    return found ? String(found.id) : null;
  } catch {
    return null;
  }
}

async function seedTestData() {
  try {
    // Check if test course already exists
    const existingId = await findTestCourse();
    if (existingId) {
      console.log('[dev-seed] Test course already exists:', existingId);
      return;
    }

    console.log('[dev-seed] Creating test course and data...');

    // 1. Create course
    const courseRes = await apiClient.post<Record<string, unknown>>('/courses', {
      code: TEST_COURSE_CODE,
      titleUk: 'Тестовий курс: Вступ до програмування',
      titleEn: 'Test Course: Introduction to Programming',
      descriptionUk: 'Тестовий курс для розробки. Містить модулі, завдання та тести.',
      descriptionEn: 'Test course for development. Contains modules, assignments, and quizzes.',
      visibility: 'PUBLIC',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      maxStudents: 50,
      isPublished: true,
    });
    const courseId = String(courseRes.data.id);
    console.log('[dev-seed] Course created:', courseId);

    // 2. Create modules
    const mod1Res = await apiClient.post<Record<string, unknown>>(
      `/courses/${courseId}/modules`,
      { title: 'Module 1: Fundamentals', description: 'Variables, types, and control flow.', isPublished: true }
    );
    const mod1Id = String(mod1Res.data.id);

    const mod2Res = await apiClient.post<Record<string, unknown>>(
      `/courses/${courseId}/modules`,
      { title: 'Module 2: Data Structures', description: 'Arrays, lists, and maps.', isPublished: true }
    );
    const mod2Id = String(mod2Res.data.id);
    console.log('[dev-seed] Modules created:', mod1Id, mod2Id);

    // 3. Create assignments
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await apiClient.post('/assessments/assignments', {
      courseId,
      moduleId: mod1Id,
      assignmentType: 'TEXT',
      title: 'Essay: Why Programming Matters',
      description: 'Write a 500-word essay on the importance of programming in modern society.',
      instructions: 'Use clear arguments and cite at least two sources.',
      maxPoints: 100,
      dueDate,
      isPublished: true,
      allowLateSubmission: true,
      latePenaltyPercent: 10,
    });

    await apiClient.post('/assessments/assignments', {
      courseId,
      moduleId: mod1Id,
      assignmentType: 'FILE_UPLOAD',
      title: 'Lab 1: Hello World',
      description: 'Create a program that prints "Hello, World!" in your preferred language.',
      instructions: 'Upload your source code file (.py, .java, .js, or .cpp).',
      maxPoints: 50,
      dueDate,
      allowedFileTypes: ['.py', '.java', '.js', '.cpp'],
      maxFileSize: 5242880,
      maxFiles: 3,
      isPublished: true,
    });

    await apiClient.post('/assessments/assignments', {
      courseId,
      moduleId: mod2Id,
      assignmentType: 'CODE',
      title: 'Coding Challenge: Reverse a Linked List',
      description: 'Implement a function to reverse a singly linked list.',
      instructions: 'Your solution should run in O(n) time and O(1) space.',
      maxPoints: 150,
      dueDate,
      programmingLanguage: 'python',
      autoGradingEnabled: true,
      testCases: [
        { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]' },
        { input: '[1]', expectedOutput: '[1]' },
        { input: '[]', expectedOutput: '[]' },
      ],
      isPublished: true,
    });
    console.log('[dev-seed] Assignments created');

    // 4. Create questions
    const q1Res = await apiClient.post<Record<string, unknown>>('/assessments/questions', {
      courseId,
      questionType: 'MULTIPLE_CHOICE',
      stem: 'Which of the following is NOT a primitive data type in Java?',
      options: ['int', 'String', 'boolean', 'double'],
      correctAnswer: 'String',
      points: 10,
    });
    const q1Id = String(q1Res.data.id);

    const q2Res = await apiClient.post<Record<string, unknown>>('/assessments/questions', {
      courseId,
      questionType: 'TRUE_FALSE',
      stem: 'Python is a statically typed programming language.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      points: 5,
    });
    const q2Id = String(q2Res.data.id);

    const q3Res = await apiClient.post<Record<string, unknown>>('/assessments/questions', {
      courseId,
      questionType: 'SHORT_ANSWER',
      stem: 'What keyword is used to define a function in Python?',
      correctAnswer: 'def',
      points: 5,
    });
    const q3Id = String(q3Res.data.id);

    const q4Res = await apiClient.post<Record<string, unknown>>('/assessments/questions', {
      courseId,
      questionType: 'MULTIPLE_CHOICE',
      stem: 'What is the time complexity of binary search?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctAnswer: 'O(log n)',
      points: 10,
    });
    const q4Id = String(q4Res.data.id);
    console.log('[dev-seed] Questions created');

    // 5. Create quiz and attach questions
    const quizRes = await apiClient.post<Record<string, unknown>>('/assessments/quizzes', null, {
      params: {
        courseId,
        title: 'Quiz 1: Programming Basics',
        description: 'Test your knowledge of fundamental programming concepts.',
      },
    });
    const quizId = String(quizRes.data.id);

    for (const qId of [q1Id, q2Id, q3Id, q4Id]) {
      await apiClient.post(`/assessments/quizzes/${quizId}/questions/${qId}`);
    }
    console.log('[dev-seed] Quiz created and questions attached:', quizId);

    console.log('[dev-seed] All test data seeded successfully!');
  } catch (err) {
    console.error('[dev-seed] Failed to seed test data:', err);
    // Don't throw — login still succeeded even if seeding failed
  }
}

async function enrollStudentInTestCourse() {
  try {
    // Find the test course (might have been created by a teacher login)
    // We need to get all public courses since student may not be enrolled yet
    const res = await apiClient.get<{ content?: Record<string, unknown>[]; } | Record<string, unknown>[]>(
      '/courses/my?size=100'
    );
    const courses = Array.isArray(res.data) ? res.data : (res.data.content || []);
    const testCourse = courses.find((c) => (c.code as string) === TEST_COURSE_CODE);

    if (!testCourse) {
      console.log('[dev-seed] Test course not found. Login as teacher first to create it.');
      return;
    }

    const courseId = String(testCourse.id);

    // Try self-enroll
    const meRes = await apiClient.get<Record<string, unknown>>('/users/me');
    const userId = String(meRes.data.id);

    await apiClient.post(`/courses/${courseId}/enroll`, {
      userId,
      roleInCourse: 'STUDENT',
    });
    console.log('[dev-seed] Student enrolled in test course');
  } catch (err) {
    // Already enrolled or course doesn't exist — either way, not critical
    console.log('[dev-seed] Student enrollment skipped (may already be enrolled):', err);
  }
}
