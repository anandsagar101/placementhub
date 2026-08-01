import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, Trash2, Loader2 } from "lucide-react";
import api, { API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const SUGGESTIONS = {
  student: ["How do I prepare for a technical interview?", "Review my resume tips", "Am I eligible for high-package roles?"],
  company: ["Write a job description for a Backend Engineer", "Best criteria to screen freshers?", "Tips for a campus hiring drive"],
  admin: ["How to improve our placement rate?", "Draft a message to unplaced students", "Explain these placement analytics"],
};

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-muted/60")}>
        {content || <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" /></span>}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); });
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      api.get("/chat/history").then(({ data }) => {
        setMessages(data.map((m) => ({ role: m.role, content: m.content })));
        setLoaded(true);
        scrollToBottom();
      }).catch(() => setLoaded(true));
    }
  }, [open, loaded, scrollToBottom]);

  useEffect(() => { if (open) scrollToBottom(); }, [messages, open, scrollToBottom]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("ph_token")}` },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.delta) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + payload.delta };
              return copy;
            });
          }
        }
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const clear = async () => {
    await api.delete("/chat/history");
    setMessages([]);
  };

  const suggestions = SUGGESTIONS[user?.role] || SUGGESTIONS.student;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="chat-toggle-btn"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[540px] w-[calc(100vw-3rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl animate-fade-up dark:bg-slate-900" data-testid="chat-panel">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <p className="font-heading text-sm font-semibold leading-tight">PlacementHub AI</p>
                <p className="text-[11px] opacity-80">Powered by Claude</p>
              </div>
            </div>
            <button onClick={clear} title="New chat" data-testid="chat-clear-btn" className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/15">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {!loaded ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
                <p className="font-heading font-semibold">How can I help?</p>
                <p className="mb-4 mt-1 text-xs text-muted-foreground">Ask me anything about placements & careers.</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} data-testid="chat-suggestion"
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              data-testid="chat-input"
              disabled={streaming}
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" disabled={streaming || !input.trim()} data-testid="chat-send-btn"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
