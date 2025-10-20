import re
# Read the file
with open('CourseDetail.tsx', 'r') as f:
    content = f.read()
# 1. Fix imports - add CourseGradesTab and TeacherGradebook if not present
if 'CourseGradesTab' not in content:
    content = content.replace(
        'CourseMembersTab,',
        'CourseMembersTab,\n  CourseGradesTab,\n  TeacherGradebook,'
    )
# 2. Fix activeTab type
content = re.sub(
    r"useState<'modules' \| 'quizzes' \| 'members'>\('modules'\)",
    "useState<'modules' | 'quizzes' | 'members' | 'grades'>('modules')",
    content
)
# 3. Add grades tab to tabs array (find the line with UserGroupIcon and add after it)
content = re.sub(
    r"(\{ id: 'members', name: t\('courses\.students'\), icon: UserGroupIcon \},)",
    r"\1\n    { id: 'grades', name: t('gradebook.title'), icon: AcademicCapIcon },",
    content,
    count=1
)
# 4. Remove all duplicate grades tab content first
content = re.sub(
    r'\n\s*\{activeTab === \'grades\' && \([^}]+\}\)\}',
    '',
    content
)
# 5. Add grades tab content after members tab (find the closing of members tab)
members_pattern = r"(\{activeTab === 'members' &&[^}]+<CourseMembersTab[^/]+/>\s+\)\})"
grades_content = """
              {activeTab === 'grades' && (
                isInstructor ? (
                  <TeacherGradebook courseId={id!} />
                ) : (
                  <CourseGradesTab courseId={id!} />
                )
              )}"""
content = re.sub(members_pattern, r'\1' + grades_content, content, count=1)
# Write back
with open('CourseDetail.tsx', 'w') as f:
    f.write(content)
print("CourseDetail.tsx fixed successfully!")
