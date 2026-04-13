interface SerpPreviewProps {
  results: Array<{ url: string; title: string; description: string; position: number }>;
}

export function SerpPreview({ results }: SerpPreviewProps) {
  if (!results.length) return null;

  return (
    <div className="space-y-4">
      {results.map((r, i) => {
        const titleLen = r.title.length;
        const descLen = r.description.length;
        const titleOk = titleLen <= 60;
        const descOk = descLen <= 155;

        return (
          <div key={i} className="rounded-md border border-border bg-card p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">#{r.position}</span>
              <span className="truncate">{r.url}</span>
            </div>
            <h4 className="text-base font-medium text-secondary leading-tight">
              {r.title}
              <span className={`ml-2 text-xs font-normal ${titleOk ? "text-green-600" : "text-destructive"}`}>
                ({titleLen}/60)
              </span>
            </h4>
            <p className="text-sm text-foreground/80 leading-snug">
              {r.description}
              <span className={`ml-2 text-xs ${descOk ? "text-green-600" : "text-destructive"}`}>
                ({descLen}/155)
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
