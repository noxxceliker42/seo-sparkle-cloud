import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const generatePage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ keyword: z.string().min(1).max(500), firm: z.string().optional(), city: z.string().optional() }))
  .handler(async ({ data }) => {
    // TODO: Implement page generation
    return { status: "not_implemented", keyword: data.keyword };
  });
