import { NextRequest } from "next/server";
import { getSession, getSessionMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) return new Response("Not found", { status: 404 });
  const messages = getSessionMessages(id);
  return Response.json({ session, messages });
}
