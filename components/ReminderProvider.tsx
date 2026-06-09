// components/ReminderProvider.tsx
// Wrap this around your app in layout.tsx — it silently runs
// the reminder checker in the background for logged-in users

"use client";

import { useAuth } from "@/context/AuthContext";
import { useReminderChecker } from "@/hooks/useReminderChecker";
import PwaInstallBanner from "./PwaInstallBanner";

function ReminderEngine() {
  const { user } = useAuth();
  // Runs in background — no UI, just checks reminders every minute
  useReminderChecker(user?.uid ?? null);
  return null;
}

export default function ReminderProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReminderEngine />
      {children}
      <PwaInstallBanner />
    </>
  );
}