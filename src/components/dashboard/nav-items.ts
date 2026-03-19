import {
  Bell,
  CalendarDays,
  CalendarRange,
  Home,
  Mail,
  MessageSquare,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home, exact: true },
  { href: "/dashboard/timetable", label: "Timetables", icon: CalendarDays },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/dashboard/reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard/history", label: "History", icon: TriangleAlert },
  { href: "/dashboard/email", label: "Email", icon: Mail },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
