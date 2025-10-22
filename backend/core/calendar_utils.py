"""
Calendar utilities for iCal export and event management
"""
from datetime import datetime, timedelta
from django.http import HttpResponse
from icalendar import Calendar, Event as iCalEvent, vText
import pytz


class iCalGenerator:
    """Generate iCal files for calendar events"""
    
    @staticmethod
    def generate_course_calendar(course, events):
        """
        Generate iCal file for course events
        
        Args:
            course: Course instance
            events: QuerySet of CalendarEvent instances
        
        Returns:
            HttpResponse with iCal file
        """
        cal = Calendar()
        cal.add('prodid', '-//LMS Calendar//EN')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('method', 'PUBLISH')
        cal.add('x-wr-calname', f'{course.title} - Calendar')
        cal.add('x-wr-timezone', 'UTC')
        
        for event in events:
            ical_event = iCalEvent()
            ical_event.add('uid', f'{event.id}@lms.com')
            ical_event.add('summary', event.title)
            ical_event.add('description', event.description or '')
            ical_event.add('dtstart', event.start_time)
            ical_event.add('dtend', event.end_time)
            ical_event.add('dtstamp', datetime.now(pytz.UTC))
            
            if event.recurrence_rule:
                ical_event.add('rrule', event.recurrence_rule)
            
            # Add location/url if needed
            ical_event.add('location', f'Course: {course.title}')
            
            # Add categories
            ical_event.add('categories', [event.event_type])
            
            cal.add_component(ical_event)
        
        # Generate response
        response = HttpResponse(cal.to_ical(), content_type='text/calendar')
        response['Content-Disposition'] = f'attachment; filename="{course.title.replace(" ", "_")}_calendar.ics"'
        return response
    
    @staticmethod
    def generate_deadline_events(assignments, quizzes):
        """
        Generate calendar events from assignments and quizzes
        
        Args:
            assignments: QuerySet of Assignment instances
            quizzes: QuerySet of Quiz instances
        
        Returns:
            List of event dictionaries
        """
        events = []
        
        # Add assignment deadlines
        for assignment in assignments:
            if assignment.deadline:
                events.append({
                    'title': f'Assignment Due: {assignment.title}',
                    'description': assignment.description,
                    'start_time': assignment.deadline - timedelta(hours=1),
                    'end_time': assignment.deadline,
                    'event_type': 'assignment',
                    'related_id': assignment.id
                })
        
        # Add quiz times
        for quiz in quizzes:
            if quiz.start_time and quiz.end_time:
                events.append({
                    'title': f'Quiz: {quiz.title}',
                    'description': quiz.description,
                    'start_time': quiz.start_time,
                    'end_time': quiz.end_time,
                    'event_type': 'quiz',
                    'related_id': quiz.id
                })
        
        return events


def create_reminder_notifications(event, user, reminder_time):
    """
    Create notification reminders for calendar events
    
    Args:
        event: CalendarEvent instance
        user: User instance
        reminder_time: timedelta before event (e.g., timedelta(days=1))
    
    Returns:
        Notification instance
    """
    from notifications.models import Notification
    from core.models import CalendarEvent
    
    reminder_datetime = event.start_time - reminder_time
    
    # Create scheduled notification
    notification = Notification.objects.create(
        user=user,
        title=f'Reminder: {event.title}',
        message=f'{event.title} is coming up on {event.start_time.strftime("%B %d at %I:%M %p")}',
        type='reminder',
        related_object_type='calendar_event',
        related_object_id=event.id,
        scheduled_for=reminder_datetime
    )
    
    return notification


def sync_deadlines_to_calendar(course):
    """
    Sync all course deadlines to calendar events
    
    Args:
        course: Course instance
    
    Returns:
        int: Number of events created
    """
    from core.models import CalendarEvent
    from assessments.models import Assignment, Quiz
    
    # Get assignments and quizzes
    assignments = Assignment.objects.filter(course=course)
    quizzes = Quiz.objects.filter(course=course)
    
    # Generate events
    event_data = iCalGenerator.generate_deadline_events(assignments, quizzes)
    
    # Create CalendarEvent instances
    created_count = 0
    for data in event_data:
        event, created = CalendarEvent.objects.get_or_create(
            course=course,
            event_type=data['event_type'],
            related_id=data['related_id'],
            defaults={
                'title': data['title'],
                'description': data['description'],
                'start_time': data['start_time'],
                'end_time': data['end_time'],
                'created_by': course.owner
            }
        )
        if created:
            created_count += 1
    
    return created_count

