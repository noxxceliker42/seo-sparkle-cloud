export interface PhilosophyOption {
  id: string;
  name: string;
  colors: [string, string, string]; // primary, secondary, accent
}

export const STUDIO_PHILOSOPHIES: PhilosophyOption[] = [
  { id: "trust_classic",    name: "Trust Classic",    colors: ["#1d4ed8", "#0b1220", "#dc2626"] },
  { id: "luxury_dark",      name: "Luxury Dark",      colors: ["#d4af37", "#111827", "#d4af37"] },
  { id: "futuristic_tech",  name: "Futuristic Tech",  colors: ["#00f5ff", "#0f0f1a", "#7c3aed"] },
  { id: "glassmorphism",    name: "Glassmorphism 2026", colors: ["#6366f1", "#3b82f6", "#f59e0b"] },
  { id: "berlin_urban",     name: "Berlin Urban",     colors: ["#e11d48", "#18181b", "#f4f4f5"] },
  { id: "organic_flow",     name: "Organic Flow",     colors: ["#16a34a", "#facc15", "#f97316"] },
  { id: "editorial_bold",   name: "Editorial Bold",   colors: ["#ef4444", "#000000", "#ffffff"] },
  { id: "german_precision", name: "German Precision", colors: ["#374151", "#111827", "#6b7280"] },
  { id: "handwerk_pro",     name: "Handwerk Pro",     colors: ["#d97706", "#92400e", "#fbbf24"] },
  { id: "automotive",       name: "Automotive",       colors: ["#f59e0b", "#1e293b", "#ffffff"] },
  { id: "medical_clean",    name: "Medical Clean",    colors: ["#059669", "#0891b2", "#ffffff"] },
  { id: "gradient_flow",    name: "Gradient Flow",    colors: ["#8b5cf6", "#ec4899", "#f97316"] },
];

export const STUDIO_COMPONENT_TYPES: { id: string; label: string; variants: string[] }[] = [
  { id: "header",        label: "Header",         variants: ["standard", "transparent", "split", "centered"] },
  { id: "footer",        label: "Footer",         variants: ["standard", "minimal", "mega"] },
  { id: "hero",          label: "Hero",           variants: ["standard", "split", "video", "gradient"] },
  { id: "faq",           label: "FAQ",            variants: ["accordion", "two_column", "tabs"] },
  { id: "cta_section",   label: "CTA Section",    variants: ["standard", "boxed", "fullwidth"] },
  { id: "pricing",       label: "Pricing",        variants: ["3_tier", "table", "toggle"] },
  { id: "testimonials",  label: "Testimonials",   variants: ["grid", "slider", "single"] },
  { id: "service_cards", label: "Service Cards",  variants: ["grid", "icons", "image"] },
  { id: "contact_form",  label: "Contact Form",   variants: ["standard", "split", "minimal"] },
  { id: "cluster_nav",   label: "Cluster Nav",    variants: ["sidebar", "horizontal", "mega"] },
  { id: "urgency_bar",   label: "Urgency Bar",    variants: ["timer", "stock", "discount"] },
  { id: "trust_strip",   label: "Trust Strip",    variants: ["logos", "stats", "badges"] },
];

export function getPhilosophyById(id: string | null | undefined): PhilosophyOption | undefined {
  return STUDIO_PHILOSOPHIES.find((p) => p.id === id);
}
