"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";

// ── Types ─────────────────────────────────────────────────
type Priority = "high" | "medium" | "low";
type Status = "today" | "upcoming" | "completed";
type ReminderStatus = "upcoming" | "snoozed" | "dismissed";
type FilterTab = "all" | "upcoming" | "snoozed" | "dismissed";

// A Task from Firestore, viewed as a Reminder
interface Reminder {
  id: string;
  taskTitle: string;       // = title
  taskDescription: string; // = description
  taskDate: string;        // = rawDate (YYYY-MM-DD)
  taskTime: string;        // = time (HH:MM)
  reminderBefore: string;
  priority: Priority;
  category: string;
  reminderStatus: ReminderStatus;
  status: Status;
  recurring?: string;
  snoozedUntil?: string;
  firedAt?: string;
  userId: string;
}

// ── Helpers ───────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { dot: string; badge: string; text: string; glow: string }> = {
  high:   { dot:"bg-red-400",     badge:"bg-red-500/10 border-red-500/20",     text:"text-red-400",     glow:"shadow-red-500/10" },
  medium: { dot:"bg-amber-400",   badge:"bg-amber-500/10 border-amber-500/20", text:"text-amber-400",   glow:"shadow-amber-500/10" },
  low:    { dot:"bg-emerald-400", badge:"bg-emerald-500/10 border-emerald-500/20", text:"text-emerald-400", glow:"shadow-emerald-500/10" },
};
const CAT_COLOR: Record<string,string> = {
  Work:     "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20",
  Health:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Finance:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Personal: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};
const SNOOZE_OPTIONS = ["5 minutes","15 minutes","30 minutes","1 hour"];
const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key:"all",       label:"All",       icon:"🔔" },
  { key:"upcoming",  label:"Upcoming",  icon:"⏳" },
  { key:"snoozed",   label:"Snoozed",   icon:"💤" },
  { key:"dismissed", label:"Dismissed", icon:"✓"  },
];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

function calcReminderTime(taskTime: string, reminderBefore: string): string {
  if (!taskTime) return taskTime;
  const [h, m] = taskTime.split(":").map(Number);
  let totalMins = h * 60 + m;
  if (reminderBefore.includes("5 min"))    totalMins -= 5;
  if (reminderBefore.includes("15 min"))   totalMins -= 15;
  if (reminderBefore.includes("30 min"))   totalMins -= 30;
  if (reminderBefore.includes("1 hour"))   totalMins -= 60;
  if (reminderBefore.includes("2 hour"))   totalMins -= 120;
  if (reminderBefore.includes("1 day"))    totalMins -= 1440;
  if (totalMins < 0) totalMins = 0;
  return `${String(Math.floor(totalMins/60)).padStart(2,"0")}:${String(totalMins%60).padStart(2,"0")}`;
}

// ── Push Banner ───────────────────────────────────────────
function PushBanner({ onEnable, dismissed, onDismiss }: {
  onEnable: () => void; dismissed: boolean; onDismiss: () => void;
}) {
  if (dismissed) return null;
  return (
    <div className="rounded-2xl border border-[#f59e0b]/25 bg-gradient-to-r from-[#f59e0b]/10 via-[#f59e0b]/5 to-transparent p-4 flex items-center gap-4 mb-6">
      <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center text-xl flex-shrink-0">🔔</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white mb-0.5">Enable Push Notifications</p>
        <p className="text-xs text-white/40 leading-relaxed">Get notified even when the app is closed.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onEnable} className="px-4 py-2 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-bold hover:bg-[#f59e0b]/30 transition-colors">Enable</button>
        <button onClick={onDismiss} className="w-7 h-7 rounded-lg border border-white/10 text-white/30 text-xs hover:text-white/60 transition-colors flex items-center justify-center">✕</button>
      </div>
    </div>
  );
}

