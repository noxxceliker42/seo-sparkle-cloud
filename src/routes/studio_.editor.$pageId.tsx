import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/studio_/editor/$pageId")({
  component: StudioEditorPage,
  head: () => ({
    meta: [{ title: "Seiten-Editor – SEO-OS v3.1" }],
  }),
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  changeSummary?: string;
  tokensUsed?: number;
}

interface PageData {
  id: string;
  keyword: string;
  page_type: string | null;
  html_output: string | null;
  body_content: string | null;
  css_block: string | null;
  status: string | null;
  qa_score: number | null;
  firm_id: string | null;
}

const EXAMPLE_CHIPS = [
  "Hero-Section vergrößern",
  "CTA-Button auffälliger",
  "Farbschema zu Dunkelblau ändern",
  "FAQ-Sektion ergänzen",
  "Telefonnummer prominenter",
  "Animationen hinzufügen",
  "Preistabelle anpassen",
  "Trust-Badges einfügen",
  "Footer modernisieren",
  "Schrift zu Playfair Display ändern",
];

function StudioEditorPage() {
  const { pageId } = Route.useParams();

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalHtml, setOriginalHtml] = useState("");
  const [currentHtml, setCurrentHtml] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewWidth, setPreviewWidth] = useState("100%");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isProcessingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load page
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("seo_pages")
        .select("id, keyword, page_type, html_output, body_content, css_block, status, qa_score, firm_id")
        .eq("id", pageId)
        .maybeSingle();
      if (error) {
        console.error("Editor Query Error:", error);
        toast.error("Seite konnte nicht geladen werden: " + error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        toast.error("Seite nicht gefunden");
        setLoading(false);
        return;
      }
      const pageData = data as unknown as PageData;
      setPage(pageData);
      if (pageData.html_output) {
        setOriginalHtml(pageData.html_output);
        setCurrentHtml(pageData.html_output);
        setHistory([pageData.html_output]);
        setHistoryIndex(0);
      }
      setLoading(false);
    })();
  }, [pageId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Navigation warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleSend = useCallback(async () => {
    const command = input.trim();
    if (!command || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setInput("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: command,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("studio-editor", {
        body: {
          currentHtml: currentHtml,
          userCommand: command,
          pageContext: {
            keyword: page?.keyword || "",
            pageType: page?.page_type || "",
          },
          chatHistory: messages.slice(-4),
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Unbekannter Fehler");

      const newHtml = data.html;
      setCurrentHtml(newHtml);
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newHtml);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
      setHasUnsavedChanges(true);

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Änderung angewendet ✅",
        changeSummary: data.changes || "",
        tokensUsed: data.tokensUsed || 0,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      toast.success("Seite aktualisiert");
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Fehler: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error(err.message);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [input, currentHtml, page, messages, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentHtml(history[newIndex]);
      setHasUnsavedChanges(history[newIndex] !== originalHtml);
      toast.info("Rückgängig gemacht");
    }
  }, [historyIndex, history, originalHtml]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentHtml(history[newIndex]);
      setHasUnsavedChanges(true);
      toast.info("Wiederhergestellt");
    }
  }, [historyIndex, history]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    const bodyMatch = currentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const styleMatches = [...currentHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    const extractedBody = bodyMatch?.[1]?.trim() || "";
    const extractedCss = styleMatches.length > 0
      ? `<style>\n${styleMatches.map((m) => m[1]).join("\n")}\n</style>`
      : "";

    const { error } = await supabase
      .from("seo_pages")
      .update({
        html_output: currentHtml,
        body_content: extractedBody,
        css_block: extractedCss,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pageId);

    if (error) {
      toast.error("Speichern fehlgeschlagen: " + error.message);
      return;
    }

    setOriginalHtml(currentHtml);
    setHasUnsavedChanges(false);
    toast.success("Seite gespeichert ✅");
  }, [hasUnsavedChanges, currentHtml, pageId]);

  const handleReset = useCallback(() => {
    if (!window.confirm("Alle Änderungen verwerfen und zur Originalversion zurückkehren?")) return;
    setCurrentHtml(originalHtml);
    setHistory([originalHtml]);
    setHistoryIndex(0);
    setMessages([]);
    setHasUnsavedChanges(false);
    toast.info("Zurückgesetzt auf Original");
  }, [originalHtml]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === "z" && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, handleSave]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", color: "var(--text)" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!page?.html_output) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", color: "var(--text)", gap: 16 }}>
        <p style={{ fontFamily: "Rajdhani", fontSize: 16, color: "var(--text-dim)" }}>
          Diese Seite wurde noch nicht generiert. Bitte zuerst eine Seite generieren.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">← Zurück</Link>
        </Button>
      </div>
    );
  }

  const isLongPage = currentHtml.length > 100000;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ color: "var(--text-dim)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: "Rajdhani", fontSize: 14 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Zurück
          </Link>
          <h1 style={{ fontFamily: "Orbitron", fontSize: 14, color: "var(--accent)", margin: 0 }}>
            Seiten-Editor: {page.keyword}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasUnsavedChanges && (
            <span style={{ color: "var(--yellow, #eab308)", fontSize: 12, fontFamily: "Rajdhani" }}>● Ungespeichert</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            style={{
              background: hasUnsavedChanges ? "var(--green, #22c55e)" : "var(--bg3)",
              color: hasUnsavedChanges ? "#050810" : "var(--text-dim)",
              border: "none", borderRadius: 6, padding: "6px 16px",
              fontFamily: "Rajdhani", fontWeight: 600,
              cursor: hasUnsavedChanges ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <Save style={{ width: 14, height: 14 }} /> Speichern
          </button>
        </div>
      </div>

      {/* MAIN SPLIT */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* PREVIEW */}
        <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", position: "relative" }}>
          {isProcessing && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(5,8,16,0.6)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
                <span style={{ fontFamily: "Rajdhani", color: "var(--accent)", fontSize: 14 }}>Änderung wird angewendet...</span>
              </div>
            </div>
          )}
          {isLongPage && messages.length === 0 && (
            <div style={{ padding: "8px 16px", background: "rgba(234,179,8,0.1)", borderBottom: "1px solid rgba(234,179,8,0.3)", fontFamily: "Rajdhani", fontSize: 13, color: "#eab308" }}>
              ⚠️ Diese Seite ist sehr lang ({Math.round(currentHtml.length / 1000)}k Zeichen). Änderungen können länger dauern.
            </div>
          )}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", background: "var(--bg2, #0a0d14)", overflow: "auto", padding: 16 }}>
            <iframe
              srcDoc={currentHtml}
              style={{ width: previewWidth, maxWidth: "100%", height: "100%", border: "1px solid var(--border)", borderRadius: 4, background: "#fff" }}
              title="Live Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>

        {/* CHAT PANEL */}
        <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", background: "var(--panel)", borderLeft: "1px solid var(--border)" }}>
          {/* Chat Header */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontFamily: "Orbitron", color: "var(--accent)", fontSize: 14, margin: 0 }}>✏️ SEITEN-EDITOR</h3>
            <p style={{ fontFamily: "Rajdhani", color: "var(--text-dim)", fontSize: 13, margin: "4px 0 0" }}>
              {page.keyword} · {page.page_type}
            </p>
          </div>

          {/* Example Chips */}
          {messages.length === 0 && (
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setInput(chip)}
                  style={{
                    background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.2)",
                    borderRadius: 9999, padding: "4px 12px", color: "var(--accent)",
                    cursor: "pointer", fontFamily: "Rajdhani", fontSize: 13, transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => { (e.target as HTMLElement).style.background = "rgba(0,200,255,0.15)"; }}
                  onMouseOut={(e) => { (e.target as HTMLElement).style.background = "rgba(0,200,255,0.08)"; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{
                  background: msg.role === "user" ? "rgba(0,200,255,0.1)" : "var(--bg3)",
                  border: `1px solid ${msg.role === "user" ? "rgba(0,200,255,0.2)" : "var(--border)"}`,
                  borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  padding: "10px 14px", color: "var(--text)", fontFamily: "Rajdhani", fontSize: 14,
                }}>
                  {msg.content}
                  {msg.changeSummary && (
                    <div style={{ marginTop: 8, background: "var(--bg2)", borderLeft: "2px solid var(--accent)", padding: "8px 12px", borderRadius: "0 4px 4px 0", fontSize: 13, color: "var(--text-dim)", whiteSpace: "pre-line" }}>
                      {msg.changeSummary}
                    </div>
                  )}
                  {msg.tokensUsed ? (
                    <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
                      {msg.tokensUsed.toLocaleString()} Tokens
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div style={{ alignSelf: "flex-start", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "12px 12px 12px 4px", padding: "10px 18px", display: "flex", gap: 4 }}>
                <span className="typing-dot" style={{ animationDelay: "0s" }}>●</span>
                <span className="typing-dot" style={{ animationDelay: "0.2s" }}>●</span>
                <span className="typing-dot" style={{ animationDelay: "0.4s" }}>●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Beschreibe die Änderung..."
              disabled={isProcessing}
              style={{
                flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 12px", color: "var(--text)",
                fontFamily: "Rajdhani", fontSize: 14, resize: "none",
                minHeight: 44, maxHeight: 120,
              }}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={isProcessing || !input.trim()}
              style={{
                background: isProcessing ? "var(--bg3)" : "var(--accent)",
                color: isProcessing ? "var(--text-dim)" : "#050810",
                border: "none", borderRadius: 8, padding: "10px 16px",
                fontFamily: "Rajdhani", fontWeight: 600,
                cursor: isProcessing ? "not-allowed" : "pointer", whiteSpace: "nowrap",
              }}
            >
              ⚡ Senden
            </button>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderTop: "1px solid var(--border)", background: "var(--bg3)" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { label: "📱", width: "375px" },
            { label: "📋", width: "768px" },
            { label: "🖥", width: "100%" },
          ].map(({ label, width }) => (
            <button
              key={width}
              onClick={() => setPreviewWidth(width)}
              style={{
                background: previewWidth === width ? "rgba(0,200,255,0.15)" : "transparent",
                border: `1px solid ${previewWidth === width ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 16,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={handleUndo} disabled={historyIndex <= 0} title="Rückgängig (Ctrl+Z)"
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", color: historyIndex > 0 ? "var(--text)" : "var(--text-dim)", cursor: historyIndex > 0 ? "pointer" : "not-allowed", fontFamily: "Rajdhani" }}>
            ↩ Undo
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Wiederherstellen (Ctrl+Shift+Z)"
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", color: historyIndex < history.length - 1 ? "var(--text)" : "var(--text-dim)", cursor: historyIndex < history.length - 1 ? "pointer" : "not-allowed", fontFamily: "Rajdhani" }}>
            ↪ Redo
          </button>
          <button onClick={handleReset} title="Alle Änderungen verwerfen"
            style={{ background: "transparent", border: "1px solid var(--red, #ef4444)", borderRadius: 6, padding: "4px 10px", color: "var(--red, #ef4444)", cursor: "pointer", fontFamily: "Rajdhani" }}>
            🔄 Reset
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasUnsavedChanges && (
            <span style={{ color: "var(--yellow, #eab308)", fontSize: 12, fontFamily: "Rajdhani" }}>● Ungespeicherte Änderungen</span>
          )}
          <button onClick={handleSave} disabled={!hasUnsavedChanges} title="Speichern (Ctrl+S)"
            style={{
              background: hasUnsavedChanges ? "var(--green, #22c55e)" : "var(--bg3)",
              color: hasUnsavedChanges ? "#050810" : "var(--text-dim)",
              border: "none", borderRadius: 6, padding: "6px 16px",
              fontFamily: "Rajdhani", fontWeight: 600,
              cursor: hasUnsavedChanges ? "pointer" : "not-allowed",
            }}>
            💾 Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
