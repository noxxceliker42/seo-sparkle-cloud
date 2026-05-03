import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { currentHtml, userCommand, pageContext, chatHistory } = await req.json()

    if (!currentHtml || !userCommand) {
      return new Response(
        JSON.stringify({ success: false, error: 'currentHtml und userCommand sind Pflicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Chat-History für Kontext (letzte 4 Nachrichten)
    const contextMessages = (chatHistory || []).slice(-4).map((m: any) => ({
      role: m.role,
      content: m.role === 'user' ? m.content : (m.changeSummary || m.content || '')
    }))

    const messages = [
      ...contextMessages,
      {
        role: 'user',
        content: `Hier ist das aktuelle HTML der Seite:\n\n${currentHtml}\n\n══════════════════════════════════\nANWEISUNG: ${userCommand}\n══════════════════════════════════`
      }
    ]

    const systemPrompt = `Du bist ein Elite-Frontend-Entwickler und Designer.
Du bearbeitest eine bestehende HTML-Seite basierend auf Benutzeranweisungen.

REGELN:
1. Du erhältst das vollständige aktuelle HTML-Dokument
2. Du erhältst eine Änderungsanweisung vom Benutzer
3. Ändere NUR was angewiesen wird — alles andere bleibt EXAKT gleich
4. Behalte ALLE bestehenden Styles, Scripts, data-Attribute, JSON-LD
5. Wenn du CSS änderst, ändere es im bestehenden <style>-Block
6. Neue Elemente müssen zum bestehenden Design passen (gleiche CSS-Variablen, Fonts, Farbschema)
7. AUSNAHME: Wenn der Benutzer explizit neue Farben, Fonts oder Design-Änderungen wünscht, setze diese um
8. Behalte alle data-section und data-section-id Attribute
9. Behalte alle Schema.org JSON-LD Blöcke
10. Mobile-responsive wie der Rest der Seite
11. prefers-reduced-motion Fallback bei neuen Animationen
12. Keine externen Dependencies hinzufügen (außer Google Fonts wenn gewünscht)

DESIGN-BEIBEHALTUNG:
- Wenn der Benutzer NUR Inhalt ändert (Text, Bilder, Struktur):
  → Behalte das gesamte CSS und Design exakt wie es ist
- Wenn der Benutzer Design-Änderungen wünscht (Farben, Fonts, Layout):
  → Ändere die CSS Custom Properties in :root {}
  → Oder ergänze neue CSS-Regeln im bestehenden <style>-Block
- Neue Sektionen bekommen ein passendes data-section Attribut

AUSGABE-FORMAT:
Gib zuerst eine kurze Zusammenfassung (was wurde geändert),
dann das VOLLSTÄNDIGE geänderte HTML-Dokument.

Format:
CHANGES:
- Änderung 1
- Änderung 2
- Änderung 3

---HTML---
<!DOCTYPE html>
...(das vollständige geänderte HTML-Dokument)...
---END---

WICHTIG:
- Gib das GESAMTE Dokument zurück, nicht nur den geänderten Teil
- Beginne mit <!DOCTYPE html> und ende mit </html>
- ALLE bestehenden Sektionen müssen erhalten bleiben (außer wenn explizit gelöscht)`

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY nicht konfiguriert')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 64000,
        system: systemPrompt,
        messages
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Anthropic API Fehler: ${response.status} ${errText.slice(0, 200)}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const tokensUsed = data.usage?.output_tokens || 0

    // Parse: CHANGES Block
    const changesMatch = text.match(/CHANGES:\s*([\s\S]*?)(?=---HTML---|```html)/i)
    const changes = changesMatch?.[1]?.trim() || ''

    // Parse: HTML Block
    let newHtml = ''
    const htmlMatch = text.match(/---HTML---\s*([\s\S]*?)---END---/i)
    if (htmlMatch) {
      newHtml = htmlMatch[1].trim()
    } else {
      const fallback = text.match(/```html\s*([\s\S]*?)```/i)
      if (fallback) {
        newHtml = fallback[1].trim()
      } else {
        const doctypeMatch = text.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i)
        if (doctypeMatch) {
          newHtml = doctypeMatch[1].trim()
        }
      }
    }

    if (!newHtml) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Konnte kein HTML aus der KI-Antwort extrahieren',
          rawPreview: text.slice(0, 500)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        changes,
        html: newHtml,
        tokensUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('studio-editor error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