// ── Snooze Popover ────────────────────────────────────────
function SnoozePopover({ onSnooze, onClose }: { onSnooze: (dur: string) => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-2xl border border-white/10 bg-[#0f0f24] shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider px-2 py-1">Snooze for…</p>
      {SNOOZE_OPTIONS.map((opt) => (
        <button key={opt} onClick={() => { onSnooze(opt); onClose(); }}
          className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-[#a78bfa]/15 hover:text-[#a78bfa] transition-all font-medium">
          💤 {opt}
        </button>
      ))}
    </div>
  );
}

// ── Reminder Card ─────────────────────────────────────────
function ReminderCard({ reminder, onSnooze, onDismiss, onRestore }: {
  reminder: Reminder;
  onSnooze: (id: string, dur: string) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const [showSnooze, setShowSnooze] = useState(false);
  const p = PRIORITY_CONFIG[reminder.priority];
  const catCls = CAT_COLOR[reminder.category] ?? "bg-white/5 text-white/40 border-white/10";
  const isUpcoming  = reminder.reminderStatus === "upcoming";
  const isSnoozed   = reminder.reminderStatus === "snoozed";
  const isDismissed = reminder.reminderStatus === "dismissed";
  const reminderFireTime = calcReminderTime(reminder.taskTime, reminder.reminderBefore);

  return (
    <div className={`relative group rounded-2xl border transition-all duration-300 ${
      isDismissed ? "border-white/5 bg-white/[0.015] opacity-50 hover:opacity-70"
      : isSnoozed  ? "border-[#60a5fa]/20 bg-[#60a5fa]/5 hover:border-[#60a5fa]/30"
      : `border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/15 shadow-lg ${p.glow}`
    }`}>
      {isUpcoming && <div className={`absolute left-0 top-5 bottom-5 w-0.5 rounded-full ${p.dot}`} style={{ left:"-1px" }} />}

      {isSnoozed && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#60a5fa]/15 border border-[#60a5fa]/25 text-[#60a5fa] text-[10px] font-bold">
          💤 Snoozed until {reminder.snoozedUntil ? formatTime(reminder.snoozedUntil) : "later"}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isDismissed ? "bg-white/5" : isSnoozed ? "bg-[#60a5fa]/15" : "bg-[#a78bfa]/15"}`}>
            {isDismissed ? "✓" : isSnoozed ? "💤" : "🔔"}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-base leading-snug mb-1 ${isDismissed ? "text-white/30 line-through" : "text-white"}`}>
              {reminder.taskTitle}
            </h3>
            {reminder.taskDescription && (
              <p className={`text-sm mb-3 ${isDismissed ? "text-white/20" : "text-white/40"}`}>{reminder.taskDescription}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${catCls}`}>{reminder.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${p.badge} ${p.text}`}>
                {reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1)}
              </span>
              {reminder.recurring && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-[#a78bfa]/20 bg-[#a78bfa]/8 text-[#a78bfa]/70">
                  🔁 {reminder.recurring}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className={`flex items-center gap-1.5 ${isDismissed ? "text-white/20" : "text-white/45"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 1v2M11 1v2M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {formatDate(reminder.taskDate)} · {formatTime(reminder.taskTime)}
              </span>
              <span className={`flex items-center gap-1.5 ${isDismissed ? "text-white/20" : "text-[#a78bfa]/70"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="9" r="5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M8 7v2l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M5 2l6 0M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Remind at {formatTime(reminderFireTime)}
                <span className="text-white/25">({reminder.reminderBefore})</span>
              </span>
              {isDismissed && reminder.firedAt && (
                <span className="text-white/20">Fired at {reminder.firedAt}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isDismissed && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
            <div className="relative">
              <button onClick={() => setShowSnooze((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-semibold hover:border-[#60a5fa]/30 hover:text-[#60a5fa] hover:bg-[#60a5fa]/8 transition-all">
                💤 Snooze
                <svg className="w-3 h-3" fill="none" viewBox="0 0 10 10">
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
              {showSnooze && (
                <SnoozePopover onSnooze={(dur) => onSnooze(reminder.id, dur)} onClose={() => setShowSnooze(false)} />
              )}
            </div>
            <button onClick={() => onDismiss(reminder.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-semibold hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/8 transition-all">
              ✕ Dismiss
            </button>
            <div className="flex-1" />
            <Link href={`/create?edit=${reminder.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 text-white/35 text-xs font-semibold hover:border-white/20 hover:text-white/60 transition-all">
              ✏️ Edit
            </Link>
          </div>
        )}

        {isDismissed && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <button onClick={() => onRestore(reminder.id)}
              className="text-xs text-white/25 hover:text-white/50 transition-colors font-medium">
              ↩ Restore reminder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
function EmptyState({ tab, loading }: { tab: FilterTab; loading: boolean }) {
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
      <p className="text-white/30 text-sm">Loading reminders…</p>
    </div>
  );
  const config = {
    all:       { icon:"🔔", msg:"No reminders yet. Create a task to get started." },
    upcoming:  { icon:"⏳", msg:"All clear! No upcoming reminders right now." },
    snoozed:   { icon:"💤", msg:"Nothing snoozed. You're on top of things!" },
    dismissed: { icon:"✅", msg:"No dismissed reminders." },
  }[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-3xl mb-4">{config.icon}</div>
      <p className="text-white/40 text-sm max-w-xs mb-5">{config.msg}</p>
      {tab !== "dismissed" && (
        <Link href="/create" className="px-5 py-2 rounded-full bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-[#a78bfa] text-xs font-semibold hover:bg-[#a78bfa]/25 transition-colors">+ Create Task</Link>
      )}
    </div>
  );
}

// ── Reminders Content ─────────────────────────────────────
function RemindersContent() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [pushDismissed, setPushDismissed] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Firestore listener ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: Reminder[] = snap.docs.map((d) => {
        const t = d.data();
        return {
          id: d.id,
          taskTitle:       t.title ?? "",
          taskDescription: t.description ?? "",
          taskDate:        t.rawDate ?? "",
          taskTime:        t.time ?? "",
          reminderBefore:  t.reminderBefore ?? "30 min before",
          priority:        t.priority ?? "medium",
          category:        t.category ?? "Other",
          reminderStatus:  t.reminderStatus ?? "upcoming",
          status:          t.status ?? "upcoming",
          recurring:       t.recurring !== "None" ? t.recurring : undefined,
          snoozedUntil:    t.snoozedUntil,
          firedAt:         t.firedAt,
          userId:          t.userId,
        };
      });
      // Only show non-completed tasks as active reminders
      setReminders(data.filter((r) => r.status !== "completed" || r.reminderStatus === "dismissed"));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  // ── Snooze ──────────────────────────────────────────────
  const handleSnooze = useCallback(async (id: string, dur: string) => {
    try {
      await updateDoc(doc(db, "tasks", id), { reminderStatus: "snoozed", snoozedUntil: "soon" });
      showToast(`💤 Snoozed for ${dur}`);
    } catch { showToast("Failed to snooze"); }
  }, []);

  // ── Dismiss ─────────────────────────────────────────────
  const handleDismiss = useCallback(async (id: string) => {
    const firedAt = new Date().toLocaleTimeString("en-US",{ hour:"numeric", minute:"2-digit" });
    try {
      await updateDoc(doc(db, "tasks", id), { reminderStatus: "dismissed", firedAt });
      showToast("✕ Reminder dismissed");
    } catch { showToast("Failed to dismiss"); }
  }, []);

  // ── Restore ─────────────────────────────────────────────
  const handleRestore = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, "tasks", id), { reminderStatus: "upcoming", firedAt: null });
      showToast("↩ Reminder restored");
    } catch { showToast("Failed to restore"); }
  }, []);

  // ── Push notifications ──────────────────────────────────
  const handleEnablePush = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") { setPushEnabled(true); setPushDismissed(true); showToast("🔔 Push notifications enabled!"); }
        else showToast("Notifications blocked. Check browser settings.");
      });
    } else showToast("Push notifications not supported in this browser.");
  };

  // ── Counts ──────────────────────────────────────────────
  const counts = {
    all:       reminders.length,
    upcoming:  reminders.filter((r) => r.reminderStatus === "upcoming").length,
    snoozed:   reminders.filter((r) => r.reminderStatus === "snoozed").length,
    dismissed: reminders.filter((r) => r.reminderStatus === "dismissed").length,
  };

  const statusOrder: Record<ReminderStatus, number> = { upcoming:0, snoozed:1, dismissed:2 };
  const filtered = reminders.filter((r) => filter === "all" || r.reminderStatus === filter);
  const sorted = [...filtered].sort((a,b) => {
    const so = statusOrder[a.reminderStatus] - statusOrder[b.reminderStatus];
    return so !== 0 ? so : a.taskTime.localeCompare(b.taskTime);
  });

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-[#7c3aed]/8 blur-[130px]" />
        <div className="absolute bottom-0 right-20 w-72 h-72 rounded-full bg-[#f59e0b]/5 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-white/5 bg-[#0d0d20]/80 backdrop-blur-md hidden lg:flex flex-col z-40">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
          <span className="text-xl">🔔</span>
          <span className="font-bold text-base tracking-tight text-white">Never<span className="text-[#a78bfa]">Miss</span></span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { icon:"🏠", label:"Dashboard",  href:"/dashboard" },
            { icon:"➕", label:"New Task",   href:"/create" },
            { icon:"📅", label:"Calendar",   href:"/calendar" },
            { icon:"🔔", label:"Reminders",  href:"/reminders", active:true },
            { icon:"⚙️", label:"Settings",   href:"/settings" },
          ].map(({ icon, label, href, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <span className="text-base">{icon}</span>{label}
              {active && counts.upcoming > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[#a78bfa] text-white text-[10px] font-bold flex items-center justify-center">{counts.upcoming}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mx-3 mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${pushEnabled ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
            <p className="text-xs font-bold text-white/50">Push Notifications</p>
          </div>
          <p className="text-xs text-white/25">{pushEnabled ? "Active & listening" : "Not enabled yet"}</p>
        </div>
        <div className="mx-3 mb-4 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4">
          <p className="text-xs font-bold text-[#f59e0b] mb-1">⚡ Go Premium</p>
          <p className="text-xs text-white/40 leading-relaxed mb-3">Email reminders + priority alerts.</p>
          <button className="w-full py-1.5 rounded-lg bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-semibold hover:bg-[#f59e0b]/30 transition-colors">Upgrade Now</button>
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
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Reminders
              {counts.upcoming > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#a78bfa] text-white text-[10px] font-bold flex items-center justify-center">{counts.upcoming}</span>
              )}
            </h1>
            <p className="text-xs text-white/30">Manage your notification schedule</p>
          </div>
          <Link href="/create" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#7c3aed]/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <span className="hidden sm:inline">New Task</span>
          </Link>
        </header>

        <main className="px-5 py-6 max-w-3xl mx-auto pb-28 lg:pb-8">
          <PushBanner onEnable={handleEnablePush} dismissed={pushDismissed} onDismiss={() => setPushDismissed(true)} />

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label:"Upcoming",  value:counts.upcoming,  icon:"⏳", color:"text-[#a78bfa]" },
              { label:"Snoozed",   value:counts.snoozed,   icon:"💤", color:"text-[#60a5fa]" },
              { label:"Dismissed", value:counts.dismissed, icon:"✓",  color:"text-white/40" },
              { label:"Total",     value:counts.all,       icon:"🔔", color:"text-white/60" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-xl mb-2">{icon}</div>
                <p className={`text-2xl font-bold mb-0.5 ${color}`}>{loading ? "…" : value}</p>
                <p className="text-xs text-white/30">{label}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {FILTER_TABS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${filter === key ? "bg-[#a78bfa] text-white shadow-lg shadow-[#7c3aed]/20" : "bg-white/5 text-white/40 border border-white/8 hover:bg-white/10 hover:text-white/70"}`}>
                <span>{icon}</span>{label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === key ? "bg-white/20 text-white" : "bg-white/8 text-white/30"}`}>
                  {loading ? "…" : counts[key]}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          {loading || sorted.length === 0 ? (
            <EmptyState tab={filter} loading={loading} />
          ) : filter === "all" ? (
            <>
              {counts.upcoming > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-3"><span className="text-xs font-bold text-white/30 uppercase tracking-widest">Upcoming</span><div className="flex-1 h-px bg-white/5" /></div>
                  <div className="space-y-3">{sorted.filter((r) => r.reminderStatus === "upcoming").map((r) => <ReminderCard key={r.id} reminder={r} onSnooze={handleSnooze} onDismiss={handleDismiss} onRestore={handleRestore} />)}</div>
                </section>
              )}
              {counts.snoozed > 0 && (
                <section className="mt-6">
                  <div className="flex items-center gap-3 mb-3"><span className="text-xs font-bold text-white/30 uppercase tracking-widest">Snoozed</span><div className="flex-1 h-px bg-white/5" /></div>
                  <div className="space-y-3">{sorted.filter((r) => r.reminderStatus === "snoozed").map((r) => <ReminderCard key={r.id} reminder={r} onSnooze={handleSnooze} onDismiss={handleDismiss} onRestore={handleRestore} />)}</div>
                </section>
              )}
              {counts.dismissed > 0 && (
                <section className="mt-6">
                  <div className="flex items-center gap-3 mb-3"><span className="text-xs font-bold text-white/30 uppercase tracking-widest">Dismissed</span><div className="flex-1 h-px bg-white/5" /></div>
                  <div className="space-y-3">{sorted.filter((r) => r.reminderStatus === "dismissed").map((r) => <ReminderCard key={r.id} reminder={r} onSnooze={handleSnooze} onDismiss={handleDismiss} onRestore={handleRestore} />)}</div>
                </section>
              )}
            </>
          ) : (
            <div className="space-y-3">{sorted.map((r) => <ReminderCard key={r.id} reminder={r} onSnooze={handleSnooze} onDismiss={handleDismiss} onRestore={handleRestore} />)}</div>
          )}
        </main>
      </div>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon:"🏠", label:"Home",     href:"/dashboard" },
          { icon:"➕", label:"New",      href:"/create" },
          { icon:"📅", label:"Calendar", href:"/calendar" },
          { icon:"🔔", label:"Alerts",   href:"/reminders", active:true },
          { icon:"⚙️", label:"Settings", href:"/settings" },
        ].map(({ icon, label, href, active }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors relative ${active ? "text-[#a78bfa]" : "text-white/30 hover:text-white/60"}`}>
            <span className="text-xl">{icon}</span>{label}
            {active && counts.upcoming > 0 && (
              <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-[#a78bfa] text-white text-[9px] font-bold flex items-center justify-center">{counts.upcoming}</span>
            )}
          </Link>
        ))}
      </nav>

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#1a1a35] border border-white/15 text-white text-sm font-medium shadow-2xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function RemindersPage() {
  return <AuthGuard><RemindersContent /></AuthGuard>;
}