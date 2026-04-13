import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const qaCheck = createServerFn({ method: "POST" })
  .inputValidator(z.object({ pageId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // TODO: Implement QA check logic
    return { status: "not_implemented", pageId: data.pageId };
  });
