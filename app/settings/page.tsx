"use client";

import { useState, useRef } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────
type SettingsTab = "profile" | "notifications" | "ai" | "appearance" | "account";
type ReminderSound = "chime" | "bell" | "pulse" | "none";
type AiVoice = "nova" | "echo" | "fable" | "onyx";

interface ProfileForm {
  name: string;
  email: string;
  timezone: string;
  avatar: string;
}

interface NotifSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  sound: ReminderSound;
  vibrate: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  defaultReminder: string;
  emailDigest: "daily" | "weekly" | "never";
}

interface AiSettings {
  aiModeDefault: boolean;
  voiceEnabled: boolean;
  voice: AiVoice;
  speakReminders: boolean;
  language: string;
  suggestions: boolean;
}

interface AppearanceSettings {
  accentColor: string;
  compactMode: boolean;
  animationsEnabled: boolean;
  startPage: "dashboard" | "calendar" | "reminders";
}

// ── Initial state ─────────────────────────────────────────
const INIT_PROFILE: ProfileForm = {
  name: "John Doe",
  email: "john@example.com",
  timezone: "Africa/Lagos",
  avatar: "",
};

const INIT_NOTIF: NotifSettings = {
  pushEnabled: false,
  emailEnabled: false,
  soundEnabled: true,
  sound: "chime",
  vibrate: true,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  defaultReminder: "30 min before",
  emailDigest: "daily",
};

const INIT_AI: AiSettings = {
  aiModeDefault: false,
  voiceEnabled: true,
  voice: "nova",
  speakReminders: true,
  language: "en-US",
  suggestions: true,
};

const INIT_APPEARANCE: AppearanceSettings = {
  accentColor: "#a78bfa",
  compactMode: false,
  animationsEnabled: true,
  startPage: "dashboard",
};

// ── Constants ─────────────────────────────────────────────
const TIMEZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Cairo",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo",
];

const REMINDER_OPTIONS = [
  "5 min before", "15 min before", "30 min before",
  "1 hour before", "2 hours before", "1 day before",
];

const ACCENT_COLORS = [
  { label: "Violet",  value: "#a78bfa" },
  { label: "Blue",    value: "#60a5fa" },
  { label: "Emerald", value: "#34d399" },
  { label: "Amber",   value: "#fbbf24" },
  { label: "Rose",    value: "#fb7185" },
  { label: "Cyan",    value: "#22d3ee" },
];

const SOUND_OPTIONS: { value: ReminderSound; label: string; icon: string }[] = [
  { value: "chime", label: "Chime",  icon: "🎵" },
  { value: "bell",  label: "Bell",   icon: "🔔" },
  { value: "pulse", label: "Pulse",  icon: "💫" },
  { value: "none",  label: "Silent", icon: "🔇" },
];

const VOICE_OPTIONS: { value: AiVoice; label: string; desc: string }[] = [
  { value: "nova",  label: "Nova",  desc: "Warm & friendly" },
  { value: "echo",  label: "Echo",  desc: "Clear & neutral" },
  { value: "fable", label: "Fable", desc: "Expressive & bright" },
  { value: "onyx",  label: "Onyx",  desc: "Deep & authoritative" },
];

const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key: "profile",       label: "Profile",        icon: "👤" },
  { key: "notifications", label: "Notifications",  icon: "🔔" },
  { key: "ai",            label: "AI & Voice",     icon: "🤖" },
  { key: "appearance",    label: "Appearance",     icon: "🎨" },
  { key: "account",       label: "Account",        icon: "⚙️" },
];

// ── Reusable Components ───────────────────────────────────
function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {desc && <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{desc}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-white/[0.03] p-5 ${className}`}>
      {children}
    </div>
  );
}

function Row({ children, border = true }: { children: React.ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${border ? "border-b border-white/5 last:border-0" : ""}`}>
      {children}
    </div>
  );
}

