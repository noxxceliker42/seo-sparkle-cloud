interface ClusterPreviewProps {
  cluster: {
    informational?: string[];
    commercial?: string[];
    transactional?: string[];
    deep_pages?: string[];
  };
  pillarKeyword?: string;
}

export function ClusterPreview({ cluster, pillarKeyword }: ClusterPreviewProps) {
  const sections = [
    { key: "informational", label: "Supporting Informational", color: "border-blue-400 bg-blue-50", dot: "bg-blue-500", textColor: "text-blue-800" },
    { key: "commercial", label: "Supporting Commercial", color: "border-amber-400 bg-amber-50", dot: "bg-amber-500", textColor: "text-amber-800" },
    { key: "transactional", label: "Transactional / Local", color: "border-green-400 bg-green-50", dot: "bg-green-500", textColor: "text-green-800" },
    { key: "deep_pages", label: "Deep Pages", color: "border-purple-400 bg-purple-50", dot: "bg-purple-500", textColor: "text-purple-800" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Pillar Page */}
      {pillarKeyword && (
        <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 text-center">
          <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white mb-2">
            PILLAR PAGE
          </span>
          <p className="text-base font-semibold text-red-900">{pillarKeyword}</p>
        </div>
      )}

      {/* Cluster branches */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ key, label, color, dot, textColor }) => {
          const items = cluster[key];
          if (!items || items.length === 0) return null;
          return (
            <div key={key} className={`rounded-lg border-2 ${color} p-3 space-y-2`}>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${dot}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>
                  {label}
                </span>
              </div>
              <ul className="space-y-1">
                {items.map((item, i) => (
                  <li key={i} className={`text-sm ${textColor} opacity-90`}>• {item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
