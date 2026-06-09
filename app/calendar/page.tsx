"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";

// ── Types ─────────────────────────────────────────────────
type Priority = "high" | "medium" | "low";
type Status = "today" | "upcoming" | "completed";
type ViewMode = "month" | "week" | "agenda";

interface Task {
  id: string;
  title: string;
  rawDate: string;   // YYYY-MM-DD for logic
  date: string;      // human-readable display label
  time: string;      // HH:MM
  priority: Priority;
  category: string;
  reminderBefore: string;
  recurring?: string;
  status: Status;
  userId: string;
}

// ── Helpers ───────────────────────────────────────────────
const TODAY = new Date();
const TODAY_STR = TODAY.toISOString().split("T")[0];

const DAYS_SHORT  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-400", medium: "bg-amber-400", low: "bg-emerald-400",
};
const PRIORITY_PILL: Record<Priority, string> = {
  high:   "bg-red-500/15 text-red-400 border-red-500/25",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  low:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};
const CATEGORY_COLOR: Record<string, string> = {
  Work:"text-[#a78bfa]", Health:"text-emerald-400", Finance:"text-amber-400",
  Personal:"text-pink-400", Education:"text-sky-400", Other:"text-white/50",
};
const CATEGORY_BAR: Record<string, string> = {
  Work:"bg-[#a78bfa]", Health:"bg-emerald-400", Finance:"bg-amber-400",
  Personal:"bg-pink-400", Education:"bg-sky-400", Other:"bg-white/30",
};
function getCategoryHex(cat: string): string {
  const map: Record<string,string> = {
    Work:"#a78bfa", Health:"#34d399", Finance:"#fbbf24",
    Personal:"#f472b6", Education:"#38bdf8", Other:"#ffffff",
  };
  return map[cat] ?? "#ffffff";
}
function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}
function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function offsetDate(n: number): string {
  const d = new Date(TODAY); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function getDateLabel(iso: string): string {
  if (iso === TODAY_STR)    return "Today";
  if (iso === offsetDate(-1)) return "Yesterday";
  if (iso === offsetDate(1))  return "Tomorrow";
  return new Date(iso+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}

// ── Task Pill ─────────────────────────────────────────────
function TaskPill({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onClick(); } }}
      className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left text-[10px] font-medium truncate transition-all hover:opacity-80 bg-white/[0.04] border border-white/8 hover:border-white/15 cursor-pointer ${task.status === "completed" ? "opacity-30 line-through" : ""}`}
    >
      <span className={`w-1 h-3 rounded-full flex-shrink-0 ${task.status === "completed" ? "bg-white/15" : CATEGORY_BAR[task.category] ?? "bg-white/30"}`} />
      <span className="truncate text-white/70">{task.title}</span>
    </div>
  );
}

// ── Task Detail Panel ─────────────────────────────────────
function TaskDetailPanel({ task, onClose, onToggle, saving }: {
  task: Task; onClose: () => void;
  onToggle: (id: string, status: Status) => void;
  saving: boolean;
}) {
  const isCompleted = task.status === "completed";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0f25] shadow-2xl shadow-black/40 overflow-hidden">
      <div className={`h-1 w-full ${CATEGORY_BAR[task.category] ?? "bg-white/20"}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${CATEGORY_COLOR[task.category] ?? "text-white/50"}`}>{task.category}</p>
            <h3 className={`text-base font-bold leading-snug ${isCompleted ? "line-through text-white/30" : "text-white"}`}>{task.title}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors flex-shrink-0">✕</button>
        </div>
        <div className="space-y-2.5 mb-5">
          {[
            { icon: "📅", label: `${formatTime(task.time)} · ${task.rawDate}` },
            { icon: "⏰", label: task.reminderBefore },
            { icon: "🔁", label: task.recurring ?? "One-time" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm text-white/50">
              <span className="text-base w-5 text-center">{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-5">
          <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${PRIORITY_PILL[task.priority]}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </span>
          {isCompleted && <span className="px-2.5 py-1 rounded-full border border-white/10 text-xs text-white/30">Completed</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(task.id, task.status)}
            disabled={saving}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              isCompleted
                ? "border border-white/10 text-white/40 hover:border-white/20"
                : "bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 shadow-md shadow-[#7c3aed]/20"
            }`}
          >
            {saving
              ? <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
              : isCompleted ? "↩ Mark Incomplete" : "✓ Mark Complete"
            }
          </button>
          <Link href={`/create?edit=${task.id}`} className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-xs font-semibold hover:border-white/20 hover:text-white/60 transition-all">Edit</Link>
        </div>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────
