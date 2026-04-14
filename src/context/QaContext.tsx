import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const QA_KEY = "seo_os_qa_v2";
const ANALYSIS_KEY = "seo_os_analysis_v2";

interface QaContextValue {
  qaState: Record<string, unknown>;
  setQaState: (state: Record<string, unknown>) => void;
  clearQa: () => void;
}

const QaContext = createContext<QaContextValue>({
  qaState: {},
  setQaState: () => {},
  clearQa: () => {},
});

function readQaStorage(): Record<string, unknown> {
  try {
    const s = sessionStorage.getItem(QA_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function QaProvider({ children }: { children: ReactNode }) {
  const [qaState, _setQaState] = useState<Record<string, unknown>>(readQaStorage);

  const setQaState = useCallback((state: Record<string, unknown>) => {
    _setQaState(state);
    try {
      sessionStorage.setItem(QA_KEY, JSON.stringify(state));
    } catch {}

    // Sync to saved_analyses
    try {
      const analysisRaw = sessionStorage.getItem(ANALYSIS_KEY);
      const analysisId = analysisRaw ? JSON.parse(analysisRaw).savedAnalysisId : null;
      if (analysisId) {
        void supabase
          .from("saved_analyses")
          .update({ qa_state: state })
          .eq("id", analysisId);
      }
    } catch {}
  }, []);

  const clearQa = useCallback(() => {
    sessionStorage.removeItem(QA_KEY);
    _setQaState({});
  }, []);

  return (
    <QaContext.Provider value={{ qaState, setQaState, clearQa }}>
      {children}
    </QaContext.Provider>
  );
}

export function useQaContext() {
  return useContext(QaContext);
}
