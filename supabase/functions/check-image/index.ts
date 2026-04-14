import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { jobId, taskId, slot, keyword } = await req.json();

    // KORREKTER STATUS ENDPOINT
    const statusRes = await fetch(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${kieKey}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    const statusData = await statusRes.json();

    // VOLLSTÄNDIGES LOGGING:
    console.log("RAW recordInfo:", JSON.stringify(statusData, null, 2));

    // Alle Status-Felder extrahieren:
    const topStatus = statusData?.status;
    const dataStatus = statusData?.data?.status;
    const topState = statusData?.state;
    const dataState = statusData?.data?.state;
    console.log("Status fields:", { topStatus, dataStatus, topState, dataState });

    // ALLE bekannten Kie.AI Status-Strings:
    const DONE_STATUSES: (string | number)[] = [
      "SUCCESS", "success",
      "COMPLETED", "completed",
      "FINISHED", "finished",
      "DONE", "done",
      "succeed", "SUCCEED",
      "2", 2,
    ];

    const isDone =
      DONE_STATUSES.includes(topStatus) ||
      DONE_STATUSES.includes(dataStatus) ||
      DONE_STATUSES.includes(topState) ||
      DONE_STATUSES.includes(dataState) ||
      statusData?.data?.code === 200 ||
      statusData?.code === 200;

    const FAIL_STATUSES = ["FAILED", "failed", "error", "ERROR", "FAIL", "fail"];
    const isFailed =
      FAIL_STATUSES.includes(topStatus) ||
      FAIL_STATUSES.includes(dataStatus) ||
      FAIL_STATUSES.includes(topState) ||
      FAIL_STATUSES.includes(dataState);

    // Bild-URL aus ALLEN möglichen Strukturen:
    const imageUrl =
      statusData?.data?.output?.[0]?.url ||
      statusData?.data?.output?.[0] ||
      statusData?.data?.images?.[0]?.url ||
      statusData?.data?.images?.[0] ||
      statusData?.data?.url ||
      statusData?.data?.imageUrl ||
      statusData?.data?.image_url ||
      statusData?.output?.[0]?.url ||
      statusData?.output?.[0] ||
      statusData?.images?.[0]?.url ||
      statusData?.url ||
      statusData?.imageUrl ||
      statusData?.data?.result?.[0]?.url ||
      statusData?.data?.result?.url ||
      null;

    console.log("isDone:", isDone, "imageUrl:", imageUrl);

    // Sicherheitsnetz: URL vorhanden = fertig
    const isActuallyDone = isDone || (imageUrl !== null && imageUrl !== undefined);
    console.log("isActuallyDone:", isActuallyDone);

    if (isFailed) {
      await supabase.from("image_jobs").update({ status: "failed" }).eq("id", jobId);
      return new Response(
        JSON.stringify({ status: "failed" }),
        { headers: corsHeaders }
      );
    }

    if (isActuallyDone && imageUrl) {
      // Cloudinary Upload
      const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
      const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET");

      const slug = (keyword || slot || "image")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 40);

      const fd = new FormData();
      fd.append("file", imageUrl);
      fd.append("upload_preset", uploadPreset!);
      fd.append("folder", "seo-os");
      fd.append("public_id", `${slug}-${slot}-${jobId?.slice(0, 8)}`);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const cloudData = await cloudRes.json();
      console.log("Cloudinary response:", JSON.stringify(cloudData));

      const cloudinaryUrl =
        cloudData.secure_url?.replace("/upload/", "/upload/f_auto,q_auto/") || null;

      if (!cloudinaryUrl) {
        console.error("Cloudinary Upload fehlgeschlagen:", JSON.stringify(cloudData));
        return new Response(
          JSON.stringify({ status: "failed", error: "Cloudinary Upload fehlgeschlagen" }),
          { headers: corsHeaders }
        );
      }

      await supabase
        .from("image_jobs")
        .update({
          nano_url: imageUrl,
          cloudinary_url: cloudinaryUrl,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ status: "completed", cloudinaryUrl, slot, jobId }),
        { headers: corsHeaders }
      );
    }

    // Noch nicht fertig
    return new Response(
      JSON.stringify({ status: "generating", taskStatus: dataStatus || topStatus || "" }),
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("check-image error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
