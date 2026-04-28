import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";

export interface OutputState {
  html: string;
  bodyContent: string;
  cssBlock: string;
  jsonLd: string;
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
  prompt: string;
  pageId: string;
  tokensUsed: number;
  duration: number;
  stopReason: string;
}

const EMPTY_OUTPUT: OutputState = {
  html: "",
  bodyContent: "",
  cssBlock: "",
  jsonLd: "",
  metaTitle: "",
  metaDesc: "",
  metaKeywords: "",
  prompt: "",
  pageId: "",
  tokensUsed: 0,
  duration: 0,
  stopReason: "",
};

interface OutputContextValue {
  output: OutputState;
  setOutput: (data: Partial<OutputState>) => void;
  clearOutput: () => void;
}

const OutputContext = createContext<OutputContextValue>({
  output: EMPTY_OUTPUT,
  setOutput: () => {},
  clearOutput: () => {},
});

export function OutputProvider({ children }: { children: ReactNode }) {
  const [output, _setOutput] = useState<OutputState>(() =>
    storage.get<OutputState>("output", EMPTY_OUTPUT),
  );

  const setOutput = useCallback((data: Partial<OutputState>) => {
    _setOutput((prev) => {
      const next = { ...prev, ...data };
      storage.set("output", next);

      // Sync HTML to saved_analyses via analysis context storage
      if (data.html) {
        try {
          const analysisState = storage.get<{ savedAnalysisId?: string | null }>("analysis", {});
          const analysisId = analysisState?.savedAnalysisId;
          if (analysisId) {
            void supabase
              .from("saved_analyses")
              .update({
                generated_html: data.html,
                json_ld: data.jsonLd || "",
                meta_title: data.metaTitle || "",
                meta_desc: data.metaDesc || "",
                page_id: data.pageId || null,
              })
              .eq("id", analysisId)
              .then(() => console.log("HTML in Analyse gespeichert"));
          }
        } catch {}
      }

      return next;
    });
  }, []);

  const clearOutput = useCallback(() => {
    storage.remove("output");
    _setOutput(EMPTY_OUTPUT);
  }, []);

  return (
    <OutputContext.Provider value={{ output, setOutput, clearOutput }}>
      {children}
    </OutputContext.Provider>
  );
}

export function useOutputContext() {
  return useContext(OutputContext);
}
