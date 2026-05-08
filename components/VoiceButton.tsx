"use client";

import { useRef, useState } from "react";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function toggle() {
    if (state === "recording") {
      recorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "audio.webm");
        try {
          const res = await fetch("/api/stt", { method: "POST", body: form });
          const { text } = await res.json();
          if (text) onTranscript(text);
        } catch {
          /* STT failed silently */
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setState("idle");
    }
  }

  const label = state === "recording" ? "⏹" : state === "processing" ? "⏳" : "🎤";
  const title =
    state === "idle" ? "탭하여 녹음 시작" :
    state === "recording" ? "탭하여 녹음 종료" : "인식 중...";

  return (
    <button
      onClick={state !== "processing" ? toggle : undefined}
      disabled={disabled || state === "processing"}
      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 transition-colors select-none ${
        state === "recording"
          ? "bg-red-500 text-white animate-pulse"
          : state === "processing"
          ? "bg-gray-300 text-gray-500"
          : "bg-gray-100 active:bg-gray-300 text-gray-600"
      }`}
      aria-label={title}
    >
      {label}
    </button>
  );
}
