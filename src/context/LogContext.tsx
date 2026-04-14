import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LogEntry } from "@/lib/ProcessLogger";

interface LogContextValue {
  entries: LogEntry[];
  setEntries: (entries: LogEntry[]) => void;
  isVisible: boolean;
  setVisible: (v: boolean) => void;
  totalSteps: number;
  setTotalSteps: (n: number) => void;
  processName: string;
  setProcessName: (n: string) => void;
  onRetry: (() => void) | null;
  setOnRetry: (fn: (() => void) | null) => void;
  clearLog: () => void;
}

const LogContext = createContext<LogContextValue>({
  entries: [],
  setEntries: () => {},
  isVisible: false,
  setVisible: () => {},
  totalSteps: 0,
  setTotalSteps: () => {},
  processName: "",
  setProcessName: () => {},
  onRetry: null,
  setOnRetry: () => {},
  clearLog: () => {},
});

export function LogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isVisible, setVisible] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);
  const [processName, setProcessName] = useState("");
  const [onRetry, setOnRetry] = useState<(() => void) | null>(null);

  const clearLog = useCallback(() => {
    setEntries([]);
    setVisible(false);
    setTotalSteps(0);
    setProcessName("");
    setOnRetry(null);
  }, []);

  return (
    <LogContext.Provider
      value={{
        entries,
        setEntries,
        isVisible,
        setVisible,
        totalSteps,
        setTotalSteps,
        processName,
        setProcessName,
        onRetry,
        setOnRetry,
        clearLog,
      }}
    >
      {children}
    </LogContext.Provider>
  );
}

export function useLogContext() {
  return useContext(LogContext);
}
