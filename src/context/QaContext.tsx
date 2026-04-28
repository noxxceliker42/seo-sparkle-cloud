import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";

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

export function QaProvider({ children }: { children: ReactNode }) {
  const [qaState, _setQaState] = useState<Record<string, unknown>>(() =>
    storage.get<Record<string, unknown>>("qa", {}),
  );

  const setQaState = useCallback((state: Record<string, unknown>) => {
    _setQaState(state);
    storage.set("qa", state);

    // Sync to saved_analyses
    try {
      const analysisState = storage.get<{ savedAnalysisId?: string | null }>("analysis", {});
      const analysisId = analysisState?.savedAnalysisId;
      if (analysisId) {
        void supabase
          .from("saved_analyses")
          .update({ qa_state: state as unknown as import("@/integrations/supabase/types").Json })
          .eq("id", analysisId);
      }
    } catch {}
  }, []);

  const clearQa = useCallback(() => {
    storage.remove("qa");
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
