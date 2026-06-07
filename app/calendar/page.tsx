"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────
type Priority = "high" | "medium" | "low";
type ViewMode = "month" | "week" | "agenda";

interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  priority: Priority;
  category: string;
  reminderBefore: string;
  recurring?: string;
  completed: boolean;
}

// ── Mock Data ────────────────────────────────────────────
const TODAY = new Date();
const yyyy = TODAY.getFullYear();
const mm = String(TODAY.getMonth() + 1).padStart(2, "0");
const dd = String(TODAY.getDate()).padStart(2, "0");
const TODAY_STR = `${yyyy}-${mm}-${dd}`;

function dateStr(offsetDays: number, baseDate = TODAY): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

const MOCK_TASKS: Task[] = [
  { id: "1", title: "Team Standup", date: TODAY_STR, time: "09:00", priority: "high", category: "Work", reminderBefore: "30 min before", recurring: "Daily", completed: false },
  { id: "2", title: "Gym Session", date: TODAY_STR, time: "18:30", priority: "low", category: "Health", reminderBefore: "15 min before", recurring: "Mon, Wed, Fri", completed: false },
  { id: "3", title: "Dentist Appointment", date: dateStr(1), time: "15:00", priority: "high", category: "Health", reminderBefore: "1 hour before", completed: false },
  { id: "4", title: "Submit Q3 Report", date: dateStr(3), time: "17:00", priority: "medium", category: "Work", reminderBefore: "2 hours before", completed: false },
  { id: "5", title: "Pay Electricity Bill", date: dateStr(5), time: "12:00", priority: "medium", category: "Finance", reminderBefore: "1 day before", recurring: "Monthly", completed: false },
  { id: "6", title: "Team Lunch", date: dateStr(3), time: "12:30", priority: "low", category: "Work", reminderBefore: "30 min before", completed: false },
  { id: "7", title: "Product Design Review", date: dateStr(7), time: "10:00", priority: "high", category: "Work", reminderBefore: "1 hour before", completed: false },
  { id: "8", title: "Call Mom", date: dateStr(-1), time: "19:00", priority: "low", category: "Personal", reminderBefore: "30 min before", completed: true },
  { id: "9", title: "Read Design Book", date: dateStr(10), time: "20:00", priority: "low", category: "Education", reminderBefore: "15 min before", recurring: "Weekly", completed: false },
  { id: "10", title: "Budget Review", date: dateStr(2), time: "11:00", priority: "medium", category: "Finance", reminderBefore: "30 min before", completed: false },
  { id: "11", title: "Morning Meditation", date: dateStr(1), time: "07:00", priority: "low", category: "Health", reminderBefore: "5 min before", recurring: "Daily", completed: false },
  { id: "12", title: "Sprint Planning", date: dateStr(6), time: "09:30", priority: "high", category: "Work", reminderBefore: "30 min before", completed: false },
];

// ── Helpers ──────────────────────────────────────────────
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

const PRIORITY_PILL: Record<Priority, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/25",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const CATEGORY_COLOR: Record<string, string> = {
  Work: "text-[#a78bfa]",
  Health: "text-emerald-400",
  Finance: "text-amber-400",
  Personal: "text-pink-400",
  Education: "text-sky-400",
  Other: "text-white/50",
};

const CATEGORY_BAR: Record<string, string> = {
  Work: "bg-[#a78bfa]",
  Health: "bg-emerald-400",
  Finance: "bg-amber-400",
  Personal: "bg-pink-400",
  Education: "bg-sky-400",
  Other: "bg-white/30",
};

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Task Dot component ───────────────────────────────────
function TaskDot({ task }: { task: Task }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.completed ? "bg-white/15" : PRIORITY_DOT[task.priority]}`} />
  );
}

// ── Task Pill for month view ─────────────────────────────
function TaskPill({ task, onClick }: { task: Task; onClick: () => void }) {
  const bar = task.completed ? "bg-white/15" : CATEGORY_BAR[task.category] ?? "bg-white/30";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left text-[10px] font-medium truncate transition-all hover:opacity-80 ${
        task.completed ? "opacity-30 line-through" : ""
      } bg-white/[0.04] border border-white/8 hover:border-white/15`}
    >
      <span className={`w-1 h-3 rounded-full flex-shrink-0 ${bar}`} />
      <span className="truncate text-white/70">{task.title}</span>
    </button>
  );
}

