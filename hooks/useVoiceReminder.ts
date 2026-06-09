// hooks/useVoiceReminder.ts
// AI generates a unique friendly reminder message, then speaks it via Web Speech API

"use client";

import { useCallback, useRef } from "react";

interface ReminderContext {
  title: string;
  time: string;        // "9:00 AM"
  reminderBefore: string; // "30 min before"
  category: string;
  priority: "high" | "medium" | "low";
  recurring?: string;
}

// ── Personality pools ────────────────────────────────────
// The AI picks from these to build varied, friendly messages

const OPENERS: Record<string, string[]> = {
  high: [
    "🚨 Heads up!",
    "Hey, this one's important —",
    "Don't forget —",
    "Quick urgent reminder:",
    "Time to get ready —",
  ],
  medium: [
    "👋 Just a heads up —",
    "Hey there!",
    "Friendly reminder:",
    "Psst —",
    "Just checking in —",
  ],
  low: [
    "Hey, no rush but —",
    "When you get a moment —",
    "Gentle reminder:",
    "Just a little nudge —",
    "FYI —",
  ],
};

const CATEGORY_CONTEXT: Record<string, string[]> = {
  Work: [
    "your work task is coming up",
    "you've got something on the work front",
    "a work commitment is approaching",
  ],
  Health: [
    "time to take care of yourself",
    "your health appointment is near",
    "this one's for your wellbeing",
  ],
  Finance: [
    "a financial task needs attention",
    "don't let this money matter slip",
    "a finance reminder is here",
  ],
  Personal: [
    "you've got something personal coming up",
    "a personal task is approaching",
  ],
  Education: [
    "time to keep learning",
    "an education task is coming up",
  ],
  Other: [
    "something on your list is coming up",
    "a task needs your attention",
  ],
};

const TIME_PHRASES: Record<string, string[]> = {
  "5 min before":   ["in just 5 minutes", "very soon — 5 minutes away", "starting in 5"],
  "15 min before":  ["in 15 minutes", "about 15 minutes from now", "coming up in a quarter hour"],
  "30 min before":  ["in 30 minutes", "half an hour from now", "in about 30 minutes"],
  "1 hour before":  ["in an hour", "one hour from now", "about an hour away"],
  "2 hours before": ["in 2 hours", "a couple of hours from now", "2 hours out"],
  "1 day before":   ["tomorrow", "coming up tomorrow", "just one day away"],
};

const CLOSERS: Record<string, string[]> = {
  high: [
    "You've got this — stay focused!",
    "Make sure you're prepared!",
    "This one matters — don't miss it!",
    "You're on top of it!",
  ],
  medium: [
    "You've got this!",
    "Have a great time!",
    "All the best!",
    "You're all set!",
  ],
  low: [
    "No pressure — just wanted to let you know!",
    "Hope it goes well!",
    "Take your time and enjoy!",
    "Just a little reminder from me to you!",
  ],
};

const RECURRING_PHRASES = [
  "As always",
  "Like usual",
  "As part of your routine",
  "Keeping up the streak",
];

// ── Helpers ───────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMessage(ctx: ReminderContext): string {
  const opener    = pick(OPENERS[ctx.priority] ?? OPENERS.medium);
  const catCtx    = pick(CATEGORY_CONTEXT[ctx.category] ?? CATEGORY_CONTEXT.Other);
  const timePhrase = pick(TIME_PHRASES[ctx.reminderBefore] ?? [`in ${ctx.reminderBefore}`]);
  const closer    = pick(CLOSERS[ctx.priority] ?? CLOSERS.medium);
  const recurringPrefix = ctx.recurring && ctx.recurring !== "None"
    ? `${pick(RECURRING_PHRASES)}, `
    : "";

  // Build message with slight variation patterns
  const pattern = Math.floor(Math.random() * 4);

  switch (pattern) {
    case 0:
      return `${opener} ${recurringPrefix}${catCtx}. "${ctx.title}" is ${timePhrase}, at ${ctx.time}. ${closer}`;
    case 1:
      return `${opener} "${ctx.title}" — ${recurringPrefix}${timePhrase}. That's at ${ctx.time}. ${closer}`;
    case 2:
      return `${opener} ${recurringPrefix}it's almost time for "${ctx.title}". Starting ${timePhrase} at ${ctx.time}. ${closer}`;
    case 3:
    default:
      return `${opener} ${recurringPrefix}${catCtx} — "${ctx.title}" at ${ctx.time}, ${timePhrase}. ${closer}`;
  }
}

// ── Hook ─────────────────────────────────────────────────
export function useVoiceReminder() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((ctx: ReminderContext): string => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return "";

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const message = generateMessage(ctx);
    const utterance = new SpeechSynthesisUtterance(message);

    // Pick a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Karen")
    ) ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
    if (preferred) utterance.voice = preferred;

    // Natural settings
    utterance.rate   = 0.92;  // slightly slower than default — warm, not rushed
    utterance.pitch  = ctx.priority === "high" ? 1.1 : 1.0;
    utterance.volume = 1;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    return message;
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
  }, []);

  const isSpeaking = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.speechSynthesis.speaking;
  }, []);

  return { speak, stop, isSpeaking };
}