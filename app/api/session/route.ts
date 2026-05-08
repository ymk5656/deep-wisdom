import { NextRequest } from "next/server";
import { createSession, listSessions } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const sessions = await listSessions();
  return Response.json(sessions);
}

export async function POST(_req: NextRequest) {
  const sessionId = await createSession();
  return Response.json({ sessionId });
}
