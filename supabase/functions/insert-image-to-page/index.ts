import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { jobId, pageId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: job } = await supabase
      .from("image_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) throw new Error("Job nicht gefunden");

    const { data: page } = await supabase
      .from("seo_pages")
      .select("html_output")
      .eq("id", pageId)
      .single();

    if (!page?.html_output) throw new Error("Seite nicht gefunden");

    let html = page.html_output;
    const imgUrl = job.cloudinary_url || job.nano_url || job.image_url;
    const altText = job.alt_text || "";
    const slotName = job.slot || "hero";

    // Replace PLACEHOLDER_[slot] in src
    html = html.replace(new RegExp(`PLACEHOLDER_${slotName}`, "g"), imgUrl);

    // Replace PLACEHOLDER_ALT_[slot] in alt
    html = html.replace(new RegExp(`PLACEHOLDER_ALT_${slotName}`, "g"), altText);

    // Fallback: find data-img-slot and replace src/alt
    if (html.includes(`data-img-slot="${slotName}"`)) {
      html = html.replace(
        new RegExp(`(data-img-slot="${slotName}"[^>]*src=")[^"]*(")`),
        `$1${imgUrl}$2`
      );
      html = html.replace(
        new RegExp(`(data-img-slot="${slotName}"[^>]*alt=")[^"]*(")`),
        `$1${altText}$2`
      );
    }

    await supabase
      .from("seo_pages")
      .update({ html_output: html })
      .eq("id", pageId);

    await supabase
      .from("image_jobs")
      .update({ html_inserted: true, is_selected: true })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("insert-image-to-page error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
