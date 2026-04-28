import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { storage } from "@/lib/storage";

interface FormContextValue {
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown>) => void;
  updateField: (key: string, value: unknown) => void;
  clearForm: () => void;
  loadFromAnalysis: (analysis: { form_data?: Record<string, unknown> | null }) => void;
}

const FormContext = createContext<FormContextValue>({
  formData: {},
  setFormData: () => {},
  updateField: () => {},
  clearForm: () => {},
  loadFromAnalysis: () => {},
});

export function FormProvider({ children }: { children: ReactNode }) {
  const [formData, _setFormData] = useState<Record<string, unknown>>(() =>
    storage.get<Record<string, unknown>>("form", {}),
  );

  const setFormData = useCallback((data: Record<string, unknown>) => {
    _setFormData(data);
    storage.set("form", data);
  }, []);

  const updateField = useCallback((key: string, value: unknown) => {
    _setFormData((prev) => {
      const next = { ...prev, [key]: value };
      storage.set("form", next);
      return next;
    });
  }, []);

  const clearForm = useCallback(() => {
    storage.remove("form");
    _setFormData({});
  }, []);

  const loadFromAnalysis = useCallback(
    (analysis: { form_data?: Record<string, unknown> | null }) => {
      if (analysis.form_data) {
        setFormData(analysis.form_data);
      }
    },
    [setFormData],
  );

  return (
    <FormContext.Provider value={{ formData, setFormData, updateField, clearForm, loadFromAnalysis }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext() {
  return useContext(FormContext);
}
