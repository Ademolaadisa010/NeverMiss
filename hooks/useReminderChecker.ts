

"use client";

import { useEffect, useRef, useCallback } from "react";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useVoiceReminder } from "./useVoiceReminder";

interface Task {
  id: string;
  title: string;
  description?: string;
  rawDate: string;     // YYYY-MM-DD
  time: string;        // HH:MM
  reminderBefore: string;
  priority: "high" | "medium" | "low";
  category: string;
  recurring?: string;
  status: string;
  reminderStatus?: string;
  userId: string;
}

// ── Calculate the exact minute a reminder should fire ────
function getReminderFireTime(rawDate: string, time: string, reminderBefore: string): Date {
  const [h, m] = time.split(":").map(Number);
  const base = new Date(rawDate + "T00:00:00");
  base.setHours(h, m, 0, 0);

  const offsets: Record<string, number> = {
    "5 min before":   5,
    "15 min before":  15,
    "30 min before":  30,
    "1 hour before":  60,
    "2 hours before": 120,
    "1 day before":   1440,
  };
  const mins = offsets[reminderBefore] ?? 30;
  base.setMinutes(base.getMinutes() - mins);
  return base;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Hook ─────────────────────────────────────────────────
export function useReminderChecker(userId: string | null) {
  const { speak } = useVoiceReminder();
  const firedRef = useRef<Set<string>>(new Set()); // track already-fired reminder IDs this session

  const checkReminders = useCallback(async () => {
    if (!userId) return;

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    try {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", userId),
        where("status", "in", ["today", "upcoming"]),
      );
      const snap = await getDocs(q);

      for (const d of snap.docs) {
        const task = { id: d.id, ...d.data() } as Task;

        // Skip already dismissed/snoozed/fired this session
        if (task.reminderStatus === "dismissed") continue;
        if (firedRef.current.has(task.id)) continue;

        const fireTime = getReminderFireTime(task.rawDate, task.time, task.reminderBefore);
        const fireMins = fireTime.getHours() * 60 + fireTime.getMinutes();

        // Check if today and within the current minute window
        const isToday = fireTime.toDateString() === now.toDateString();
        const isNow = isToday && Math.abs(fireMins - nowMins) <= 1;

        if (!isNow) continue;

        // Mark as fired for this session
        firedRef.current.add(task.id);

        // 1️⃣ Speak the AI-generated reminder
        speak({
          title: task.title,
          time: formatTime(task.time),
          reminderBefore: task.reminderBefore,
          category: task.category,
          priority: task.priority,
          recurring: task.recurring,
        });

        // 2️⃣ Show browser push notification
        if ("Notification" in window && Notification.permission === "granted") {
          const notification = new Notification(`🔔 ${task.title}`, {
            body: `${task.reminderBefore} · ${formatTime(task.time)}`,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            tag: task.id, // prevents duplicate notifications
            requireInteraction: task.priority === "high", // stays until dismissed for high priority
          });

          notification.onclick = () => {
            window.focus();
            window.location.href = "/reminders";
            notification.close();
          };
        }

        // 3️⃣ Update Firestore — mark reminderStatus as fired
        await updateDoc(doc(db, "tasks", task.id), { reminderStatus: "fired" });
      }
    } catch (e) {
      console.error("Reminder check failed:", e);
    }
  }, [userId, speak]);

  useEffect(() => {
    if (!userId) return;

    // Run immediately on mount, then every 60 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, [userId, checkReminders]);
}