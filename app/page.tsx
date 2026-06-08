// app/page.tsx  (landing page — redirects to dashboard if already signed in)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <main className="flex flex-col min-h-screen font-[var(--font-sora)] overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-[#0a0a1a]/70 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          <span className="font-bold text-lg tracking-tight text-white">
            Never<span className="text-[#a78bfa]">Miss</span>
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold px-5 py-2 rounded-full bg-[#a78bfa] text-[#0a0a1a] hover:bg-[#c4b5fd] transition-colors"
        >
          Get Started
        </Link>
      </nav>

      {/* ══ SECTION 1 — HERO ══ */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-screen px-6 pt-24 pb-16 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#a78bfa]/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full bg-[#f59e0b]/8 blur-[100px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#c4b5fd] text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" />
          AI-Powered Reminder Assistant
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-white max-w-3xl mb-6">
          Never Miss{" "}
          <span className="relative inline-block">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#f59e0b]">
              What Matters
            </span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 8" fill="none">
              <path d="M1 5.5 C50 1, 100 7, 150 4 S250 1, 299 5" stroke="url(#ug)" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/50 max-w-xl leading-relaxed mb-10">
          Speak or type naturally. Our AI understands, structures your tasks, and reminds you at exactly the right time — with a voice.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[#7c3aed]/30"
          >
            Start for Free
          </Link>
          <Link
            href="#how-it-works"
            className="px-8 py-3.5 rounded-full border border-white/10 text-white/70 font-semibold text-sm hover:border-white/25 hover:text-white transition-colors"
          >
            See How It Works ↓
          </Link>
        </div>

        {/* Floating preview card */}
        <div className="relative mt-16 w-full max-w-sm mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 text-left shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#a78bfa]/20 flex items-center justify-center text-sm">🤖</div>
              <span className="text-sm text-white/60 font-medium">AI Assistant</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-3">
              "Got it! I'll remind you about your{" "}
              <span className="text-[#a78bfa] font-semibold">team meeting</span> tomorrow at{" "}
              <span className="text-[#f59e0b] font-semibold">9:00 AM</span>, 30 minutes before."
            </p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-white/5">
                <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f59e0b]" />
              </div>
              <span className="text-xs text-white/30">Saving…</span>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-[#1e1b4b] border border-[#a78bfa]/30 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2 text-xs text-white/70">
            <span>🔔</span> Reminder set!
          </div>
        </div>
      </section>

      {/* ══ SECTION 2 — HOW IT WORKS ══ */}
      <section id="how-it-works" className="relative py-24 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#a78bfa]/3 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#a78bfa] text-sm font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Three steps to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#f59e0b]">
                zero forgotten tasks
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: "🎙️", title: "Speak or Type", desc: "Tell the AI your task naturally — no forms. Just say \"Remind me about my dentist appointment on Friday at 3pm.\"", color: "from-[#a78bfa]/20 to-[#7c3aed]/5", border: "border-[#a78bfa]/20" },
              { step: "02", icon: "🧠", title: "AI Structures It", desc: "NeverMiss extracts the task, date, time, and recurrence — then confirms with you before saving.", color: "from-[#f59e0b]/20 to-[#d97706]/5", border: "border-[#f59e0b]/20" },
              { step: "03", icon: "🔔", title: "Get Reminded", desc: "Receive a push notification and hear the AI read your reminder aloud — right when you need it.", color: "from-[#34d399]/20 to-[#059669]/5", border: "border-[#34d399]/20" },
            ].map(({ step, icon, title, desc, color, border }) => (
              <div key={step} className={`relative rounded-2xl border ${border} bg-gradient-to-br ${color} p-6 hover:-translate-y-1 transition-transform duration-300`}>
                <span className="absolute top-4 right-5 text-xs font-bold opacity-20 text-white">{step}</span>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 bg-white/5">{icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 3 — CTA ══ */}
      <section className="relative py-24 px-6 md:px-12 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-[#7c3aed]/10 blur-[140px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <span className="text-4xl mb-6 block">🚀</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            Ready to stop forgetting?
          </h2>
          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            Join users who trust NeverMiss to keep their day on track — for free.
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold text-base hover:opacity-90 transition-opacity shadow-2xl shadow-[#7c3aed]/40"
          >
            Get Started — It's Free
          </Link>
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/30">
            <span className="flex items-center gap-1.5"><span className="text-[#a78bfa]">✓</span> No credit card</span>
            <span className="flex items-center gap-1.5"><span className="text-[#a78bfa]">✓</span> Works on any device</span>
            <span className="flex items-center gap-1.5"><span className="text-[#a78bfa]">✓</span> AI-powered free</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-white/20 text-sm">
        © {new Date().getFullYear()} NeverMiss. Built to keep you on track.
      </footer>
    </main>
  );
}