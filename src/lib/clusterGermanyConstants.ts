// Branchen definitions for Cluster Germany
export const BRANCHEN_GROUPS = [
  {
    label: "Handwerk & Technik",
    items: [
      { value: "hausgeraete", label: "Hausgeräte-Reparatur" },
      { value: "elektro", label: "Elektrotechnik / Elektriker" },
      { value: "sanitaer", label: "Sanitär / Klempner / Heizung" },
      { value: "schluesseldienst", label: "Schlüsseldienst" },
      { value: "maler", label: "Maler & Lackierer" },
    ],
  },
  {
    label: "Automotive",
    items: [{ value: "kfz_werkstatt", label: "KFZ-Werkstatt / Autoservice" }],
  },
  {
    label: "Gesundheit",
    items: [
      { value: "zahnarzt", label: "Zahnarzt / Zahnmedizin" },
      { value: "physiotherapie", label: "Physiotherapie" },
    ],
  },
  {
    label: "Recht & Finanzen",
    items: [
      { value: "rechtsanwalt", label: "Rechtsanwalt / Kanzlei" },
      { value: "steuerberater", label: "Steuerberater" },
    ],
  },
  {
    label: "IT & Digital",
    items: [
      { value: "it_service", label: "IT-Service / EDV" },
      { value: "webdesign", label: "Webdesign / Digitalagentur" },
    ],
  },
  {
    label: "Immobilien",
    items: [{ value: "immobilien", label: "Immobilien / Makler" }],
  },
  {
    label: "Gastronomie",
    items: [{ value: "gastronomie", label: "Restaurant / Gastronomie" }],
  },
  {
    label: "Bildung",
    items: [{ value: "nachhilfe", label: "Nachhilfe / Bildung" }],
  },
  {
    label: "Pflege",
    items: [{ value: "pflegedienst", label: "Pflegedienst / Seniorenbetreuung" }],
  },
  {
    label: "Beauty & Wellness",
    items: [
      { value: "friseur", label: "Friseur / Haarsalon" },
      { value: "kosmetik", label: "Kosmetik / Beauty" },
    ],
  },
  {
    label: "Eigene Branche",
    items: [{ value: "custom", label: "Eigene Branche definieren" }],
  },
];

export const BRANCHE_COLORS: Record<string, string> = {
  hausgeraete: "#f59e0b",
  elektro: "#eab308",
  sanitaer: "#3b82f6",
  schluesseldienst: "#6b7280",
  maler: "#ec4899",
  kfz_werkstatt: "#ef4444",
  zahnarzt: "#10b981",
  physiotherapie: "#14b8a6",
  rechtsanwalt: "#6366f1",
  steuerberater: "#8b5cf6",
  it_service: "#06b6d4",
  webdesign: "#a855f7",
  immobilien: "#f97316",
  gastronomie: "#d946ef",
  nachhilfe: "#22c55e",
  pflegedienst: "#f43f5e",
  friseur: "#e11d48",
  kosmetik: "#db2777",
  custom: "#64748b",
};

export const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

export function getBrancheLabel(value: string): string {
  for (const group of BRANCHEN_GROUPS) {
    const found = group.items.find((i) => i.value === value);
    if (found) return found.label;
  }
  return value;
}
