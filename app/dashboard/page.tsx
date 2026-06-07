"use client";

import { useState } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────
type Priority = "high" | "medium" | "low";
type Status = "upcoming" | "today" | "completed";

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  priority: Priority;
  status: Status;
  reminderBefore: string;
  recurring?: string;
  category: string;
}

// ── Mock Data ────────────────────────────────────────────
const MOCK_TASKS: Task[] = [
  {
    id: "1",
    title: "Team Standup Meeting",
    description: "Daily sync with the engineering team",
    date: "Today",
    time: "9:00 AM",
    priority: "high",
    status: "today",
    reminderBefore: "30 min before",
    recurring: "Daily",
    category: "Work",
  },
  {
    id: "2",
    title: "Dentist Appointment",
    description: "Annual checkup at City Dental Clinic",
    date: "Tomorrow",
    time: "3:00 PM",
    priority: "high",
    status: "upcoming",
    reminderBefore: "1 hour before",
    category: "Health",
  },
  {
    id: "3",
    title: "Submit Project Report",
    description: "Q3 performance report for the board",
    date: "Jun 10",
    time: "5:00 PM",
    priority: "medium",
    status: "upcoming",
    reminderBefore: "2 hours before",
    category: "Work",
  },
  {
    id: "4",
    title: "Pay Electricity Bill",
    description: "Monthly utility bill via bank app",
    date: "Jun 12",
    time: "12:00 PM",
    priority: "medium",
    status: "upcoming",
    reminderBefore: "1 day before",
    recurring: "Monthly",
    category: "Finance",
  },
  {
    id: "5",
    title: "Gym Session",
    description: "Leg day — squats and deadlifts",
    date: "Today",
    time: "6:30 PM",
    priority: "low",
    status: "today",
    reminderBefore: "15 min before",
    recurring: "Mon, Wed, Fri",
    category: "Health",
  },
  {
    id: "6",
    title: "Call Mom",
    description: "Weekly catch-up call",
    date: "Yesterday",
    time: "7:00 PM",
    priority: "low",
    status: "completed",
    reminderBefore: "30 min before",
    category: "Personal",
  },
];

