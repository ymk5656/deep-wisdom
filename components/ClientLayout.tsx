"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SessionSidebar from "./SessionSidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function newSession() {
    setCreating(true);
    try {
      const res = await fetch("/api/session", { method: "POST" });
      const { sessionId } = await res.json();
      setOpen(false);
      router.push(`/chat/${sessionId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-30 transition-transform duration-200 md:translate-x-0 md:visible ${
          open ? "translate-x-0 visible" : "-translate-x-full invisible"
        }`}
      >
        <SessionSidebar onNewSession={newSession} onClose={() => setOpen(false)} creating={creating} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 bg-gray-900 text-white px-4 py-3 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-xl leading-none p-1"
            aria-label="메뉴 열기"
          >
            ☰
          </button>
          <span className="flex-1 text-sm font-semibold tracking-wide">Deep Wisdom</span>
          <button
            onClick={newSession}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {creating ? "…" : "+ 새 세션"}
          </button>
        </div>

        {/* Wrapper ensures children get the REMAINING height, not the full parent height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}
