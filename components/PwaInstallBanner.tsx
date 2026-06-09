// components/PwaInstallBanner.tsx
"use client";

import { useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function PwaInstallBanner() {
  const { canInstall, isInstalled, isInstalling, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "dismissed") setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-50">
      <div className="rounded-2xl border border-[#a78bfa]/25 bg-[#0f0f24]/95 backdrop-blur-md shadow-2xl shadow-black/50 p-4 flex items-center gap-4">

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-[#7c3aed]/30">
          🔔
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Install NeverMiss</p>
          <p className="text-xs text-white/40 leading-relaxed">
            Add to your home screen for instant access & offline support.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap"
          >
            {isInstalling ? "Installing…" : "Install App"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors text-center"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}