function Label({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white/80">{title}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{sub}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-300 flex-shrink-0 ${
        checked ? "bg-[#a78bfa]" : "bg-white/15"
      }`}
      style={{ height: "22px", width: "40px" }}
    >
      <span
        className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-300 ${
          checked ? "left-[18px]" : "left-[2px]"
        }`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}

function SelectInput({
  value, onChange, options, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a78bfa]/50 [color-scheme:dark] transition-colors ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#a78bfa]/50 focus:bg-white/8 transition-all";

// ── Profile Tab ───────────────────────────────────────────
function ProfileTab({ data, onChange, onSave }: {
  data: ProfileForm;
  onChange: (k: keyof ProfileForm, v: string) => void;
  onSave: () => void;
}) {
  const initials = data.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <SectionHeader title="Your Profile" desc="Update your personal info and timezone." />

      {/* Avatar */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-[#7c3aed]/25">
              {initials}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#a78bfa] border-2 border-[#0a0a1a] flex items-center justify-center text-[10px] text-white hover:bg-[#7c3aed] transition-colors">
              ✏️
            </button>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{data.name}</p>
            <p className="text-xs text-white/40">{data.email}</p>
            <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">
              Free Plan
            </span>
          </div>
        </div>
      </Card>

      {/* Fields */}
      <Card>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Full Name</label>
            <input
              className={inputCls}
              value={data.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Email</label>
            <input
              className={inputCls}
              type="email"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Timezone</label>
            <SelectInput
              value={data.timezone}
              onChange={(v) => onChange("timezone", v)}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz.replace("_", " ") }))}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      <button
        onClick={onSave}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#7c3aed]/20"
      >
        Save Profile
      </button>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────
function NotificationsTab({ data, onChange }: {
  data: NotifSettings;
  onChange: <K extends keyof NotifSettings>(k: K, v: NotifSettings[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Notifications" desc="Control how and when NeverMiss alerts you." />

      {/* Push */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Push Notifications</p>
        <Row>
          <Label title="Push Notifications" sub="Get notified even when the app is closed" />
          <Toggle checked={data.pushEnabled} onChange={(v) => onChange("pushEnabled", v)} />
        </Row>
        <Row>
          <Label title="Vibration" sub="Buzz on reminder (mobile)" />
          <Toggle checked={data.vibrate} onChange={(v) => onChange("vibrate", v)} />
        </Row>
      </Card>

      {/* Email */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Email</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/25 text-[#f59e0b] font-semibold">Premium</span>
        </div>
        <Row>
          <Label title="Email Reminders" sub="Receive tasks by email" />
          <Toggle checked={data.emailEnabled} onChange={(v) => onChange("emailEnabled", v)} />
        </Row>
        <Row>
          <Label title="Daily Digest" sub="Summary of upcoming tasks" />
          <SelectInput
            value={data.emailDigest}
            onChange={(v) => onChange("emailDigest", v as NotifSettings["emailDigest"])}
            options={[
              { value: "daily",  label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "never",  label: "Never" },
            ]}
          />
        </Row>
      </Card>

      {/* Sound */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Sound</p>
        <Row>
          <Label title="Sound Alerts" sub="Play a sound with each reminder" />
          <Toggle checked={data.soundEnabled} onChange={(v) => onChange("soundEnabled", v)} />
        </Row>
        {data.soundEnabled && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {SOUND_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => onChange("sound", value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                  data.sound === value
                    ? "border-[#a78bfa]/50 bg-[#a78bfa]/15 text-[#a78bfa]"
                    : "border-white/8 text-white/35 hover:border-white/20 hover:text-white/60"
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Quiet Hours */}
      <Card>
        <Row border={false}>
          <Label title="Quiet Hours" sub="Silence reminders during set hours" />
          <Toggle checked={data.quietHoursEnabled} onChange={(v) => onChange("quietHoursEnabled", v)} />
        </Row>
        {data.quietHoursEnabled && (
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/35 font-medium">From</label>
              <input
                type="time"
                value={data.quietStart}
                onChange={(e) => onChange("quietStart", e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/35 font-medium">Until</label>
              <input
                type="time"
                value={data.quietEnd}
                onChange={(e) => onChange("quietEnd", e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Default Reminder */}
      <Card>
        <Row border={false}>
          <Label title="Default Reminder" sub="Applied when no reminder is specified" />
          <SelectInput
            value={data.defaultReminder}
            onChange={(v) => onChange("defaultReminder", v)}
            options={REMINDER_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </Row>
      </Card>
    </div>
  );
}

// ── AI & Voice Tab ────────────────────────────────────────
function AiTab({ data, onChange }: {
  data: AiSettings;
  onChange: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="AI & Voice" desc="Configure your AI assistant behaviour and voice preferences." />

      {/* AI Behaviour */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">AI Behaviour</p>
        <Row>
          <Label title="AI Mode by Default" sub="Open AI chat when creating tasks" />
          <Toggle checked={data.aiModeDefault} onChange={(v) => onChange("aiModeDefault", v)} />
        </Row>
        <Row>
          <Label title="Smart Suggestions" sub="AI suggests tasks and reminders based on patterns" />
          <Toggle checked={data.suggestions} onChange={(v) => onChange("suggestions", v)} />
        </Row>
        <Row>
          <Label title="Language" sub="AI response and voice language" />
          <SelectInput
            value={data.language}
            onChange={(v) => onChange("language", v)}
            options={[
              { value: "en-US", label: "English (US)" },
              { value: "en-GB", label: "English (UK)" },
              { value: "fr-FR", label: "Français" },
              { value: "es-ES", label: "Español" },
              { value: "pt-BR", label: "Português" },
            ]}
          />
        </Row>
      </Card>

      {/* Voice */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Voice</p>
        <Row>
          <Label title="Voice Assistant" sub="AI speaks responses aloud" />
          <Toggle checked={data.voiceEnabled} onChange={(v) => onChange("voiceEnabled", v)} />
        </Row>
        <Row>
          <Label title="Speak Reminders" sub="AI reads reminders out loud when they fire" />
          <Toggle checked={data.speakReminders} onChange={(v) => onChange("speakReminders", v)} />
        </Row>

        {data.voiceEnabled && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-white/35 font-semibold mb-3">Voice Style</p>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => onChange("voice", value)}
                  className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                    data.voice === value
                      ? "border-[#a78bfa]/50 bg-[#a78bfa]/12 text-[#a78bfa]"
                      : "border-white/8 hover:border-white/18 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-sm font-bold ${data.voice === value ? "text-[#a78bfa]" : "text-white/70"}`}>
                      {label}
                    </span>
                    {data.voice === value && (
                      <span className="w-4 h-4 rounded-full bg-[#a78bfa] flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/30">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Info box */}
      <div className="rounded-xl border border-[#a78bfa]/15 bg-[#a78bfa]/5 p-4 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">🤖</span>
        <div>
          <p className="text-xs font-bold text-[#a78bfa] mb-1">About NeverMiss AI</p>
          <p className="text-xs text-white/35 leading-relaxed">
            The AI understands natural language to create structured tasks, generates smart reminder messages, and guides you step-by-step. Voice uses your browser's Web Speech API.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────
function AppearanceTab({ data, onChange }: {
  data: AppearanceSettings;
  onChange: <K extends keyof AppearanceSettings>(k: K, v: AppearanceSettings[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Appearance" desc="Personalise how NeverMiss looks and behaves." />

      {/* Accent color */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Accent Color</p>
        <div className="grid grid-cols-6 gap-3">
          {ACCENT_COLORS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onChange("accentColor", value)}
              title={label}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={`w-9 h-9 rounded-xl transition-all ${
                  data.accentColor === value
                    ? "ring-2 ring-white/40 ring-offset-2 ring-offset-[#0a0a1a] scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: value }}
              />
              <span className="text-[9px] text-white/25 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Layout */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Layout</p>
        <Row>
          <Label title="Compact Mode" sub="Reduce spacing for denser task lists" />
          <Toggle checked={data.compactMode} onChange={(v) => onChange("compactMode", v)} />
        </Row>
        <Row>
          <Label title="Animations" sub="Motion effects and transitions" />
          <Toggle checked={data.animationsEnabled} onChange={(v) => onChange("animationsEnabled", v)} />
        </Row>
        <Row border={false}>
          <Label title="Start Page" sub="Default page when you open the app" />
          <SelectInput
            value={data.startPage}
            onChange={(v) => onChange("startPage", v as AppearanceSettings["startPage"])}
            options={[
              { value: "dashboard",  label: "Dashboard" },
              { value: "calendar",   label: "Calendar" },
              { value: "reminders",  label: "Reminders" },
            ]}
          />
        </Row>
      </Card>

      {/* Preview */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Preview</p>
        <div className="rounded-xl border border-white/8 bg-[#0a0a1a] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: `${data.accentColor}30`, border: `1px solid ${data.accentColor}40` }}
            >
              🔔
            </div>
            <div>
              <p className="text-sm font-bold text-white">Team Standup</p>
              <p className="text-xs text-white/35">Today · 9:00 AM</p>
            </div>
            <div className="ml-auto">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${data.accentColor}20`, color: data.accentColor, border: `1px solid ${data.accentColor}30` }}
              >
                Work
              </span>
            </div>
          </div>
          <div className={`h-px bg-white/5 mb-3 ${data.compactMode ? "my-2" : "my-3"}`} />
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: data.accentColor }}
            >
              Snooze
            </button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 border border-white/10">
              Dismiss
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────
function AccountTab({ onToast }: { onToast: (msg: string) => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  return (
    <div className="space-y-6">
      <SectionHeader title="Account" desc="Manage your plan, data, and security." />

      {/* Plan */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Current Plan</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Free Plan</p>
            <p className="text-xs text-white/35">Push notifications · AI mode · Voice assistant</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-white/40 font-semibold">Active</span>
        </div>
        <div className="rounded-xl border border-[#f59e0b]/25 bg-gradient-to-r from-[#f59e0b]/10 to-transparent p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-sm font-bold text-[#f59e0b] mb-0.5">⚡ Premium Plan</p>
              <p className="text-xs text-white/40 leading-relaxed">Email reminders · Advanced scheduling · Priority AI · Smart enhancements</p>
            </div>
          </div>
          <button className="w-full py-2.5 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#f59e0b] text-sm font-bold hover:bg-[#f59e0b]/30 transition-colors">
            Upgrade to Premium →
          </button>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Security</p>
        <Row>
          <Label title="Change Password" sub="Update your login password" />
          <button
            onClick={() => onToast("Password reset email sent")}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-white/20 hover:text-white/70 transition-all flex-shrink-0"
          >
            Reset
          </button>
        </Row>
        <Row border={false}>
          <Label title="Sign Out" sub="Log out of this device" />
          <button
            onClick={() => onToast("Signed out successfully")}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-red-500/30 hover:text-red-400 transition-all flex-shrink-0"
          >
            Sign Out
          </button>
        </Row>
      </Card>

      {/* Data */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Your Data</p>
        <Row>
          <Label title="Export Tasks" sub="Download all your tasks as JSON" />
          <button
            onClick={() => onToast("📦 Export started — check Downloads")}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all flex-shrink-0"
          >
            Export
          </button>
        </Row>
        <Row border={false}>
          <Label title="Clear All Tasks" sub="Permanently delete all tasks and reminders" />
          <button
            onClick={() => onToast("All tasks cleared")}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-red-500/30 hover:text-red-400 transition-all flex-shrink-0"
          >
            Clear
          </button>
        </Row>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/15">
        <p className="text-xs font-bold text-red-400/60 uppercase tracking-wider mb-1">Danger Zone</p>
        <Row border={false}>
          <Label
            title="Delete Account"
            sub="Permanently delete your account and all data. This cannot be undone."
          />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400/70 text-xs font-semibold hover:bg-red-500/10 hover:text-red-400 transition-all flex-shrink-0"
          >
            Delete
          </button>
        </Row>
      </Card>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0f0f24] p-6 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Delete Account?</h3>
            <p className="text-white/40 text-sm mb-4 leading-relaxed">
              This will permanently delete your account, all tasks, and reminders. Type <span className="text-red-400 font-bold">DELETE</span> to confirm.
            </p>
            <input
              className={`${inputCls} mb-4`}
              placeholder="Type DELETE to confirm"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:text-white/70 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={deleteInput !== "DELETE"}
                className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState(INIT_PROFILE);
  const [notif, setNotif] = useState(INIT_NOTIF);
  const [ai, setAi] = useState(INIT_AI);
  const [appearance, setAppearance] = useState(INIT_APPEARANCE);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/3 w-80 h-80 rounded-full bg-[#7c3aed]/7 blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-[#f59e0b]/4 blur-[100px]" />
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
            { icon: "🏠", label: "Dashboard", href: "/dashboard" },
            { icon: "➕", label: "New Task",  href: "/create" },
            { icon: "📅", label: "Calendar",  href: "/calendar" },
            { icon: "🔔", label: "Reminders", href: "/reminders" },
            { icon: "⚙️", label: "Settings",  href: "/settings", active: true },
          ].map(({ icon, label, href, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <span className="text-base">{icon}</span>{label}
            </Link>
          ))}
        </nav>

        {/* Settings sub-nav in sidebar */}
        <div className="px-3 pb-4 border-t border-white/5 pt-4 space-y-1">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 mb-2">Settings</p>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === key
                  ? "bg-white/8 text-white"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              <span className="text-sm">{icon}</span>{label}
            </button>
          ))}
        </div>

        <div className="px-4 pb-5 pt-3 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">JD</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile.name}</p>
            <p className="text-xs text-white/30 truncate">Free plan</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="lg:pl-60 relative z-10">

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all flex-shrink-0"
          >
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">Settings</h1>
            <p className="text-xs text-white/30">Manage your preferences</p>
          </div>
        </header>

        <main className="px-5 py-6 pb-28 lg:pb-10 max-w-2xl mx-auto">

          {/* Mobile tab bar */}
          <div className="flex gap-1 p-1 rounded-2xl border border-white/8 bg-white/[0.03] mb-6 overflow-x-auto lg:hidden">
            {TABS.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === key
                    ? "bg-[#a78bfa] text-white"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "profile" && (
            <ProfileTab
              data={profile}
              onChange={(k, v) => setProfile((p) => ({ ...p, [k]: v }))}
              onSave={() => showToast("✅ Profile saved")}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab
              data={notif}
              onChange={(k, v) => setNotif((p) => ({ ...p, [k]: v }))}
            />
          )}
          {activeTab === "ai" && (
            <AiTab
              data={ai}
              onChange={(k, v) => setAi((p) => ({ ...p, [k]: v }))}
            />
          )}
          {activeTab === "appearance" && (
            <AppearanceTab
              data={appearance}
              onChange={(k, v) => setAppearance((p) => ({ ...p, [k]: v }))}
            />
          )}
          {activeTab === "account" && (
            <AccountTab onToast={showToast} />
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon: "🏠", label: "Home",     href: "/dashboard" },
          { icon: "➕", label: "New",      href: "/create" },
          { icon: "📅", label: "Calendar", href: "/calendar" },
          { icon: "🔔", label: "Alerts",   href: "/reminders" },
          { icon: "⚙️", label: "Settings", href: "/settings", active: true },
        ].map(({ icon, label, href, active }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${active ? "text-[#a78bfa]" : "text-white/30 hover:text-white/60"}`}>
            <span className="text-xl">{icon}</span>{label}
          </Link>
        ))}
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#1a1a35] border border-white/15 text-white text-sm font-medium shadow-2xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}