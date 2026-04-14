import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OutputState {
  html: string;
  jsonLd: string;
  metaTitle: string;
  metaDesc: string;
  prompt: string;
  pageId: string;
}

const EMPTY_OUTPUT: OutputState = {
  html: "",
  jsonLd: "",
  metaTitle: "",
  metaDesc: "",
  prompt: "",
  pageId: "",
};

const OUTPUT_KEY = "seo_os_output_v2";
const ANALYSIS_KEY = "seo_os_analysis_v2";

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

function readOutputStorage(): OutputState {
  try {
    const s = sessionStorage.getItem(OUTPUT_KEY);
    return s ? { ...EMPTY_OUTPUT, ...JSON.parse(s) } : EMPTY_OUTPUT;
  } catch {
    return EMPTY_OUTPUT;
  }
}

export function OutputProvider({ children }: { children: ReactNode }) {
  const [output, _setOutput] = useState<OutputState>(readOutputStorage);

  const setOutput = useCallback((data: Partial<OutputState>) => {
    _setOutput((prev) => {
      const next = { ...prev, ...data };
      try {
        sessionStorage.setItem(OUTPUT_KEY, JSON.stringify(next));
      } catch {}

      // Sync to saved_analyses if we have a savedAnalysisId
      if (data.html) {
        try {
          const analysisRaw = sessionStorage.getItem(ANALYSIS_KEY);
          const analysisId = analysisRaw ? JSON.parse(analysisRaw).savedAnalysisId : null;
          if (analysisId) {
            void (supabase
              .from("saved_analyses")
              .update({
                generated_html: data.html,
                json_ld: data.jsonLd || "",
                meta_title: data.metaTitle || "",
                meta_desc: data.metaDesc || "",
                page_id: data.pageId || null,
              })
              .eq("id", analysisId)
              .then(() => console.log("HTML in Analyse gespeichert")));
          }
        } catch {}
      }

      return next;
    });
  }, []);

  const clearOutput = useCallback(() => {
    sessionStorage.removeItem(OUTPUT_KEY);
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
