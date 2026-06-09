"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { updateProfile, updateEmail, signOut, deleteUser, sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────
type SettingsTab = "profile" | "notifications" | "account";

interface ProfileForm {
  name: string;
  email: string;
  timezone: string;
}

interface NotifSettings {
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  defaultReminder: string;
}

// ── Constants ─────────────────────────────────────────────
const TIMEZONES = [
  "Africa/Lagos","Africa/Accra","Africa/Nairobi","Africa/Cairo",
  "America/New_York","America/Chicago","America/Los_Angeles",
  "Europe/London","Europe/Paris","Asia/Dubai","Asia/Kolkata","Asia/Tokyo",
];
const REMINDER_OPTIONS = [
  "5 min before","15 min before","30 min before",
  "1 hour before","2 hours before","1 day before",
];
const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key:"profile",       label:"Profile",       icon:"👤" },
  { key:"notifications", label:"Notifications", icon:"🔔" },
  { key:"account",       label:"Account",       icon:"⚙️" },
];

// ── Reusable UI ───────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/8 bg-white/[0.03] p-5 ${className}`}>{children}</div>;
}
function Row({ children, border = true }: { children: React.ReactNode; border?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 py-3.5 ${border ? "border-b border-white/5 last:border-0" : ""}`}>{children}</div>;
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
    <button onClick={() => onChange(!checked)}
      className={`relative rounded-full transition-all duration-300 flex-shrink-0 ${checked ? "bg-[#a78bfa]" : "bg-white/15"}`}
      style={{ height:"22px", width:"40px" }}>
      <span className={`absolute top-0.5 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? "left-[18px]" : "left-[2px]"}`}
        style={{ width:"18px", height:"18px" }} />
    </button>
  );
}
function SelectInput({ value, onChange, options, className="" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a78bfa]/50 [color-scheme:dark] transition-colors ${className}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#a78bfa]/50 focus:bg-white/8 transition-all";

// ── Profile Tab ───────────────────────────────────────────
function ProfileTab({ user, onToast }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; onToast: (msg: string) => void }) {
  const [form, setForm] = useState<ProfileForm>({
    name: user.displayName ?? "",
    email: user.email ?? "",
    timezone: "Africa/Lagos",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved profile from Firestore
  useEffect(() => {
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          name: d.name ?? user.displayName ?? "",
          email: d.email ?? user.email ?? "",
          timezone: d.timezone ?? "Africa/Lagos",
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update Firebase Auth display name
      await updateProfile(auth.currentUser!, { displayName: form.name });
      // Update email if changed
      if (form.email !== user.email) {
        await updateEmail(auth.currentUser!, form.email);
      }
      // Save to Firestore users collection
      await setDoc(doc(db, "users", user.uid), {
        name: form.name,
        email: form.email,
        timezone: form.timezone,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      onToast("✅ Profile saved successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save profile";
      onToast(`❌ ${msg.includes("requires-recent-login") ? "Please sign out and sign in again to change email" : msg}`);
    } finally {
      setSaving(false);
    }
  };

  const initials = form.name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0,2) || "U";

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-white">Your Profile</h2>
        <p className="text-xs text-white/35 mt-0.5">Update your name, email, and timezone.</p>
      </div>

      {/* Avatar card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="avatar" referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-[#7c3aed]/25">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#0a0a1a]" title="Signed in with Google" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{form.name}</p>
            <p className="text-xs text-white/40">{form.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">Free Plan</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Google</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Fields */}
      <Card>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Full Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Email</label>
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
            <p className="text-[10px] text-white/25">Changing email requires recent sign-in.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Timezone</label>
            <SelectInput value={form.timezone} onChange={(v) => setForm((p) => ({ ...p, timezone: v }))}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g," ") }))} className="w-full" />
          </div>
        </div>
      </Card>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#7c3aed]/20 disabled:opacity-60 flex items-center justify-center gap-2">
        {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save Profile"}
      </button>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────
function NotificationsTab({ userId, onToast }: { userId: string; onToast: (msg: string) => void }) {
  const [settings, setSettings] = useState<NotifSettings>({
    pushEnabled: false,
    quietHoursEnabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
    defaultReminder: "30 min before",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "users", userId)).then((snap) => {
      if (snap.exists() && snap.data().notifications) {
        setSettings((p) => ({ ...p, ...snap.data().notifications }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const set = <K extends keyof NotifSettings>(k: K, v: NotifSettings[K]) =>
    setSettings((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "users", userId), { notifications: settings }, { merge: true });
      onToast("✅ Notification settings saved");
    } catch { onToast("❌ Failed to save settings"); }
    finally { setSaving(false); }
  };

  const handleEnablePush = () => {
    if (!("Notification" in window)) { onToast("Push not supported in this browser"); return; }
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        set("pushEnabled", true);
        onToast("🔔 Push notifications enabled!");
      } else {
        onToast("Notifications blocked — check browser settings");
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-white">Notifications</h2>
        <p className="text-xs text-white/35 mt-0.5">Control how and when NeverMiss alerts you.</p>
      </div>

      {/* Push */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Push Notifications</p>
        <Row>
          <Label title="Push Notifications" sub="Get notified even when the app is closed" />
          {settings.pushEnabled ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-semibold">Active</span>
            </div>
          ) : (
            <button onClick={handleEnablePush}
              className="px-3 py-1.5 rounded-lg bg-[#a78bfa]/15 border border-[#a78bfa]/30 text-[#a78bfa] text-xs font-semibold hover:bg-[#a78bfa]/25 transition-colors flex-shrink-0">
              Enable
            </button>
          )}
        </Row>
      </Card>

      {/* Default reminder */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Defaults</p>
        <Row border={false}>
          <Label title="Default Reminder" sub="Applied when no reminder is specified on a task" />
          <SelectInput value={settings.defaultReminder} onChange={(v) => set("defaultReminder", v)}
            options={REMINDER_OPTIONS.map((o) => ({ value:o, label:o }))} />
        </Row>
      </Card>

      {/* Quiet hours */}
      <Card>
        <Row border={!settings.quietHoursEnabled}>
          <Label title="Quiet Hours" sub="Silence all reminders during set hours" />
          <Toggle checked={settings.quietHoursEnabled} onChange={(v) => set("quietHoursEnabled", v)} />
        </Row>
        {settings.quietHoursEnabled && (
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/35 font-medium">From</label>
              <input type="time" value={settings.quietStart} onChange={(e) => set("quietStart", e.target.value)}
                className={`${inputCls} [color-scheme:dark]`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/35 font-medium">Until</label>
              <input type="time" value={settings.quietEnd} onChange={(e) => set("quietEnd", e.target.value)}
                className={`${inputCls} [color-scheme:dark]`} />
            </div>
          </div>
        )}
      </Card>

      {/* Premium */}
      <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚡</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-[#f59e0b] mb-1">Premium — Email Reminders</p>
          <p className="text-xs text-white/35 leading-relaxed mb-3">Get email reminders, daily digests, and priority alerts with a Premium plan.</p>
          <button className="px-4 py-1.5 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-bold hover:bg-[#f59e0b]/30 transition-colors">
            Upgrade Now →
          </button>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#7c3aed]/20 disabled:opacity-60 flex items-center justify-center gap-2">
        {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save Settings"}
      </button>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────
function AccountTab({ user, onToast }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; onToast: (msg: string) => void }) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      onToast("📧 Password reset email sent");
    } catch { onToast("❌ Failed to send reset email"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const q = query(collection(db, "tasks"), where("userId","==",user.uid));
      const snap = await getDocs(q);
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "nevermiss-tasks.json"; a.click();
      URL.revokeObjectURL(url);
      onToast("📦 Tasks exported successfully");
    } catch { onToast("❌ Export failed"); }
    finally { setExporting(false); }
  };

  const handleClearTasks = async () => {
    try {
      const q = query(collection(db, "tasks"), where("userId","==",user.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      onToast("🗑️ All tasks cleared");
    } catch { onToast("❌ Failed to clear tasks"); }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      // Delete all tasks
      const q = query(collection(db, "tasks"), where("userId","==",user.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      // Delete user profile doc
      await deleteDoc(doc(db, "users", user.uid));
      // Delete Firebase Auth user
      await deleteUser(auth.currentUser!);
      router.replace("/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      onToast(`❌ ${msg.includes("requires-recent-login") ? "Please sign out and sign in again before deleting" : msg}`);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-white">Account</h2>
        <p className="text-xs text-white/35 mt-0.5">Manage your plan, data, and security.</p>
      </div>

      {/* Plan */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Current Plan</p>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Free Plan</p>
            <p className="text-xs text-white/35">Push notifications · AI mode · Voice assistant</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">Active</span>
        </div>
        <div className="rounded-xl border border-[#f59e0b]/25 bg-gradient-to-r from-[#f59e0b]/10 to-transparent p-4">
          <p className="text-sm font-bold text-[#f59e0b] mb-1">⚡ Premium Plan</p>
          <p className="text-xs text-white/40 leading-relaxed mb-3">Email reminders · Advanced scheduling · Priority AI</p>
          <button className="w-full py-2.5 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#f59e0b] text-sm font-bold hover:bg-[#f59e0b]/30 transition-colors">
            Upgrade to Premium →
          </button>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Security</p>
        <Row>
          <Label title="Reset Password" sub="Send a password reset link to your email" />
          <button onClick={handlePasswordReset}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all flex-shrink-0">
            Send Email
          </button>
        </Row>
        <Row border={false}>
          <Label title="Sign Out" sub="Log out of your account on this device" />
          <button onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-red-500/30 hover:text-red-400 transition-all flex-shrink-0">
            Sign Out
          </button>
        </Row>
      </Card>

      {/* Data */}
      <Card>
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Your Data</p>
        <Row>
          <Label title="Export Tasks" sub="Download all your tasks as a JSON file" />
          <button onClick={handleExport} disabled={exporting}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-[#a78bfa]/30 hover:text-[#a78bfa] transition-all flex-shrink-0 disabled:opacity-50">
            {exporting ? "…" : "Export"}
          </button>
        </Row>
        <Row border={false}>
          <Label title="Clear All Tasks" sub="Permanently delete all your tasks" />
          <button onClick={handleClearTasks}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-semibold hover:border-red-500/30 hover:text-red-400 transition-all flex-shrink-0">
            Clear
          </button>
        </Row>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/15">
        <p className="text-xs font-bold text-red-400/60 uppercase tracking-wider mb-1">Danger Zone</p>
        <Row border={false}>
          <Label title="Delete Account" sub="Permanently delete your account and all data. Cannot be undone." />
          <button onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400/70 text-xs font-semibold hover:bg-red-500/10 hover:text-red-400 transition-all flex-shrink-0">
            Delete
          </button>
        </Row>
      </Card>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0f0f24] p-6 z-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mb-4">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-1">Delete Account?</h3>
            <p className="text-white/40 text-sm mb-4 leading-relaxed">
              This will permanently delete your account and all tasks. Type <span className="text-red-400 font-bold">DELETE</span> to confirm.
            </p>
            <input className={`${inputCls} mb-4`} placeholder="Type DELETE to confirm"
              value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:text-white/70 transition-all">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteInput !== "DELETE" || deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                {deleting ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Deleting…</> : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settings Content ──────────────────────────────────────
function SettingsContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/3 w-80 h-80 rounded-full bg-[#7c3aed]/7 blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-[#f59e0b]/4 blur-[100px]" />
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
            { icon:"📅", label:"Calendar",  href:"/calendar" },
            { icon:"🔔", label:"Reminders", href:"/reminders" },
            { icon:"⚙️", label:"Settings",  href:"/settings", active:true },
          ].map(({ icon, label, href, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <span className="text-base">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        {/* Settings sub-nav */}
        <div className="px-3 pb-4 border-t border-white/5 pt-4 space-y-1">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 mb-2">Settings</p>
          {TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${activeTab === key ? "bg-white/8 text-white" : "text-white/30 hover:text-white/60 hover:bg-white/5"}`}>
              <span className="text-sm">{icon}</span>{label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-5 pt-3 border-t border-white/5 flex items-center gap-3">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="avatar" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.displayName?.[0] ?? "U"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.displayName ?? "User"}</p>
            <p className="text-xs text-white/30 truncate">Free plan</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-60 relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all flex-shrink-0">←</Link>
          <div>
            <h1 className="text-base font-bold text-white">Settings</h1>
            <p className="text-xs text-white/30">Manage your preferences</p>
          </div>
        </header>

        <main className="px-5 py-6 pb-28 lg:pb-10 max-w-2xl mx-auto">
          {/* Mobile tabs */}
          <div className="flex gap-1 p-1 rounded-2xl border border-white/8 bg-white/[0.03] mb-6 overflow-x-auto lg:hidden">
            {TABS.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === key ? "bg-[#a78bfa] text-white" : "text-white/35 hover:text-white/60"}`}>
                <span>{icon}</span><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {activeTab === "profile"       && <ProfileTab user={user} onToast={showToast} />}
          {activeTab === "notifications" && <NotificationsTab userId={user.uid} onToast={showToast} />}
          {activeTab === "account"       && <AccountTab user={user} onToast={showToast} />}
        </main>
      </div>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/5 bg-[#0d0d20]/90 backdrop-blur-md flex items-center justify-around px-4 py-3">
        {[
          { icon:"🏠", label:"Home",     href:"/dashboard" },
          { icon:"➕", label:"New",      href:"/create" },
          { icon:"📅", label:"Calendar", href:"/calendar" },
          { icon:"🔔", label:"Alerts",   href:"/reminders" },
          { icon:"⚙️", label:"Settings", href:"/settings", active:true },
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

export default function SettingsPage() {
  return <AuthGuard><SettingsContent /></AuthGuard>;
}