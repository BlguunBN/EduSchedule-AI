import type { CalendarEvent, EmailMessage, TimetableEntry } from "@/lib/edu-schedule/types";

export const sampleCalendarEvents: CalendarEvent[] = [
  {
    id: "evt-calculus",
    title: "Calculus II Lecture",
    startsAt: "2026-03-13T08:00:00.000Z",
    endsAt: "2026-03-13T09:30:00.000Z",
    location: "Room A-204",
    source: "TIMETABLE",
    tags: ["math", "class"],
  },
  {
    id: "evt-lab",
    title: "AI Lab",
    startsAt: "2026-03-13T11:00:00.000Z",
    endsAt: "2026-03-13T12:30:00.000Z",
    location: "Innovation Hub",
    source: "TIMETABLE",
    tags: ["lab"],
  },
  {
    id: "evt-advisor",
    title: "Advisor Check-in",
    startsAt: "2026-03-13T14:00:00.000Z",
    endsAt: "2026-03-13T14:30:00.000Z",
    location: "Online",
    source: "EMAIL",
    tags: ["meeting"],
  },
];

export const sampleTimetableEntries: TimetableEntry[] = [
  {
    id: "tt-1",
    courseCode: "CS301",
    courseName: "Machine Learning Systems",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:30",
    location: "Lab 5",
    instructor: "Dr. Chen",
  },
  {
    id: "tt-2",
    courseCode: "MATH204",
    courseName: "Discrete Mathematics",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "14:30",
    location: "Room B-101",
    instructor: "Prof. Wang",
  },
];

export const sampleEmailMessages: EmailMessage[] = [
  {
    id: "mail-1",
    subject: "Project presentation moved to Friday 10:00",
    from: "instructor@university.edu",
    receivedAt: "2026-03-12T07:25:00.000Z",
    bodyText: "Hi everyone, the project presentation is now on Friday at 10:00 in Room 402. Please upload slides before Thursday 18:00.",
  },
  {
    id: "mail-2",
    subject: "Library workshop registration",
    from: "library@university.edu",
    receivedAt: "2026-03-12T09:10:00.000Z",
    bodyText: "Registration for the citation workshop closes on Wednesday. Seats are limited but optional.",
  },
  {
    id: "mail-3",
    subject: "Tuition invoice reminder",
    from: "billing@university.edu",
    receivedAt: "2026-03-12T10:15:00.000Z",
    bodyText: "This is a reminder that the tuition invoice is due on 2026-03-20. Contact the office if you need support.",
  },
];
