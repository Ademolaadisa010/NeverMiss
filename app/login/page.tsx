"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  // Already logged in — go straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setError("");
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  // While checking auth state show spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Already authed — render nothing while redirect fires
  if (user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-[var(--font-sora)] flex items-center justify-center px-5">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#7c3aed]/10 blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-[#f59e0b]/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8 shadow-2xl shadow-black/40">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-3xl shadow-xl shadow-[#7c3aed]/30 mb-4">
              🔔
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
              Never<span className="text-[#a78bfa]">Miss</span>
            </h1>
            <p className="text-white/40 text-sm text-center leading-relaxed">
              Your AI-powered reminder assistant
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/25 font-medium">Continue with</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {signingIn ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              /* Google SVG icon */
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
              {signingIn ? "Signing in…" : "Continue with Google"}
            </span>
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Features list */}
          <div className="mt-8 space-y-2.5">
            {[
              "AI-guided task creation via voice or text",
              "Smart push notifications & reminders",
              "Recurring tasks with voice playback",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-[#a78bfa]" fill="none" viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="text-xs text-white/35 leading-relaxed">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/20 mt-5 leading-relaxed">
          By continuing you agree to our{" "}
          <span className="text-white/35 hover:text-white/50 cursor-pointer transition-colors">Terms</span>{" "}
          &{" "}
          <span className="text-white/35 hover:text-white/50 cursor-pointer transition-colors">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}