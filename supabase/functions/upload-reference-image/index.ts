import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    if (!kieKey) throw new Error("KIE_AI_API_KEY fehlt");

    const { imageBase64, fileName, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 fehlt" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    console.log("Upload startet:", fileName, "Größe:", Math.round(imageBase64.length * 0.75 / 1024), "KB");

    const uploadRes = await fetch(
      "https://kieai.redpandaai.co/api/upload/base64",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kieKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: imageBase64,
          fileName: fileName || "reference.jpg",
          mimeType: mimeType || "image/jpeg",
        }),
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Kie.AI Upload ${uploadRes.status}: ${err.slice(0, 200)}`);
    }

    const uploadData = await uploadRes.json();
    console.log("Upload Response:", JSON.stringify(uploadData).slice(0, 300));

    const fileUrl =
      uploadData?.data?.fileUrl ||
      uploadData?.fileUrl ||
      null;

    if (!fileUrl) {
      throw new Error("Keine fileUrl in Response: " + JSON.stringify(uploadData).slice(0, 200));
    }

    console.log("Upload erfolgreich:", fileUrl);

    return new Response(
      JSON.stringify({
        success: true,
        fileUrl,
        fileId: uploadData?.data?.fileId,
        expiresAt: uploadData?.data?.expiresAt,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Upload Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
