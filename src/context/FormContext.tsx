import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface FormContextValue {
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown>) => void;
  updateField: (key: string, value: unknown) => void;
  clearForm: () => void;
  loadFromAnalysis: (analysis: { form_data?: Record<string, unknown> | null }) => void;
}

const FORM_KEY = "seo_os_form_v2";

const FormContext = createContext<FormContextValue>({
  formData: {},
  setFormData: () => {},
  updateField: () => {},
  clearForm: () => {},
  loadFromAnalysis: () => {},
});

function readFormStorage(): Record<string, unknown> {
  try {
    const s = sessionStorage.getItem(FORM_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function FormProvider({ children }: { children: ReactNode }) {
  const [formData, _setFormData] = useState<Record<string, unknown>>(readFormStorage);

  const setFormData = useCallback((data: Record<string, unknown>) => {
    _setFormData(data);
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const updateField = useCallback((key: string, value: unknown) => {
    _setFormData((prev) => {
      const next = { ...prev, [key]: value };
      try {
        sessionStorage.setItem(FORM_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearForm = useCallback(() => {
    sessionStorage.removeItem(FORM_KEY);
    _setFormData({});
  }, []);

  const loadFromAnalysis = useCallback((analysis: { form_data?: Record<string, unknown> | null }) => {
    if (analysis.form_data) {
      setFormData(analysis.form_data);
    }
  }, [setFormData]);

  return (
    <FormContext.Provider value={{ formData, setFormData, updateField, clearForm, loadFromAnalysis }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext() {
  return useContext(FormContext);
}
