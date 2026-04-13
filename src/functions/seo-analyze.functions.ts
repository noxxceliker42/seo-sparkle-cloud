import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const seoAnalyze = createServerFn({ method: "POST" })
  .inputValidator(z.object({ keyword: z.string().min(1).max(500) }))
  .handler(async ({ data }) => {
    // TODO: Implement SEO analysis logic
    return { status: "not_implemented", keyword: data.keyword };
  });
