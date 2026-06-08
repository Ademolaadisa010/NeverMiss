"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  userId: string;
  createdAt?: unknown;
}

// ── Constants ────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; badge: string; text: string }> = {
  high:   { label: "High",   dot: "bg-red-400",     badge: "bg-red-500/10 border-red-500/20",     text: "text-red-400" },
  medium: { label: "Medium", dot: "bg-amber-400",   badge: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
  low:    { label: "Low",    dot: "bg-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Work:     "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20",
  Health:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Finance:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Personal: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

const FILTER_TABS = [
  { key: "all",       label: "All" },
  { key: "today",     label: "Today" },
  { key: "upcoming",  label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

// ── Delete Confirm Modal ──────────────────────────────────
function DeleteModal({ task, onConfirm, onCancel }: {
  task: Task;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0f0f24] p-6 z-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mb-4">🗑️</div>
        <h3 className="text-white font-bold text-lg mb-1">Delete Task?</h3>
        <p className="text-white/40 text-sm mb-6 leading-relaxed">
          "<span className="text-white/70">{task.title}</span>" will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:text-white/70 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-white text-sm font-bold hover:bg-red-500 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────
function TaskCard({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: Task;
  onToggleComplete: (id: string, current: Status) => void;
  onDelete: (task: Task) => void;
}) {
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
      {!isCompleted && (
        <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${p.dot}`} style={{ left: "-1px" }} />
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={() => onToggleComplete(task.id, task.status)}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isCompleted ? "bg-[#a78bfa] border-[#a78bfa]" : "border-white/20 hover:border-[#a78bfa]"
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
              <h3 className={`font-semibold text-base leading-snug ${isCompleted ? "line-through text-white/30" : "text-white"}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${catColor}`}>
                  {task.category}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${p.badge} ${p.text}`}>
                  {p.label}
                </span>
                {/* Delete button */}
                <button
                  onClick={() => onDelete(task)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {task.description && (
              <p className={`text-sm mb-3 ${isCompleted ? "text-white/20" : "text-white/40"}`}>
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span className={`flex items-center gap-1.5 text-xs ${isCompleted ? "text-white/20" : "text-white/50"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1v2M11 1v2M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {task.date} · {task.time}
              </span>
              <span className={`flex items-center gap-1.5 text-xs ${isCompleted ? "text-white/20" : "text-white/40"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <path d="M8 2a5 5 0 100 10A5 5 0 008 2zm0 0V1M6 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {task.reminderBefore}
              </span>
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
function EmptyState({ filter, loading }: { filter: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
        <p className="text-white/30 text-sm">Loading tasks…</p>
      </div>
    );
  }
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

// ── Toast ─────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#1a1a35] border border-white/15 text-white text-sm font-medium shadow-2xl whitespace-nowrap">
      {message}
    </div>
  );
}

// ── Dashboard Content ────────────────────────────────────
function DashboardContent() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Real-time Firestore listener ──────────────────────
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data: Task[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Task, "id">),
        }));
        setTasks(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // ── Toggle complete ───────────────────────────────────
  const toggleComplete = useCallback(async (id: string, currentStatus: Status) => {
    const newStatus: Status = currentStatus === "completed" ? "upcoming" : "completed";
    try {
      await updateDoc(doc(db, "tasks", id), { status: newStatus });
      showToast(newStatus === "completed" ? "✅ Task completed!" : "↩ Task restored");
    } catch (e) {
      showToast("Failed to update task");
    }
  }, []);

  // ── Delete task ───────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, "tasks", taskToDelete.id));
      showToast("🗑️ Task deleted");
    } catch (e) {
      showToast("Failed to delete task");
    } finally {
      setTaskToDelete(null);
    }
  }, [taskToDelete]);

  // ── Filtered tasks ────────────────────────────────────
  const filtered = tasks.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ── Stats ─────────────────────────────────────────────
  const todayCount     = tasks.filter((t) => t.status === "today").length;
  const upcomingCount  = tasks.filter((t) => t.status === "upcoming").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const statsData = [
    { label: "Total Tasks", value: tasks.length,  icon: "📋" },
    { label: "Due Today",   value: todayCount,    icon: "📅" },
    { label: "Upcoming",    value: upcomingCount, icon: "⏳" },
    { label: "Completed",   value: completedCount, icon: "✅" },
  ];

  // ── Today's date label ────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#7c3aed]/8 blur-[120px]" />
        <div className="absolute bottom-1/3 left-10 w-72 h-72 rounded-full bg-[#f59e0b]/5 blur-[100px]" />
      </div>

      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-white/5 bg-[#0d0d20]/80 backdrop-blur-md hidden lg:flex flex-col z-40">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
          <span className="text-xl">🔔</span>
          <span className="font-bold text-base tracking-tight text-white">
            Never<span className="text-[#a78bfa]">Miss</span>
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { icon: "🏠", label: "Dashboard", href: "/dashboard", active: true },
            { icon: "➕", label: "New Task",  href: "/create",    active: false },
            { icon: "📅", label: "Calendar",  href: "/calendar",  active: false },
            { icon: "🔔", label: "Reminders", href: "/reminders", active: false },
            { icon: "⚙️", label: "Settings",  href: "/settings",  active: false },
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
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.displayName?.[0] ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.displayName ?? "User"}</p>
            <p className="text-xs text-white/30 truncate">Free plan</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all flex-shrink-0 text-xs"
          >
            ↩
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="lg:pl-60 relative z-10">

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-xs text-white/30">{todayLabel}</p>
          </div>
          <div className="flex-1 max-w-sm relative hidden md:block">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 16 16">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#a78bfa]/50 transition-all"
            />
          </div>
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {statsData.map(({ label, value, icon }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-xl mb-2">{icon}</div>
                <p className="text-2xl font-bold text-white mb-0.5">{loading ? "—" : value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            ))}
          </div>

          {/* AI banner */}
          <div className="mb-6 rounded-2xl border border-[#a78bfa]/20 bg-gradient-to-r from-[#a78bfa]/10 via-[#7c3aed]/5 to-transparent p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/20 flex items-center justify-center text-xl flex-shrink-0">🤖</div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">Create with AI</p>
                <p className="text-xs text-white/40">Just tell the AI what to remind you — it handles the rest.</p>
              </div>
            </div>
            <Link
              href="/create?mode=ai"
              className="flex-shrink-0 px-4 py-2 rounded-xl border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-semibold hover:bg-[#a78bfa]/20 transition-colors"
            >
              Try AI Mode →
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {FILTER_TABS.map(({ key, label }) => {
              const count = key === "all" ? tasks.length : tasks.filter((t) => t.status === key).length;
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
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === key ? "bg-white/20 text-white" : "bg-white/8 text-white/40"}`}>
                    {loading ? "…" : count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Task list */}
          {loading || filtered.length === 0 ? (
            <EmptyState filter={filter} loading={loading} />
          ) : (
            <div className="space-y-3">
              {(["today", "upcoming", "completed"] as Status[]).map((group) => {
                const groupTasks = filtered.filter((t) => t.status === group);
                if (groupTasks.length === 0) return null;
                if (filter !== "all" && filter !== group) return null;
                return (
                  <div key={group} className={filter === "all" && group !== "today" ? "mt-6" : ""}>
                    {filter === "all" && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-white/30 uppercase tracking-widest capitalize">{group}</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {groupTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleComplete={toggleComplete}
                          onDelete={setTaskToDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon: "🏠", label: "Home",     href: "/dashboard", active: true },
          { icon: "➕", label: "New",      href: "/create",    active: false },
          { icon: "📅", label: "Calendar", href: "/calendar",  active: false },
          { icon: "🔔", label: "Alerts",   href: "/reminders", active: false },
          { icon: "⚙️", label: "Settings", href: "/settings",  active: false },
        ].map(({ icon, label, href, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${active ? "text-[#a78bfa]" : "text-white/30 hover:text-white/60"}`}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {taskToDelete && (
        <DeleteModal
          task={taskToDelete}
          onConfirm={handleDelete}
          onCancel={() => setTaskToDelete(null)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}