// ── Task Detail Panel ────────────────────────────────────
function TaskDetailPanel({ task, onClose, onToggle }: { task: Task; onClose: () => void; onToggle: (id: string) => void }) {
  const catColor = CATEGORY_COLOR[task.category] ?? "text-white/50";
  const barColor = CATEGORY_BAR[task.category] ?? "bg-white/30";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0f25] shadow-2xl shadow-black/40 overflow-hidden">
      {/* Color bar */}
      <div className={`h-1 w-full ${barColor}`} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${catColor}`}>{task.category}</p>
            <h3 className={`text-base font-bold leading-snug ${task.completed ? "line-through text-white/30" : "text-white"}`}>
              {task.title}
            </h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
            ✕
          </button>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 mb-5">
          {[
            { icon: "📅", label: formatTime(task.time) + " · " + task.date },
            { icon: "⏰", label: task.reminderBefore },
            { icon: "🔁", label: task.recurring ?? "One-time" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm text-white/50">
              <span className="text-base w-5 text-center">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Priority badge */}
        <div className="flex items-center gap-2 mb-5">
          <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${PRIORITY_PILL[task.priority]}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </span>
          {task.completed && (
            <span className="px-2.5 py-1 rounded-full border border-white/10 text-xs text-white/30">Completed</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(task.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              task.completed
                ? "border border-white/10 text-white/40 hover:border-white/20"
                : "bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 shadow-md shadow-[#7c3aed]/20"
            }`}
          >
            {task.completed ? "↩ Mark Incomplete" : "✓ Mark Complete"}
          </button>
          <Link
            href={`/create?edit=${task.id}`}
            className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-xs font-semibold hover:border-white/20 hover:text-white/60 transition-all"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Month View ───────────────────────────────────────────
