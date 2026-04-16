export interface ClusterPageScoreInput {
  search_volume?: number | null;
  keyword_difficulty?: number | null;
  score_pillar_support?: number | null;
  score_conversion?: number | null;
  status?: string | null;
  trend_direction?: string | null;
}

export function calculateScore(page: ClusterPageScoreInput): number {
  const volScore = Math.min(((page.search_volume || 0) / 500) * 25, 25);
  const kdScore = page.keyword_difficulty
    ? ((100 - page.keyword_difficulty) / 100) * 20
    : 10;
  const pillarScore = page.score_pillar_support || 12;
  const convScore = page.score_conversion || 8;
  const gapScore = page.status === "planned" ? 10 : 0;
  const trendScore =
    page.trend_direction === "up"
      ? 5
      : page.trend_direction === "stable"
        ? 3
        : 1;
  return Math.round(volScore + kdScore + pillarScore + convScore + gapScore + trendScore);
}

export function scoreColor(score: number): string {
  if (score <= 40) return "bg-red-500";
  if (score <= 70) return "bg-yellow-500";
  return "bg-green-500";
}

export function scoreTextColor(score: number): string {
  if (score <= 40) return "text-red-600";
  if (score <= 70) return "text-yellow-600";
  return "text-green-600";
}
