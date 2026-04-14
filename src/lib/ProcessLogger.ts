import type { SupabaseClient } from "@supabase/supabase-js";

export interface LogEntry {
  sessionId: string;
  stepIndex: number;
  stepName: string;
  status: "running" | "success" | "warning" | "error" | "skipped";
  message: string;
  detail?: unknown;
  durationMs?: number;
  timestamp: Date;
}

export class ProcessLogger {
  private sessionId: string;
  private processType: string;
  private userId: string;
  private stepCounter = 0;
  private stepTimes = new Map<string, number>();
  private entries: LogEntry[] = [];
  private onUpdate: (entries: LogEntry[]) => void;
  private supabase: SupabaseClient;

  constructor(
    processType: string,
    userId: string,
    supabase: SupabaseClient,
    onUpdate: (entries: LogEntry[]) => void
  ) {
    this.sessionId = `${processType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.processType = processType;
    this.userId = userId;
    this.supabase = supabase;
    this.onUpdate = onUpdate;
  }

  async log(
    name: string,
    status: LogEntry["status"],
    message: string,
    detail?: unknown
  ) {
    const now = Date.now();
    const key = name + "_start";

    if (status === "running") {
      this.stepTimes.set(key, now);
    }

    const durationMs =
      status !== "running" ? now - (this.stepTimes.get(key) || now) : undefined;

    const entry: LogEntry = {
      sessionId: this.sessionId,
      stepIndex: this.stepCounter++,
      stepName: name,
      status,
      message,
      detail,
      durationMs,
      timestamp: new Date(),
    };

    // Update existing running step if finishing
    const runIdx = this.entries.findIndex(
      (e) => e.stepName === name && e.status === "running"
    );
    if (runIdx >= 0 && status !== "running") {
      this.entries[runIdx] = {
        ...this.entries[runIdx],
        status,
        message,
        detail,
        durationMs,
      };
    } else {
      this.entries.push(entry);
    }

    this.onUpdate([...this.entries]);

    // Non-blocking save to database
    this.supabase
      .from("process_logs")
      .insert({
        user_id: this.userId,
        session_id: this.sessionId,
        process_type: this.processType,
        step_index: entry.stepIndex,
        step_name: name,
        status,
        message,
        detail: detail ? JSON.stringify(detail) : null,
        duration_ms: durationMs,
      })
      .then()
      .catch(console.error);
  }

  getSessionId() {
    return this.sessionId;
  }

  getEntries() {
    return [...this.entries];
  }

  hasError() {
    return this.entries.some((e) => e.status === "error");
  }

  getProgress(totalSteps: number) {
    const done = this.entries.filter((e) =>
      ["success", "warning", "error", "skipped"].includes(e.status)
    ).length;
    return Math.round((done / totalSteps) * 100);
  }
}
