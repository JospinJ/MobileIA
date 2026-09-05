export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DJANGO_STREAM =
  process.env.DJANGO_CHAT_STREAM_URL ||
  "https://rag-platform-backend-qt2l.onrender.com/api/v1/chat/stream/";

export async function POST(request: Request) {
  const apiKey = process.env.MOBILEAI_API_KEY?.trim() || "";
  if (!apiKey.startsWith("pk_live_")) {
    return Response.json(
      { detail: "MOBILEAI_API_KEY n’est pas configurée sur le serveur." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  const sessionId = String(body.session_id || `mobileai-${Date.now()}`).slice(0, 128);

  if (!message) {
    return Response.json({ detail: "Écrivez un message." }, { status: 400 });
  }

  const upstream = await fetch(DJANGO_STREAM, {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      "Accept-Encoding": "identity",
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      language: "fr",
    }),
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const payload = await upstream.json().catch(() => ({}));
    return Response.json(
      { detail: payload.detail || "Le chatbot est momentanément indisponible." },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
