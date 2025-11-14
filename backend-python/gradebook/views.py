from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from django.utils import timezone
from courses.models import Course, CourseMember
from .models import GradebookEntry, GradebookCategory, CourseGradeSummary, GradeHistory
from .serializers import (
    GradebookEntrySerializer, GradebookEntryUpdateSerializer,
    GradebookCategorySerializer, CourseGradeSummarySerializer,
    GradeHistorySerializer, StudentGradebookViewSerializer,
    GradebookOverviewSerializer
)
from courses.permissions import IsTeacherOrTA


class GradebookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for gradebook operations.
    """
    serializer_class = GradebookEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['TEACHER', 'SUPERADMIN']:
            # Teachers and superadmins see all entries for their courses
            # Superadmins see all entries
            if user.role == 'SUPERADMIN':
                return GradebookEntry.objects.all().select_related('student', 'assignment', 'course')
            return GradebookEntry.objects.filter(
                course__owner=user
            ).select_related('student', 'assignment', 'course')
        else:
            # Students only see their own entries
            return GradebookEntry.objects.filter(
                student=user
            ).select_related('assignment', 'course')
    
    @action(detail=False, methods=['get'], url_path='course/(?P<course_id>[^/.]+)')
    def course_gradebook(self, request, course_id=None):
        """
        Get full gradebook for a course (teacher view).
        Returns all students and all assignments in a matrix format.
        """
        course = get_object_or_404(Course, id=course_id)
        
        # Check permission
        if request.user.role not in ['TEACHER', 'SUPERADMIN', 'TA']:
            return Response(
                {'error': 'Only teachers and admins can view full gradebook'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all students in course
        students = CourseMember.objects.filter(
            course=course,
            role_in_course='STUDENT'
        ).select_related('user')
        
        # Get all assignments
        from assessments.models import Assignment
        assignments = Assignment.objects.filter(
            course=course,
            is_published=True
        ).order_by('due_date')
        
        # Get all gradebook entries
        entries = GradebookEntry.objects.filter(
            course=course
        ).select_related('student', 'assignment')
        
        # Build matrix
        gradebook_data = []
        for member in students:
            student_data = {
                'student_id': str(member.user.id),
                'student_name': member.user.display_name,
                'student_email': member.user.email,
                'grades': {},
                'summary': None
            }
            
            # Get summary
            try:
                summary = CourseGradeSummary.objects.get(
                    course=course,
                    student=member.user
                )
                student_data['summary'] = {
                    'current_grade': float(summary.current_grade) if summary.current_grade else None,
                    'letter_grade': summary.letter_grade,
                    'total_points_earned': float(summary.total_points_earned),
                    'total_points_possible': float(summary.total_points_possible),
                    'assignments_completed': summary.assignments_completed,
                    'assignments_total': summary.assignments_total,
                }
            except CourseGradeSummary.DoesNotExist:
                pass
            
            # Get grades for each assignment
            for assignment in assignments:
                entry = entries.filter(
                    student=member.user,
                    assignment=assignment
                ).first()

                if entry:
                    student_data['grades'][str(assignment.id)] = {
                        'score': float(entry.get_final_score()) if entry.get_final_score() else None,
                        'max_score': float(entry.max_score),
                        'percentage': float(entry.percentage) if entry.percentage else None,
                        'status': entry.status,
                        'is_late': entry.is_late,
                        'is_excused': entry.is_excused,
                    }
                else:
                    student_data['grades'][str(assignment.id)] = None

            gradebook_data.append(student_data)
        
        # Assignment info
        assignment_info = []
        for assignment in assignments:
            assignment_info.append({
                'id': str(assignment.id),
                'title': assignment.title,
                'max_points': float(assignment.max_points),
                'due_date': assignment.due_date,
                'category': str(assignment.category.id) if assignment.category else None,
            })

        return Response({
            'course_id': str(course.id),
            'course_code': course.code,
            'course_title': course.title_uk or course.title_en,
            'assignments': assignment_info,
            'students': gradebook_data,
        })

    @action(detail=False, methods=['get'], url_path='student/(?P<course_id>[^/.]+)')
    def student_gradebook(self, request, course_id=None):
        """
        Get gradebook for a specific student in a course (student view).

        Structured by modules for better navigation.
        """
        course = get_object_or_404(Course, id=course_id)
        student = request.user

        # Get all modules
        from courses.models import Module
        modules = Module.objects.filter(course=course, is_published=True).order_by('position')

        # Get all assignments
        from assessments.models import Assignment
        assignments = Assignment.objects.filter(
            course=course,
            is_published=True
        ).order_by('module__position', 'position')

        # Get student's entries
        entries = GradebookEntry.objects.filter(
            course=course,
            student=student
        ).select_related('assignment')

        # Build gradebook structured by modules
        modules_data = []

        for module in modules:
            module_assignments = assignments.filter(module=module)
            module_grades = []

            for assignment in module_assignments:
                entry = entries.filter(assignment=assignment).first()

                grade_data = {
                    'assignment_id': str(assignment.id),
                    'assignment_title': assignment.title,
                    'assignment_type': assignment.assignment_type,
                    'max_points': float(assignment.max_points),
                    'due_date': assignment.due_date,
                    'category': assignment.category.name if assignment.category else None,
                }

                if entry:
                    grade_data.update({
                        'score': float(entry.get_final_score()) if entry.get_final_score() else None,
                        'percentage': float(entry.percentage) if entry.percentage else None,
                        'status': entry.status,
                        'is_late': entry.is_late,
                        'is_excused': entry.is_excused,
                        'graded_at': entry.graded_at,
                        'notes': entry.notes if not entry.is_excused else None,
                    })
                else:
                    grade_data.update({
                        'score': None,
                        'percentage': None,
                        'status': 'NOT_SUBMITTED',
                        'is_late': False,
                        'is_excused': False,
                        'graded_at': None,
                        'notes': None,
                    })

                module_grades.append(grade_data)

            if module_grades:  # Only include modules that have assignments
                modules_data.append({
                    'module_id': str(module.id),
                    'module_title': module.title,
                    'module_position': module.position,
                    'grades': module_grades
                })

        # Assignments not in any module
        unassigned_assignments = assignments.filter(module__isnull=True)
        unassigned_grades = []

        for assignment in unassigned_assignments:
            entry = entries.filter(assignment=assignment).first()

            grade_data = {
                'assignment_id': str(assignment.id),
                'assignment_title': assignment.title,
                'assignment_type': assignment.assignment_type,
                'max_points': float(assignment.max_points),
                'due_date': assignment.due_date,
                'category': assignment.category.name if assignment.category else None,
            }

            if entry:
                grade_data.update({
                    'score': float(entry.get_final_score()) if entry.get_final_score() else None,
                    'percentage': float(entry.percentage) if entry.percentage else None,
                    'status': entry.status,
                    'is_late': entry.is_late,
                    'is_excused': entry.is_excused,
                    'graded_at': entry.graded_at,
                    'notes': entry.notes if not entry.is_excused else None,
                })
            else:
                grade_data.update({
                    'score': None,
                    'percentage': None,
                    'status': 'NOT_SUBMITTED',
                    'is_late': False,
                    'is_excused': False,
                    'graded_at': None,
                    'notes': None,
                })

            unassigned_grades.append(grade_data)

        if unassigned_grades:
            modules_data.append({
                'module_id': None,
                'module_title': 'Other Assignments',
                'module_position': 9999,
                'grades': unassigned_grades
            })

        # Get course summary
        try:
            summary = CourseGradeSummary.objects.get(
                course=course,
                student=student
            )
            summary_data = {
                'current_grade': float(summary.current_grade) if summary.current_grade else None,
                'letter_grade': summary.letter_grade,
                'total_points_earned': float(summary.total_points_earned),
                'total_points_possible': float(summary.total_points_possible),
                'assignments_completed': summary.assignments_completed,
                'assignments_total': summary.assignments_total,
            }
        except CourseGradeSummary.DoesNotExist:
            summary_data = None

        return Response({
            'course_id': str(course.id),
            'course_code': course.code,
            'course_title': course.title_uk or course.title_en,
            'summary': summary_data,
            'modules': modules_data,
        })

    @action(detail=False, methods=['get'], url_path='student/all')
    def all_student_grades(self, request):
        """
        Get all grades for the current student across all their courses.
        """
        student = request.user

        # Get all courses the student is enrolled in
        enrolled_courses = Course.objects.filter(
            members__user=student,
            members__role_in_course='STUDENT'
        ).distinct()

        all_grades = []

        for course in enrolled_courses:
            try:
                summary = CourseGradeSummary.objects.get(
                    course=course,
                    student=student
                )
                course_data = {
                    'course_id': str(course.id),
                    'course_code': course.code,
                    'course_title': course.title_uk,  # Use title_uk as default
                    'current_grade': float(summary.current_grade) if summary.current_grade else None,
                    'letter_grade': summary.letter_grade,
                    'total_points_earned': float(summary.total_points_earned),
                    'total_points_possible': float(summary.total_points_possible),
                    'assignments_completed': summary.assignments_completed,
                    'assignments_total': summary.assignments_total,
                    'completion_rate': (summary.assignments_completed / summary.assignments_total * 100) if summary.assignments_total > 0 else 0,
                }
            except CourseGradeSummary.DoesNotExist:
                course_data = {
                    'course_id': str(course.id),
                    'course_code': course.code,
                    'course_title': course.title_uk,
                    'current_grade': None,
                    'letter_grade': None,
                    'total_points_earned': 0,
                    'total_points_possible': 0,
                    'assignments_completed': 0,
                    'assignments_total': 0,
                    'completion_rate': 0,
                }

            all_grades.append(course_data)

        return Response({
            'student_id': str(student.id),
            'student_name': student.display_name,
            'courses': all_grades,
        })

    @action(detail=True, methods=['patch'], permission_classes=[IsTeacherOrTA])
    def update_grade(self, request, pk=None):
        """
        Update a grade (override score, excuse, etc.).
        """
        entry = self.get_object()
        serializer = GradebookEntryUpdateSerializer(
            entry,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            # Track who made the change
            if 'override_score' in request.data:
                entry.override_by = request.user
                from django.utils import timezone
                entry.override_at = timezone.now()
            
            serializer.save()
            
            # Recalculate summary
            from .signals import update_course_grade_summary
            update_course_grade_summary(entry.course, entry.student)
            
            return Response(GradebookEntrySerializer(entry).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get grade change history for an entry.
        """
        entry = self.get_object()
        history = GradeHistory.objects.filter(gradebook_entry=entry)
        serializer = GradeHistorySerializer(history, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='recalculate/(?P<course_id>[^/.]+)')
    def recalculate_grades(self, request, course_id=None):
        """
        Recalculate all grades for a course.
        """
        course = get_object_or_404(Course, id=course_id)
        
        # Check permission
        if request.user.role not in ['TEACHER', 'SUPERADMIN']:
            return Response(
                {'error': 'Only teachers and admins can recalculate grades'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all students
        students = CourseMember.objects.filter(
            course=course,
            role_in_course='STUDENT'
        )
        
        updated_count = 0
        for member in students:
            summary, _ = CourseGradeSummary.objects.get_or_create(
                course=course,
                student=member.user
            )
            summary.calculate_current_grade()
            summary.save()
            updated_count += 1
        
        return Response({
            'message': f'Successfully recalculated grades for {updated_count} students',
            'updated_count': updated_count
        })


class GradebookCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for gradebook categories.
    """
    serializer_class = GradebookCategorySerializer
    permission_classes = [IsAuthenticated, IsTeacherOrTA]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['TEACHER', 'SUPERADMIN']:
            if user.role == 'SUPERADMIN':
                return GradebookCategory.objects.all()
            return GradebookCategory.objects.filter(
                course__owner=user
            )
        
        return GradebookCategory.objects.none()
    
    @action(detail=False, methods=['get'], url_path='course/(?P<course_id>[^/.]+)')
    def course_categories(self, request, course_id=None):
        """
        Get all categories for a course.
        """
        course = get_object_or_404(Course, id=course_id)
        categories = GradebookCategory.objects.filter(course=course).order_by('position')
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)


class CourseGradeSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for course grade summaries (read-only).
    """
    serializer_class = CourseGradeSummarySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['TEACHER', 'SUPERADMIN']:
            if user.role == 'SUPERADMIN':
                return CourseGradeSummary.objects.all().select_related('student', 'course')
            return CourseGradeSummary.objects.filter(
                course__owner=user
            ).select_related('student', 'course')
        else:
            return CourseGradeSummary.objects.filter(
                student=user
            ).select_related('course')
