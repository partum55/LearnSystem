#!/bin/bash
# Patch CourseDetail.tsx to add grades tab
FILE="CourseDetail.tsx"
# 1. Update imports
sed -i '18s/CourseMembersTab,$/CourseMembersTab,\n  CourseGradesTab,\n  TeacherGradebook,/' "$FILE"
# 2. Update activeTab type
sed -i "s/useState<'modules' | 'quizzes' | 'members'>('modules')/useState<'modules' | 'quizzes' | 'members' | 'grades'>('modules')/" "$FILE"
# 3. Add grades tab to tabs array (after line 281)
sed -i '281a\    { id: '\''grades'\'', name: t('\''gradebook.title'\''), icon: AcademicCapIcon },' "$FILE"
# 4. Add grades tab content (after members tab, around line 660)
sed -i '/activeTab === '\''members'\'' &&/,/^              )}$/a\
\
              {activeTab === '\''grades'\'' && (\
                isInstructor ? (\
                  <TeacherGradebook courseId={id!} />\
                ) : (\
                  <CourseGradesTab courseId={id!} />\
                )\
              )}' "$FILE"
echo "CourseDetail.tsx patched successfully!"