const STATS = [
  { label: "Total Tasks", value: 6, icon: "📋" },
  { label: "Due Today", value: 2, icon: "📅" },
  { label: "Upcoming", value: 3, icon: "⏳" },
  { label: "Completed", value: 1, icon: "✅" },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; badge: string; text: string }> = {
  high: {
    label: "High",
    dot: "bg-red-400",
    badge: "bg-red-500/10 border-red-500/20",
    text: "text-red-400",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-400",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-400",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Work: "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20",
  Health: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Finance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Personal: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

// ── Task Card ────────────────────────────────────────────
function TaskCard({ task, onToggleComplete }: { task: Task; onToggleComplete: (id: string) => void }) {
  const p = PRIORITY_CONFIG[task.priority];
  const catColor = CATEGORY_COLORS[task.category] ?? "bg-white/5 text-white/50 border-white/10";
  const isCompleted = task.status === "completed";

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 ${
        isCompleted
          ? "border-white/5 bg-white/[0.02]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      {/* Priority accent bar */}
      {!isCompleted && (
        <div
          className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${p.dot}`}
          style={{ left: "-1px" }}
        />
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isCompleted
                ? "bg-[#a78bfa] border-[#a78bfa]"
                : "border-white/20 hover:border-[#a78bfa]"
            }`}
          >
            {isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3
                className={`font-semibold text-base leading-snug ${
                  isCompleted ? "line-through text-white/30" : "text-white"
                }`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${catColor}`}>
                  {task.category}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${p.badge} ${p.text}`}>
                  {p.label}
                </span>
              </div>
            </div>

            <p className={`text-sm mb-3 ${isCompleted ? "text-white/20" : "text-white/40"}`}>
              {task.description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date + time */}
              <span className={`flex items-center gap-1.5 text-xs ${isCompleted ? "text-white/20" : "text-white/50"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1v2M11 1v2M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {task.date} · {task.time}
              </span>

              {/* Reminder */}
              <span className={`flex items-center gap-1.5 text-xs ${isCompleted ? "text-white/20" : "text-white/40"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <path d="M8 2a5 5 0 100 10A5 5 0 008 2zm0 0V1M6 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {task.reminderBefore}
              </span>

              {/* Recurring */}
              {task.recurring && (
                <span className={`flex items-center gap-1.5 text-xs ${isCompleted ? "text-white/20" : "text-[#a78bfa]/70"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                    <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M12 4l0.5 2.5-2.5.5M4 11.5l-.5-2.5 2.5-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {task.recurring}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center text-4xl mb-5">
        {filter === "completed" ? "🎉" : "📭"}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">
        {filter === "completed" ? "Nothing completed yet" : "No tasks here"}
      </h3>
      <p className="text-white/40 text-sm mb-6 max-w-xs">
        {filter === "completed"
          ? "Complete a task and it'll appear here."
          : "You're all clear! Add a new task to get started."}
      </p>
      {filter !== "completed" && (
        <Link
          href="/create"
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Create Task
        </Link>
      )}
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────
export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "upcoming" : "completed" }
          : t
      )
    );
  };

  const filtered = tasks.filter((t) => {
    const matchesFilter =
      filter === "all" || t.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const todayCount = tasks.filter((t) => t.status === "today").length;
  const upcomingCount = tasks.filter((t) => t.status === "upcoming").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;

  const statsData = [
    { label: "Total Tasks", value: totalCount, icon: "📋" },
    { label: "Due Today", value: todayCount, icon: "📅" },
    { label: "Upcoming", value: upcomingCount, icon: "⏳" },
    { label: "Completed", value: completedCount, icon: "✅" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#7c3aed]/8 blur-[120px]" />
        <div className="absolute bottom-1/3 left-10 w-72 h-72 rounded-full bg-[#f59e0b]/5 blur-[100px]" />
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-white/5 bg-[#0d0d20]/80 backdrop-blur-md hidden lg:flex flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
          <span className="text-xl">🔔</span>
          <span className="font-bold text-base tracking-tight text-white">
            Never<span className="text-[#a78bfa]">Miss</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { icon: "🏠", label: "Dashboard", href: "/dashboard", active: true },
            { icon: "➕", label: "New Task", href: "/create", active: false },
            { icon: "📅", label: "Calendar", href: "/calendar", active: false },
            { icon: "🔔", label: "Reminders", href: "/reminders", active: false },
            { icon: "⚙️", label: "Settings", href: "/settings", active: false },
          ].map(({ icon, label, href, active }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Upgrade banner */}
        <div className="mx-3 mb-4 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4">
          <p className="text-xs font-bold text-[#f59e0b] mb-1">⚡ Go Premium</p>
          <p className="text-xs text-white/40 leading-relaxed mb-3">
            Email reminders, advanced scheduling & priority AI.
          </p>
          <button className="w-full py-1.5 rounded-lg bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-semibold hover:bg-[#f59e0b]/30 transition-colors">
            Upgrade Now
          </button>
        </div>

        {/* User */}
        <div className="px-4 pb-5 pt-3 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            JD
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">John Doe</p>
            <p className="text-xs text-white/30 truncate">Free plan</p>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="lg:pl-60 relative z-10">

        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-xs text-white/30">Sunday, June 7, 2026</p>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm relative hidden md:block">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
              fill="none" viewBox="0 0 16 16"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#a78bfa]/50 focus:bg-white/8 transition-all"
            />
          </div>

          {/* Create button */}
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0 shadow-lg shadow-[#7c3aed]/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">New Task</span>
          </Link>
        </header>

        <main className="px-6 py-6 max-w-4xl mx-auto">

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {statsData.map(({ label, value, icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors"
              >
                <div className="text-xl mb-2">{icon}</div>
                <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            ))}
          </div>

          {/* ── AI Quick-create banner ── */}
          <div className="mb-6 rounded-2xl border border-[#a78bfa]/20 bg-gradient-to-r from-[#a78bfa]/10 via-[#7c3aed]/5 to-transparent p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/20 flex items-center justify-center text-xl flex-shrink-0">
                🤖
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">Create with AI</p>
                <p className="text-xs text-white/40">
                  Just tell the AI what to remind you — it handles the rest.
                </p>
              </div>
            </div>
            <Link
              href="/create?mode=ai"
              className="flex-shrink-0 px-4 py-2 rounded-xl border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-semibold hover:bg-[#a78bfa]/20 transition-colors"
            >
              Try AI Mode →
            </Link>
          </div>

          {/* ── Filter tabs ── */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {FILTER_TABS.map(({ key, label }) => {
              const count =
                key === "all"
                  ? tasks.length
                  : tasks.filter((t) => t.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    filter === key
                      ? "bg-[#a78bfa] text-white shadow-lg shadow-[#7c3aed]/20"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/8"
                  }`}
                >
                  {label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      filter === key ? "bg-white/20 text-white" : "bg-white/8 text-white/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Task list ── */}
          {filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-3">
              {/* Today group */}
              {(filter === "all" || filter === "today") &&
                filtered.filter((t) => t.status === "today").length > 0 && (
                  <div>
                    {filter === "all" && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                          Today
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {filtered
                        .filter((t) => t.status === "today")
                        .map((task) => (
                          <TaskCard key={task.id} task={task} onToggleComplete={toggleComplete} />
                        ))}
                    </div>
                  </div>
                )}

              {/* Upcoming group */}
              {(filter === "all" || filter === "upcoming") &&
                filtered.filter((t) => t.status === "upcoming").length > 0 && (
                  <div className={filter === "all" ? "mt-6" : ""}>
                    {filter === "all" && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                          Upcoming
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {filtered
                        .filter((t) => t.status === "upcoming")
                        .map((task) => (
                          <TaskCard key={task.id} task={task} onToggleComplete={toggleComplete} />
                        ))}
                    </div>
                  </div>
                )}

              {/* Completed group */}
              {(filter === "all" || filter === "completed") &&
                filtered.filter((t) => t.status === "completed").length > 0 && (
                  <div className={filter === "all" ? "mt-6" : ""}>
                    {filter === "all" && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                          Completed
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {filtered
                        .filter((t) => t.status === "completed")
                        .map((task) => (
                          <TaskCard key={task.id} task={task} onToggleComplete={toggleComplete} />
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon: "🏠", label: "Home", href: "/dashboard", active: true },
          { icon: "➕", label: "New", href: "/create", active: false },
          { icon: "📅", label: "Calendar", href: "/calendar", active: false },
          { icon: "🔔", label: "Alerts", href: "/reminders", active: false },
          { icon: "⚙️", label: "Settings", href: "/settings", active: false },
        ].map(({ icon, label, href, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              active ? "text-[#a78bfa]" : "text-white/30 hover:text-white/60"
            }`}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}