function MonthView({ year, month, tasks, selectedDate, onSelectDate, onSelectTask }: {
  year: number; month: number; tasks: Task[];
  selectedDate: string; onSelectDate: (d: string) => void;
  onSelectTask: (t: Task) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => { (map[t.date] ??= []).push(t); });
    return map;
  }, [tasks]);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold text-white/25 uppercase tracking-widest py-2">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-[#0a0a1a] min-h-[80px] md:min-h-[100px]" />;
          const iso = isoDate(year, month, day);
          const dayTasks = tasksByDate[iso] ?? [];
          const isToday = iso === TODAY_STR;
          const isSelected = iso === selectedDate;
          const isPast = iso < TODAY_STR;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(iso)}
              className={`relative bg-[#0a0a1a] min-h-[80px] md:min-h-[100px] p-2 text-left flex flex-col transition-all hover:bg-white/[0.03] group ${
                isSelected ? "ring-1 ring-inset ring-[#a78bfa]/50 bg-[#a78bfa]/5" : ""
              }`}
            >
              {/* Day number */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 flex-shrink-0 ${
                isToday
                  ? "bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30"
                  : isPast
                  ? "text-white/20"
                  : "text-white/60 group-hover:text-white"
              }`}>
                {day}
              </div>

              {/* Task pills */}
              <div className="flex flex-col gap-0.5 w-full flex-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <TaskPill key={t.id} task={t} onClick={(e?: React.MouseEvent) => { e?.stopPropagation?.(); onSelectTask(t); }} />
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-white/25 pl-1">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────
function WeekView({ weekStart, tasks, onSelectTask }: { weekStart: Date; tasks: Task[]; onSelectTask: (t: Task) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => { (map[t.date] ??= []).push(t); });
    return map;
  }, [tasks]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Day headers */}
        <div className="grid grid-cols-8 mb-1 ml-12">
          {days.map((d) => {
            const iso = d.toISOString().split("T")[0];
            const isToday = iso === TODAY_STR;
            return (
              <div key={iso} className="text-center py-2">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? "text-[#a78bfa]" : "text-white/25"}`}>
                  {DAYS_SHORT[d.getDay()]}
                </p>
                <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${
                  isToday ? "bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white" : "text-white/50"
                }`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative border border-white/5 rounded-2xl overflow-hidden max-h-[480px] overflow-y-auto">
          {HOURS.map((h) => (
            <div key={h} className="grid grid-cols-8 border-b border-white/[0.03]">
              {/* Hour label */}
              <div className="py-3 pr-2 text-right text-[10px] text-white/20 font-medium w-12 flex-shrink-0">
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </div>
              {/* Day columns */}
              {days.map((d) => {
                const iso = d.toISOString().split("T")[0];
                const hourTasks = (tasksByDate[iso] ?? []).filter((t) => {
                  const th = parseInt(t.time.split(":")[0]);
                  return th === h;
                });
                return (
                  <div key={iso} className="border-l border-white/[0.03] min-h-[48px] py-1 px-1 relative">
                    {hourTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        className={`w-full text-left rounded-lg px-2 py-1.5 mb-1 text-[10px] font-semibold border transition-all hover:opacity-80 ${
                          t.completed ? "opacity-30 line-through border-white/5 bg-white/[0.02] text-white/30" :
                          `${CATEGORY_BAR[t.category] ?? "bg-white/20"} bg-opacity-15 border-opacity-20 text-white/80`
                        }`}
                        style={{
                          background: t.completed ? undefined : `${getCategoryHex(t.category)}18`,
                          borderColor: t.completed ? undefined : `${getCategoryHex(t.category)}30`,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${t.completed ? "bg-white/20" : PRIORITY_DOT[t.priority]}`} />
                          <span className="truncate">{t.title}</span>
                        </div>
                        <span className="text-white/40 text-[9px]">{formatTime(t.time)}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryHex(cat: string): string {
  const map: Record<string, string> = {
    Work: "#a78bfa", Health: "#34d399", Finance: "#fbbf24",
    Personal: "#f472b6", Education: "#38bdf8", Other: "#ffffff",
  };
  return map[cat] ?? "#ffffff";
}

