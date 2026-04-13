interface ClusterPreviewProps {
  cluster: {
    informational?: string[];
    commercial?: string[];
    transactional?: string[];
    deep_pages?: string[];
  };
}

export function ClusterPreview({ cluster }: ClusterPreviewProps) {
  const sections = [
    { key: "informational", label: "Informational", color: "bg-blue-100 text-blue-800" },
    { key: "commercial", label: "Commercial", color: "bg-amber-100 text-amber-800" },
    { key: "transactional", label: "Transactional", color: "bg-green-100 text-green-800" },
    { key: "deep_pages", label: "Deep Pages", color: "bg-purple-100 text-purple-800" },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map(({ key, label, color }) => {
        const items = cluster[key];
        if (!items || items.length === 0) return null;
        return (
          <div key={key} className="rounded-md border border-border p-3 space-y-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
              {label}
            </span>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-foreground/80">• {item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
