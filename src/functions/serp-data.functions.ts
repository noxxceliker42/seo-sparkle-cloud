import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const serpData = createServerFn({ method: "POST" })
  .inputValidator(z.object({ keyword: z.string().min(1).max(500) }))
  .handler(async ({ data }) => {
    // TODO: Implement SERP data fetching
    return { status: "not_implemented", keyword: data.keyword };
  });
