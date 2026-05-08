import { redirect } from "next/navigation";
import { createSession } from "@/lib/db";

export default function Home() {
  const sessionId = createSession();
  redirect(`/chat/${sessionId}`);
}
