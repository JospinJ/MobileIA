"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Role = "user" | "bot";
type Message = { id: string; role: Role; content: string };

const SUGGESTIONS = [
  "Quels sont vos services ?",
  "Comment fonctionne Mobile AI ?",
  "Comment vous contacter ?",
];

function formatText(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const isList = lines.every((line) => /^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line));
    if (isList && lines.length > 1) {
      return (
        <ul key={index}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{inline(line.replace(/^[-•*]\s+|^\d+[.)]\s+/, ""))}</li>
          ))}
        </ul>
      );
    }
    if (/^#{1,3}\s+/.test(block)) {
      return <h3 key={index}>{inline(block.replace(/^#{1,3}\s+/, ""))}</h3>;
    }
    return <p key={index}>{inline(block)}</p>;
  });
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export default function HomePage() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content:
        "Bonjour, je suis l’assistant **Mobile AI**. Posez une question sur l’entreprise, ses services ou son site.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("mobileai-session");
    const next = stored || `mobileai-${crypto.randomUUID()}`;
    sessionStorage.setItem("mobileai-session", next);
    setSessionId(next);
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading || !sessionId) return;

    setError("");
    setInput("");
    setLoading(true);
    const userId = crypto.randomUUID();
    const botId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: message },
      { id: botId, role: "bot", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Le chatbot n’a pas répondu.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type?: string; content?: string; message?: string };
          if (event.type === "item" && event.content) {
            assembled += event.content;
            setMessages((current) =>
              current.map((item) => (item.id === botId ? { ...item, content: assembled } : item)),
            );
          }
          if (event.type === "error") {
            throw new Error(event.message || "Erreur pendant la réponse.");
          }
        }
      }

      if (!assembled.trim()) {
        throw new Error("Réponse vide. Réessayez dans un instant.");
      }

      setMessages((current) =>
        current.map((item) => (item.id === botId ? { ...item, content: assembled } : item)),
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Impossible de joindre l’assistant.";
      setError(detail);
      setMessages((current) =>
        current.map((item) =>
          item.id === botId && !item.content
            ? { ...item, content: "Je n’ai pas pu répondre pour le moment." }
            : item,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  return (
    <main className="shell">
      <header className="header">
        <div className="avatar">MA</div>
        <div>
          <h1>Mobile AI</h1>
          <p>Assistant Mobile AI</p>
        </div>
        <div className="live">
          <span className="dot" />
          En ligne
        </div>
      </header>

      <div className="thread" ref={threadRef}>
        {messages.map((message) => (
          <div className={`row ${message.role}`} key={message.id}>
            {message.role === "bot" ? <div className="avatar">MA</div> : null}
            <div className="bubble">
              {loading && message.role === "bot" && !message.content && message.id === messages.at(-1)?.id ? (
                <span className="spinner" aria-label="Chargement" />
              ) : (
                <>
                  {message.content ? formatText(message.content) : null}
                  {loading && message.role === "bot" && message.id === messages.at(-1)?.id ? (
                    <span className="cursor" />
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {!messages.some((item) => item.role === "user") ? (
        <div className="suggestions">
          {SUGGESTIONS.map((item) => (
            <button className="chip" key={item} type="button" onClick={() => void send(item)}>
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <form className="composer" onSubmit={onSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Écrivez votre question…"
          rows={1}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Envoyer
        </button>
      </form>
    </main>
  );
}