function MonthView({ year, month, tasks, selectedDate, onSelectDate, onSelectTask }: {
  year: number; month: number; tasks: Task[];
  selectedDate: string; onSelectDate: (d: string) => void; onSelectTask: (t: Task) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string,Task[]> = {};
    tasks.forEach((t) => { (map[t.rawDate] ??= []).push(t); });
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold text-white/25 uppercase tracking-widest py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-[#0a0a1a] min-h-[80px] md:min-h-[100px]" />;
          const iso = isoDate(year, month, day);
          const dayTasks = tasksByDate[iso] ?? [];
          const isToday = iso === TODAY_STR;
          const isSelected = iso === selectedDate;
          const isPast = iso < TODAY_STR;
          return (
            <button key={i} onClick={() => onSelectDate(iso)}
              className={`relative bg-[#0a0a1a] min-h-[80px] md:min-h-[100px] p-2 text-left flex flex-col transition-all hover:bg-white/[0.03] group ${isSelected ? "ring-1 ring-inset ring-[#a78bfa]/50 bg-[#a78bfa]/5" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 flex-shrink-0 ${
                isToday ? "bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30"
                  : isPast ? "text-white/20" : "text-white/60 group-hover:text-white"
              }`}>{day}</div>
              <div className="flex flex-col gap-0.5 w-full flex-1">
                {dayTasks.slice(0,3).map((t) => (
                  <TaskPill key={t.id} task={t} onClick={() => onSelectTask(t)} />
                ))}
                {dayTasks.length > 3 && <span className="text-[10px] text-white/25 pl-1">+{dayTasks.length - 3} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────
function WeekView({ weekStart, tasks, onSelectTask }: { weekStart: Date; tasks: Task[]; onSelectTask: (t: Task) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const tasksByDate = useMemo(() => {
    const map: Record<string,Task[]> = {};
    tasks.forEach((t) => { (map[t.rawDate] ??= []).push(t); });
    return map;
  }, [tasks]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-8 mb-1 ml-12">
          {days.map((d) => {
            const iso = d.toISOString().split("T")[0];
            const isToday = iso === TODAY_STR;
            return (
              <div key={iso} className="text-center py-2">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? "text-[#a78bfa]" : "text-white/25"}`}>{DAYS_SHORT[d.getDay()]}</p>
                <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${isToday ? "bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white" : "text-white/50"}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="relative border border-white/5 rounded-2xl overflow-hidden max-h-[480px] overflow-y-auto">
          {HOURS.map((h) => (
            <div key={h} className="grid grid-cols-8 border-b border-white/[0.03]">
              <div className="py-3 pr-2 text-right text-[10px] text-white/20 font-medium w-12 flex-shrink-0">
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`}
              </div>
              {days.map((d) => {
                const iso = d.toISOString().split("T")[0];
                const hourTasks = (tasksByDate[iso] ?? []).filter((t) => parseInt(t.time.split(":")[0]) === h);
                return (
                  <div key={iso} className="border-l border-white/[0.03] min-h-[48px] py-1 px-1 relative">
                    {hourTasks.map((t) => (
                      <button key={t.id} onClick={() => onSelectTask(t)}
                        className={`w-full text-left rounded-lg px-2 py-1.5 mb-1 text-[10px] font-semibold border transition-all hover:opacity-80 ${t.status === "completed" ? "opacity-30 line-through border-white/5 bg-white/[0.02] text-white/30" : "text-white/80"}`}
                        style={{ background: t.status !== "completed" ? `${getCategoryHex(t.category)}18` : undefined, borderColor: t.status !== "completed" ? `${getCategoryHex(t.category)}30` : undefined }}>
                        <div className="flex items-center gap-1">
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${t.status === "completed" ? "bg-white/20" : PRIORITY_DOT[t.priority]}`} />
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

// ── Agenda View ───────────────────────────────────────────
function AgendaView({ tasks, onSelectTask }: { tasks: Task[]; onSelectTask: (t: Task) => void }) {
  const grouped = useMemo(() => {
    const map: Record<string,Task[]> = {};
    [...tasks]
      .sort((a,b) => (a.rawDate+a.time).localeCompare(b.rawDate+b.time))
      .forEach((t) => { (map[t.rawDate] ??= []).push(t); });
    return map;
  }, [tasks]);
  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">📭</div>
      <p className="text-white/30 text-sm">No tasks scheduled</p>
      <Link href="/create" className="mt-4 px-5 py-2 rounded-full bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-[#a78bfa] text-xs font-semibold hover:bg-[#a78bfa]/25 transition-colors">+ Create Task</Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {dates.map((date) => {
        const isToday = date === TODAY_STR;
        const isPast  = date < TODAY_STR;
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex-shrink-0 text-xs font-bold uppercase tracking-widest ${isToday ? "text-[#a78bfa]" : isPast ? "text-white/20" : "text-white/40"}`}>
                {getDateLabel(date)}
              </div>
              <div className={`flex-1 h-px ${isToday ? "bg-[#a78bfa]/20" : "bg-white/5"}`} />
              {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa]">Today</span>}
            </div>
            <div className="space-y-2">
              {grouped[date].map((task) => {
                const isCompleted = task.status === "completed";
                return (
                  <button key={task.id} onClick={() => onSelectTask(task)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
                      isCompleted ? "border-white/5 bg-white/[0.01] opacity-50" : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                    }`}>
                    <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${isCompleted ? "bg-white/10" : CATEGORY_BAR[task.category] ?? "bg-white/30"}`} />
                    <div className="w-16 flex-shrink-0">
                      <p className={`text-xs font-bold ${isCompleted ? "text-white/20" : "text-white/60"}`}>{formatTime(task.time)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCompleted ? "line-through text-white/25" : "text-white"}`}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${isCompleted ? "text-white/20" : CATEGORY_COLOR[task.category] ?? "text-white/50"}`}>{task.category}</span>
                        {task.recurring && <span className="text-[10px] text-white/25">↻ {task.recurring}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${isCompleted ? "bg-white/10" : PRIORITY_DOT[task.priority]}`} />
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

// ── Calendar Content ──────────────────────────────────────
function CalendarContent() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date(TODAY));
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [toggling, setToggling] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  // ── Firestore listener ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task,"id">) })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  // ── Toggle complete ─────────────────────────────────────
  const toggleTask = async (id: string, currentStatus: Status) => {
    const newStatus: Status = currentStatus === "completed" ? "upcoming" : "completed";
    setToggling(true);
    try {
      await updateDoc(doc(db, "tasks", id), { status: newStatus });
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
      setSelectedTask((prev) => prev?.id === id ? { ...prev, status: newStatus } : prev);
    } finally {
      setToggling(false);
    }
  };

  // ── Filtered tasks ──────────────────────────────────────
  const filtered = useMemo(() =>
    filterCategory === "All" ? tasks : tasks.filter((t) => t.category === filterCategory),
    [tasks, filterCategory]
  );

  const selectedDateTasks = useMemo(() =>
    filtered.filter((t) => t.rawDate === selectedDate),
    [filtered, selectedDate]
  );

  const categories = ["All", ...Array.from(new Set(tasks.map((t) => t.category)))];

  const navPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const navNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };
  const goToday = () => { setCurrentDate(new Date(TODAY)); setSelectedDate(TODAY_STR); };

  const navLabel = useMemo(() => {
    if (viewMode === "week") {
      const end = new Date(weekStart); end.setDate(weekStart.getDate()+6);
      return `${weekStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
    }
    return `${MONTHS[month]} ${year}`;
  }, [viewMode, weekStart, month, year]);

  const todayCount = tasks.filter((t) => t.rawDate === TODAY_STR && t.status !== "completed").length;

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">
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
            { icon:"🏠", label:"Dashboard", href:"/dashboard" },
            { icon:"➕", label:"New Task",  href:"/create" },
            { icon:"📅", label:"Calendar",  href:"/calendar", active:true },
            { icon:"🔔", label:"Reminders", href:"/reminders" },
            { icon:"⚙️", label:"Settings",  href:"/settings" },
          ].map(({ icon, label, href, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <span className="text-base">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="mx-3 mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">This Month</p>
          {[
            { label:"Total tasks", value: loading ? "…" : tasks.length },
            { label:"Completed",   value: loading ? "…" : tasks.filter((t) => t.status === "completed").length },
            { label:"Due today",   value: loading ? "…" : todayCount },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-white/30">{label}</span>
              <span className="text-sm font-bold text-white/70">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-5 pt-3 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.displayName?.[0] ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.displayName ?? "User"}</p>
            <p className="text-xs text-white/30 truncate">Free plan</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-60 relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all">←</Link>
            <div>
              <h1 className="text-base font-bold text-white">Calendar</h1>
              <p className="text-xs text-white/30 hidden sm:block">{navLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-xl bg-white/5 border border-white/8">
              {(["month","week","agenda"] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${viewMode === v ? "bg-[#a78bfa] text-white" : "text-white/35 hover:text-white/60"}`}>{v}</button>
              ))}
            </div>
            <button onClick={goToday} className="px-3 py-1.5 rounded-xl border border-white/10 text-white/50 text-xs font-semibold hover:border-white/20 hover:text-white/70 transition-all hidden sm:block">Today</button>
            <div className="flex items-center gap-1">
              <button onClick={navPrev} className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">‹</button>
              <button onClick={navNext} className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">›</button>
            </div>
            <Link href="/create" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-md shadow-[#7c3aed]/20">
              <span>+</span><span className="hidden sm:inline">New Task</span>
            </Link>
          </div>
        </header>

        <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto pb-24 lg:pb-8">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {/* Category filters */}
              <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                      filterCategory === cat
                        ? cat === "All" ? "bg-[#a78bfa] border-[#a78bfa] text-white" : "text-white"
                        : "border-white/8 text-white/30 hover:border-white/15 hover:text-white/50"
                    }`}
                    style={filterCategory === cat && cat !== "All" ? {
                      background:`${getCategoryHex(cat)}20`,
                      borderColor:`${getCategoryHex(cat)}40`,
                      color:getCategoryHex(cat),
                    } : {}}
                  >{cat}</button>
                ))}
              </div>

              {/* Mobile view toggle */}
              <div className="flex sm:hidden items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/8 mb-4 w-fit">
                {(["month","week","agenda"] as ViewMode[]).map((v) => (
                  <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${viewMode === v ? "bg-[#a78bfa] text-white" : "text-white/35"}`}>{v}</button>
                ))}
              </div>

              <div className={`${viewMode === "month" ? "grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5" : ""}`}>
                <div>
                  {viewMode === "month" && (
                    <MonthView year={year} month={month} tasks={filtered}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => { setSelectedDate(d); setSelectedTask(null); }}
                      onSelectTask={setSelectedTask}
                    />
                  )}
                  {viewMode === "week" && <WeekView weekStart={weekStart} tasks={filtered} onSelectTask={setSelectedTask} />}
                  {viewMode === "agenda" && <AgendaView tasks={filtered} onSelectTask={setSelectedTask} />}
                </div>

                {/* Side panel — month only */}
                {viewMode === "month" && (
                  <div className="space-y-4">
                    {!selectedTask && (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                              {selectedDate === TODAY_STR ? "Today" : new Date(selectedDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                            </p>
                            <p className="text-sm font-semibold text-white mt-0.5">{selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? "s" : ""}</p>
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
                            <button key={task.id} onClick={() => setSelectedTask(task)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-white/15 ${task.status === "completed" ? "border-white/5 bg-white/[0.01] opacity-40" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === "completed" ? "bg-white/15" : PRIORITY_DOT[task.priority]}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate ${task.status === "completed" ? "line-through text-white/25" : "text-white/80"}`}>{task.title}</p>
                                <p className="text-[10px] text-white/30 mt-0.5">{formatTime(task.time)}</p>
                              </div>
                              <span className="text-white/20 text-xs">›</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTask && (
                      <TaskDetailPanel
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onToggle={toggleTask}
                        saving={toggling}
                      />
                    )}

                    {!selectedTask && (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Coming Up</p>
                        </div>
                        <div className="p-3 space-y-2">
                          {filtered
                            .filter((t) => t.rawDate > TODAY_STR && t.status !== "completed")
                            .sort((a,b) => (a.rawDate+a.time).localeCompare(b.rawDate+b.time))
                            .slice(0,4)
                            .map((task) => (
                              <button key={task.id} onClick={() => setSelectedTask(task)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-left hover:border-white/10 transition-all group">
                                <div className={`w-0.5 h-6 rounded-full flex-shrink-0 ${CATEGORY_BAR[task.category] ?? "bg-white/20"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white/70 truncate group-hover:text-white/90">{task.title}</p>
                                  <p className="text-[10px] text-white/25 mt-0.5">{new Date(task.rawDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} · {formatTime(task.time)}</p>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon:"🏠", label:"Home",     href:"/dashboard" },
          { icon:"➕", label:"New",      href:"/create" },
          { icon:"📅", label:"Calendar", href:"/calendar", active:true },
          { icon:"🔔", label:"Alerts",   href:"/reminders" },
          { icon:"⚙️", label:"Settings", href:"/settings" },
        ].map(({ icon, label, href, active }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${active ? "text-[#a78bfa]" : "text-white/30 hover:text-white/60"}`}>
            <span className="text-xl">{icon}</span>{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function CalendarPage() {
  return <AuthGuard><CalendarContent /></AuthGuard>;
}