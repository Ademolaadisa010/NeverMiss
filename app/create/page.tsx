"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────
type Mode = "form" | "ai";
type AiStep = "task" | "datetime" | "recurring" | "reminder" | "confirm";
type Priority = "high" | "medium" | "low";

interface FormData {
  title: string;
  description: string;
  date: string;
  time: string;
  priority: Priority;
  category: string;
  reminderBefore: string;
  recurring: string;
}

interface AiMessage {
  role: "ai" | "user";
  text: string;
}

interface AiTaskDraft {
  title?: string;
  date?: string;
  time?: string;
  recurring?: string;
  reminderBefore?: string;
}

// ── Constants ────────────────────────────────────────────
const REMINDER_OPTIONS = [
  "5 min before",
  "15 min before",
  "30 min before",
  "1 hour before",
  "2 hours before",
  "1 day before",
];

const RECURRING_OPTIONS = [
  "None",
  "Daily",
  "Weekdays",
  "Weekly",
  "Monthly",
];

const CATEGORIES = ["Work", "Health", "Finance", "Personal", "Education", "Other"];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: "high", label: "High", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  { value: "medium", label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  { value: "low", label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
];

const AI_STEPS: AiStep[] = ["task", "datetime", "recurring", "reminder", "confirm"];

const AI_PROMPTS: Record<AiStep, string> = {
  task: "👋 Hey! I'm your AI assistant. What task do you want to remember? Describe it naturally — like talking to a friend.",
  datetime: "Got it! 📅 When is this scheduled? Tell me the date and time (e.g. \"tomorrow at 3pm\" or \"June 15 at 9am\").",
  recurring: "Does this repeat? 🔁 Say something like \"every day\", \"every Monday\", or just \"no\" if it's one-time.",
  reminder: "⏰ When should I remind you? For example: \"30 minutes before\", \"1 hour before\", or \"the day before\".",
  confirm: "✅ Perfect! Here's what I've captured. Everything look good?",
};

// ── Helpers ──────────────────────────────────────────────
function parseAiInput(step: AiStep, input: string): Partial<AiTaskDraft> {
  const lower = input.toLowerCase().trim();
  switch (step) {
    case "task":
      return { title: input };
    case "datetime": {
      const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      let time = "";
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = timeMatch[2] ? timeMatch[2] : "00";
        const ampm = timeMatch[3]?.toLowerCase();
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
        time = `${String(h).padStart(2, "0")}:${m}`;
      }
      let date = "";
      if (lower.includes("tomorrow")) {
        const d = new Date(); d.setDate(d.getDate() + 1);
        date = d.toISOString().split("T")[0];
      } else if (lower.includes("today")) {
        date = new Date().toISOString().split("T")[0];
      } else {
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        for (const [name, idx] of Object.entries(months)) {
          if (lower.includes(name)) {
            const dayMatch = lower.match(/\b(\d{1,2})\b/);
            const day = dayMatch ? parseInt(dayMatch[1]) : 1;
            const d = new Date(new Date().getFullYear(), idx, day);
            date = d.toISOString().split("T")[0];
            break;
          }
        }
      }
      return { date: date || "", time: time || "" };
    }
    case "recurring": {
      if (lower.includes("no") || lower.includes("once") || lower.includes("one")) return { recurring: "None" };
      if (lower.includes("day") || lower.includes("daily")) return { recurring: "Daily" };
      if (lower.includes("week") && lower.includes("day")) return { recurring: "Weekdays" };
      if (lower.includes("week")) return { recurring: "Weekly" };
      if (lower.includes("month")) return { recurring: "Monthly" };
      return { recurring: "None" };
    }
    case "reminder": {
      if (lower.includes("5 min")) return { reminderBefore: "5 min before" };
      if (lower.includes("15 min")) return { reminderBefore: "15 min before" };
      if (lower.includes("30 min")) return { reminderBefore: "30 min before" };
      if (lower.includes("1 hour") || lower.includes("an hour")) return { reminderBefore: "1 hour before" };
      if (lower.includes("2 hour")) return { reminderBefore: "2 hours before" };
      if (lower.includes("day")) return { reminderBefore: "1 day before" };
      return { reminderBefore: "30 min before" };
    }
    default:
      return {};
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "Not set";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Input component ──────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/70 flex items-center gap-1">
        {label}
        {required && <span className="text-[#a78bfa]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#a78bfa]/60 focus:bg-white/8 transition-all";

// ── Form Mode ────────────────────────────────────────────
function FormMode({ onSave }: { onSave: (data: FormData) => void }) {
  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    date: "",
    time: "",
    priority: "medium",
    category: "Work",
    reminderBefore: "30 min before",
    recurring: "None",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const set = (k: keyof FormData, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) e.title = "Task title is required";
    if (!form.date) e.date = "Please pick a date";
    if (!form.time) e.time = "Please pick a time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSave(form);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <Field label="Task Title" required>
        <input
          className={`${inputCls} ${errors.title ? "border-red-500/50" : ""}`}
          placeholder="e.g. Team standup meeting"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
      </Field>

      {/* Description */}
      <Field label="Description">
        <textarea
          className={`${inputCls} resize-none h-20`}
          placeholder="Add more details (optional)"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" required>
          <input
            type="date"
            className={`${inputCls} [color-scheme:dark] ${errors.date ? "border-red-500/50" : ""}`}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
          {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
        </Field>
        <Field label="Time" required>
          <input
            type="time"
            className={`${inputCls} [color-scheme:dark] ${errors.time ? "border-red-500/50" : ""}`}
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
          />
          {errors.time && <p className="text-xs text-red-400 mt-1">{errors.time}</p>}
        </Field>
      </div>

      {/* Priority */}
      <Field label="Priority">
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map(({ value, label, color, bg }) => (
            <button
              key={value}
              onClick={() => set("priority", value)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                form.priority === value ? `${bg} ${color}` : "border-white/8 text-white/30 hover:border-white/20 hover:text-white/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Category */}
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => set("category", cat)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                form.category === cat
                  ? "bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#a78bfa]"
                  : "border-white/8 text-white/30 hover:border-white/20 hover:text-white/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Field>

      {/* Reminder + Recurring */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Remind Me">
          <select
            className={`${inputCls} [color-scheme:dark]`}
            value={form.reminderBefore}
            onChange={(e) => set("reminderBefore", e.target.value)}
          >
            {REMINDER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Recurring">
          <select
            className={`${inputCls} [color-scheme:dark]`}
            value={form.recurring}
            onChange={(e) => set("recurring", e.target.value)}
          >
            {RECURRING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#7c3aed]/25 mt-2"
      >
        Save Task 🚀
      </button>
    </div>
  );
}

// ── AI Mode ──────────────────────────────────────────────
function AiMode({ onSave }: { onSave: (data: FormData) => void }) {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: "ai", text: AI_PROMPTS.task },
  ]);
  const [stepIdx, setStepIdx] = useState(0);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AiTaskDraft>({});
  const [isTyping, setIsTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
//   const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentStep = AI_STEPS[stepIdx];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const pushAiMessage = useCallback((text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((p) => [...p, { role: "ai", text }]);
    }, 900);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    setMessages((p) => [...p, { role: "user", text: trimmed }]);
    setInput("");

    const parsed = parseAiInput(currentStep, trimmed);
    const newDraft = { ...draft, ...parsed };
    setDraft(newDraft);

    const nextIdx = stepIdx + 1;
    if (nextIdx < AI_STEPS.length) {
      setStepIdx(nextIdx);
      const nextStep = AI_STEPS[nextIdx];
      if (nextStep === "confirm") {
        pushAiMessage(
          `✅ Perfect! Here's what I've captured:\n\n📌 **${newDraft.title}**\n📅 ${formatDate(newDraft.date || "")} at ${formatTime(newDraft.time || "")}\n🔁 ${newDraft.recurring || "None"}\n⏰ Remind: ${newDraft.reminderBefore || "30 min before"}\n\nShall I save this task?`
        );
      } else {
        pushAiMessage(AI_PROMPTS[nextStep]);
      }
    }
  }, [input, isTyping, currentStep, draft, stepIdx, pushAiMessage]);

  const handleConfirm = () => {
    setConfirmed(true);
    onSave({
      title: draft.title || "Untitled Task",
      description: "",
      date: draft.date || new Date().toISOString().split("T")[0],
      time: draft.time || "09:00",
      priority: "medium",
      category: "Personal",
      reminderBefore: draft.reminderBefore || "30 min before",
      recurring: draft.recurring || "None",
    });
  };

  const handleRestart = () => {
    setMessages([{ role: "ai", text: AI_PROMPTS.task }]);
    setStepIdx(0);
    setDraft({});
    setInput("");
    setConfirmed(false);
  };

  const handleVoice = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

if (!SpeechRecognition) {
  alert("Voice input isn't supported in your browser. Try Chrome.");
  return;
}
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in your browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SpeechRecognition();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e: SpeechRecognitionEvent) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  const stepLabels: Record<AiStep, string> = {
    task: "Task",
    datetime: "Date & Time",
    recurring: "Recurrence",
    reminder: "Reminder",
    confirm: "Confirm",
  };

  const progress = ((stepIdx) / (AI_STEPS.length - 1)) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          {AI_STEPS.map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < stepIdx
                    ? "bg-[#a78bfa] text-white"
                    : i === stepIdx
                    ? "bg-[#a78bfa]/30 border-2 border-[#a78bfa] text-[#a78bfa]"
                    : "bg-white/5 border border-white/10 text-white/20"
                }`}
              >
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium hidden sm:block ${
                  i === stepIdx ? "text-[#a78bfa]" : i < stepIdx ? "text-white/40" : "text-white/15"
                }`}
              >
                {stepLabels[s]}
              </span>
            </div>
          ))}
        </div>
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-[280px] max-h-[380px] pr-1 scrollbar-none">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center text-sm flex-shrink-0">
                🤖
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "ai"
                  ? "bg-white/5 border border-white/10 text-white/80 rounded-tl-sm"
                  : "bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white rounded-tr-sm"
              }`}
            >
              {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center text-sm flex-shrink-0">
              🤖
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Confirm buttons */}
        {currentStep === "confirm" && !isTyping && !confirmed && (
          <div className="flex gap-3 ml-11">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              ✅ Yes, Save It!
            </button>
            <button
              onClick={handleRestart}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-medium hover:border-white/20 hover:text-white/70 transition-all"
            >
              🔄 Restart
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {currentStep !== "confirm" && (
        <div className="mt-4 flex items-center gap-2 border border-white/10 rounded-2xl bg-white/5 p-2 focus-within:border-[#a78bfa]/40 transition-colors">
          {/* Voice button */}
          <button
            onClick={handleVoice}
            title="Voice input"
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all flex-shrink-0 ${
              listening
                ? "bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse"
                : "bg-white/5 border border-white/10 text-white/40 hover:text-[#a78bfa] hover:border-[#a78bfa]/30"
            }`}
          >
            {listening ? "⏹" : "🎙️"}
          </button>

          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
            placeholder={listening ? "Listening…" : "Type your reply…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#a78bfa] text-white text-sm font-bold hover:bg-[#7c3aed] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            ↑
          </button>
        </div>
      )}

      {/* Quick reply suggestions */}
      {currentStep !== "confirm" && !isTyping && (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentStep === "task" && ["Doctor appointment", "Team meeting", "Pay bills", "Gym session"].map((s) => (
            <button key={s} onClick={() => setInput(s)} className="px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all">{s}</button>
          ))}
          {currentStep === "datetime" && ["Today at 9am", "Tomorrow at 3pm", "Monday at 10am"].map((s) => (
            <button key={s} onClick={() => setInput(s)} className="px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all">{s}</button>
          ))}
          {currentStep === "recurring" && ["No, once only", "Daily", "Weekly", "Monthly"].map((s) => (
            <button key={s} onClick={() => setInput(s)} className="px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all">{s}</button>
          ))}
          {currentStep === "reminder" && ["15 min before", "30 min before", "1 hour before", "1 day before"].map((s) => (
            <button key={s} onClick={() => setInput(s)} className="px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Success Screen ───────────────────────────────────────
function SuccessScreen({ task, onAnother }: { task: FormData; onAnother: () => void }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-[#a78bfa]/20 animate-ping opacity-40" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-4xl shadow-2xl shadow-[#7c3aed]/40">
          ✅
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Task Saved!</h2>
      <p className="text-white/40 text-sm mb-6 max-w-xs leading-relaxed">
        We'll remind you about{" "}
        <span className="text-[#a78bfa] font-medium">"{task.title}"</span>{" "}
        {task.reminderBefore} on {formatDate(task.date)} at {formatTime(task.time)}.
      </p>

      {/* Task summary card */}
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left mb-8 space-y-3">
        {[
          { icon: "📌", label: "Task", value: task.title },
          { icon: "📅", label: "Date", value: `${formatDate(task.date)} at ${formatTime(task.time)}` },
          { icon: "⏰", label: "Reminder", value: task.reminderBefore },
          { icon: "🔁", label: "Recurring", value: task.recurring === "None" ? "One-time" : task.recurring },
          { icon: "🏷️", label: "Category", value: task.category },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs text-white/40">
              <span>{icon}</span> {label}
            </span>
            <span className="text-xs font-medium text-white/80 text-right truncate max-w-[160px]">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onAnother}
          className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:border-white/20 hover:text-white/80 transition-all"
        >
          + Add Another
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#7c3aed]/20"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function CreateTaskPage() {
  const searchParams = useSearchParams();
  const defaultMode = searchParams.get("mode") === "ai" ? "ai" : "form";
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [savedTask, setSavedTask] = useState<FormData | null>(null);
  const [aiKey, setAiKey] = useState(0);

  const handleSave = (data: FormData) => setSavedTask(data);

  const handleAnother = () => {
    setSavedTask(null);
    setAiKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-[#7c3aed]/8 blur-[130px]" />
        <div className="absolute bottom-0 right-10 w-64 h-64 rounded-full bg-[#f59e0b]/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all"
          >
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">Create Task</h1>
            <p className="text-xs text-white/30">Set up your reminder</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span className="text-xl">🔔</span>
          <span className="font-bold text-white/60">Never<span className="text-[#a78bfa]">Miss</span></span>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-xl mx-auto px-5 py-6 pb-16">

        {savedTask ? (
          <SuccessScreen task={savedTask} onAnother={handleAnother} />
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-2xl border border-white/8 bg-white/[0.03] mb-6">
              {(["form", "ai"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  {m === "form" ? (
                    <><span className="text-base">⌨️</span> Form Mode</>
                  ) : (
                    <><span className="text-base">🤖</span> AI Mode</>
                  )}
                </button>
              ))}
            </div>

            {/* Mode description */}
            <div className={`mb-6 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              mode === "ai"
                ? "border-[#a78bfa]/20 bg-[#a78bfa]/5 text-[#c4b5fd]"
                : "border-white/8 bg-white/[0.02] text-white/35"
            }`}>
              {mode === "ai"
                ? "🎙️ Chat naturally with the AI — type or speak. It'll guide you step-by-step to create your task."
                : "⚡ Quick and precise. Fill in the fields directly to create your reminder."}
            </div>

            {/* Mode content */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              {mode === "form" ? (
                <FormMode onSave={handleSave} />
              ) : (
                <AiMode key={aiKey} onSave={handleSave} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}