// ── Agenda View ──────────────────────────────────────────
function AgendaView({ tasks, onSelectTask }: { tasks: Task[]; onSelectTask: (t: Task) => void }) {
  const sorted = [...tasks].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    sorted.forEach((t) => { (map[t.date] ??= []).push(t); });
    return map;
  }, [sorted]);

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-white/30 text-sm">No tasks scheduled</p>
      </div>
    );
  }

  function getDateLabel(iso: string): string {
    if (iso === TODAY_STR) return "Today";
    const yesterday = dateStr(-1);
    const tomorrow = dateStr(1);
    if (iso === yesterday) return "Yesterday";
    if (iso === tomorrow) return "Tomorrow";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      {dates.map((date) => {
        const isToday = date === TODAY_STR;
        const isPast = date < TODAY_STR;
        return (
          <div key={date}>
            {/* Date label */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex-shrink-0 text-xs font-bold uppercase tracking-widest ${
                isToday ? "text-[#a78bfa]" : isPast ? "text-white/20" : "text-white/40"
              }`}>
                {getDateLabel(date)}
              </div>
              <div className={`flex-1 h-px ${isToday ? "bg-[#a78bfa]/20" : "bg-white/5"}`} />
              {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa]">Today</span>}
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {grouped[date].map((task) => {
                const catColor = CATEGORY_COLOR[task.category] ?? "text-white/50";
                const barColor = CATEGORY_BAR[task.category] ?? "bg-white/30";
                return (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
                      task.completed
                        ? "border-white/5 bg-white/[0.01] opacity-50"
                        : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                    }`}
                  >
                    {/* Color bar */}
                    <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${task.completed ? "bg-white/10" : barColor}`} />

                    {/* Time */}
                    <div className="w-16 flex-shrink-0">
                      <p className={`text-xs font-bold ${task.completed ? "text-white/20" : "text-white/60"}`}>{formatTime(task.time)}</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${task.completed ? "line-through text-white/25" : "text-white"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${task.completed ? "text-white/20" : catColor}`}>{task.category}</span>
                        {task.recurring && <span className="text-[10px] text-white/25">↻ {task.recurring}</span>}
                      </div>
                    </div>

                    {/* Priority dot + reminder */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${task.completed ? "bg-white/10" : PRIORITY_DOT[task.priority]}`} />
                      <span className="text-[10px] text-white/25">{task.reminderBefore}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date(TODAY));
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Week start (Sunday)
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const filteredTasks = useMemo(() =>
    filterCategory === "All" ? tasks : tasks.filter((t) => t.category === filterCategory),
    [tasks, filterCategory]
  );

  // Month tasks for selected date
  const selectedDateTasks = useMemo(() =>
    filteredTasks.filter((t) => t.date === selectedDate),
    [filteredTasks, selectedDate]
  );

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
    setSelectedTask((prev) => prev?.id === id ? { ...prev, completed: !prev.completed } : prev);
  };

  const navPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const navNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date(TODAY));

  function getNavLabel(): string {
    if (viewMode === "week") {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const s = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const e = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${s} – ${e}`;
    }
    return `${MONTHS[month]} ${year}`;
  }

  const categories = ["All", ...Array.from(new Set(MOCK_TASKS.map((t) => t.category)))];
  const todayTaskCount = tasks.filter((t) => t.date === TODAY_STR && !t.completed).length;

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#7c3aed]/7 blur-[130px]" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-[#f59e0b]/4 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-white/5 bg-[#0d0d20]/80 backdrop-blur-md hidden lg:flex flex-col z-40">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
          <span className="text-xl">🔔</span>
          <span className="font-bold text-base tracking-tight text-white">Never<span className="text-[#a78bfa]">Miss</span></span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { icon: "🏠", label: "Dashboard", href: "/dashboard", active: false },
            { icon: "➕", label: "New Task", href: "/create", active: false },
            { icon: "📅", label: "Calendar", href: "/calendar", active: true },
            { icon: "🔔", label: "Reminders", href: "/reminders", active: false },
            { icon: "⚙️", label: "Settings", href: "/settings", active: false },
          ].map(({ icon, label, href, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <span className="text-base">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        {/* Mini stats */}
        <div className="mx-3 mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">This Month</p>
          {[
            { label: "Total tasks", value: tasks.length },
            { label: "Completed", value: tasks.filter((t) => t.completed).length },
            { label: "Due today", value: todayTaskCount },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-white/30">{label}</span>
              <span className="text-sm font-bold text-white/70">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-5 pt-3 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">JD</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">John Doe</p>
            <p className="text-xs text-white/30 truncate">Free plan</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-60 relative z-10">

        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all">←</Link>
            <div>
              <h1 className="text-base font-bold text-white">Calendar</h1>
              <p className="text-xs text-white/30 hidden sm:block">{getNavLabel()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-xl bg-white/5 border border-white/8">
              {(["month", "week", "agenda"] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${viewMode === v ? "bg-[#a78bfa] text-white" : "text-white/35 hover:text-white/60"}`}>{v}</button>
              ))}
            </div>

            {/* Today */}
            <button onClick={goToday} className="px-3 py-1.5 rounded-xl border border-white/10 text-white/50 text-xs font-semibold hover:border-white/20 hover:text-white/70 transition-all hidden sm:block">Today</button>

            {/* Nav */}
            <div className="flex items-center gap-1">
              <button onClick={navPrev} className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">‹</button>
              <button onClick={navNext} className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">›</button>
            </div>

            {/* Add task */}
            <Link href="/create" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-md shadow-[#7c3aed]/20">
              <span>+</span><span className="hidden sm:inline">New Task</span>
            </Link>
          </div>
        </header>

        <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto">

          {/* Category filter chips */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                  filterCategory === cat
                    ? cat === "All"
                      ? "bg-[#a78bfa] border-[#a78bfa] text-white"
                      : `border-opacity-30 text-white`
                    : "border-white/8 text-white/30 hover:border-white/15 hover:text-white/50"
                }`}
                style={filterCategory === cat && cat !== "All" ? {
                  background: `${getCategoryHex(cat)}20`,
                  borderColor: `${getCategoryHex(cat)}40`,
                  color: getCategoryHex(cat),
                } : {}}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Mobile view toggle */}
          <div className="flex sm:hidden items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/8 mb-4 w-fit">
            {(["month", "week", "agenda"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${viewMode === v ? "bg-[#a78bfa] text-white" : "text-white/35"}`}>{v}</button>
            ))}
          </div>

          {/* Calendar grid + detail panel */}
          <div className={`${viewMode === "month" ? "grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5" : ""}`}>
            <div>
              {viewMode === "month" && (
                <MonthView
                  year={year} month={month}
                  tasks={filteredTasks}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setSelectedTask(null); }}
                  onSelectTask={setSelectedTask}
                />
              )}
              {viewMode === "week" && (
                <WeekView weekStart={weekStart} tasks={filteredTasks} onSelectTask={setSelectedTask} />
              )}
              {viewMode === "agenda" && (
                <AgendaView tasks={filteredTasks} onSelectTask={setSelectedTask} />
              )}
            </div>

            {/* Side panel — month view only */}
            {viewMode === "month" && (
              <div className="space-y-4">
                {/* Selected date tasks */}
                {!selectedTask && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                          {selectedDate === TODAY_STR ? "Today" : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Link href={`/create?date=${selectedDate}`} className="text-xs text-[#a78bfa] font-semibold hover:text-[#c4b5fd] transition-colors">+ Add</Link>
                    </div>
                    <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedDateTasks.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-2xl mb-2">📭</p>
                          <p className="text-xs text-white/25">No tasks on this day</p>
                        </div>
                      ) : selectedDateTasks.map((task) => (
                        <button key={task.id} onClick={() => setSelectedTask(task)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-white/15 ${task.completed ? "border-white/5 bg-white/[0.01] opacity-40" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.completed ? "bg-white/15" : PRIORITY_DOT[task.priority]}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${task.completed ? "line-through text-white/25" : "text-white/80"}`}>{task.title}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">{formatTime(task.time)}</p>
                          </div>
                          <span className="text-white/20 text-xs">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task detail */}
                {selectedTask && (
                  <TaskDetailPanel
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onToggle={toggleTask}
                  />
                )}

                {/* Upcoming mini list */}
                {!selectedTask && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Coming Up</p>
                    </div>
                    <div className="p-3 space-y-2">
                      {filteredTasks
                        .filter((t) => t.date > TODAY_STR && !t.completed)
                        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                        .slice(0, 4)
                        .map((task) => (
                          <button key={task.id} onClick={() => setSelectedTask(task)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-left hover:border-white/10 transition-all group">
                            <div className={`w-0.5 h-6 rounded-full flex-shrink-0 ${CATEGORY_BAR[task.category] ?? "bg-white/20"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white/70 truncate group-hover:text-white/90">{task.title}</p>
                              <p className="text-[10px] text-white/25 mt-0.5">{new Date(task.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatTime(task.time)}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon: "🏠", label: "Home", href: "/dashboard", active: false },
          { icon: "➕", label: "New", href: "/create", active: false },
          { icon: "📅", label: "Calendar", href: "/calendar", active: true },
          { icon: "🔔", label: "Alerts", href: "/reminders", active: false },
          { icon: "⚙️", label: "Settings", href: "/settings", active: false },
        ].map(({ icon, label, href, active }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${active ? "text-[#a78bfa]" : "text-white/30 hover:text-white/60"}`}>
            <span className="text-xl">{icon}</span>{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}