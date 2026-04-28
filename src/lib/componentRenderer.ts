/* HTML renderer for Studio components.
   Receives component config + brand kit colors and produces standalone HTML.
*/

interface BrandKitLite {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url?: string | null;
  logo_alt?: string | null;
  name?: string;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ───── HEADER ───── */
function renderHeader(cfg: any, kit: BrandKitLite) {
  const navItems: Array<{ label: string; url: string; children?: any[] }> = cfg.nav_items ?? [];
  const topbar = cfg.topbar_active
    ? `<div class="topbar">${esc(cfg.topbar_text || "")}</div>`
    : "";
  const phone = cfg.phone_visible && cfg.phone
    ? `<a class="phone" href="tel:${esc(cfg.phone)}">${esc(cfg.phone)}</a>`
    : "";
  const cta = cfg.cta_text
    ? `<a class="cta" href="${esc(cfg.cta_url || "#")}">${esc(cfg.cta_text)}</a>`
    : "";
  const sticky = cfg.sticky ? "position:sticky;top:0;z-index:100;" : "";

  const navHtml = navItems
    .map((item) => {
      const sub =
        item.children && item.children.length
          ? `<ul class="submenu">${item.children
              .map(
                (c: any) =>
                  `<li><a href="${esc(c.url || "#")}">${esc(c.label)}</a></li>`,
              )
              .join("")}</ul>`
          : "";
      return `<li class="${sub ? "has-sub" : ""}"><a href="${esc(item.url || "#")}">${esc(item.label)}</a>${sub}</li>`;
    })
    .join("");

  const logo = kit.logo_url
    ? `<img src="${esc(kit.logo_url)}" alt="${esc(kit.logo_alt || "Logo")}">`
    : `<span>${esc(kit.name || "Brand")}</span>`;

  return `
<style>
  .lov-header * { box-sizing:border-box; margin:0; padding:0; font-family:system-ui,sans-serif; }
  .lov-header { ${sticky} background:${kit.primary_color}; color:#fff; }
  .lov-header .topbar { background:rgba(0,0,0,.15); padding:6px 24px; font-size:.78rem; text-align:center; }
  .lov-header .bar { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; gap:24px; }
  .lov-header .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:1.05rem; }
  .lov-header .logo img { height:36px; max-width:160px; object-fit:contain; }
  .lov-header nav ul { list-style:none; display:flex; gap:22px; }
  .lov-header nav li { position:relative; }
  .lov-header nav a { color:#fff; text-decoration:none; font-size:.9rem; opacity:.9; }
  .lov-header nav a:hover { opacity:1; }
  .lov-header .submenu { display:none; position:absolute; top:100%; left:0; background:${kit.primary_color}; padding:8px 0; min-width:180px; box-shadow:0 4px 12px rgba(0,0,0,.2); }
  .lov-header .submenu li { display:block; }
  .lov-header .submenu a { display:block; padding:8px 16px; }
  .lov-header li.has-sub:hover .submenu { display:block; }
  .lov-header .right { display:flex; align-items:center; gap:14px; }
  .lov-header .phone { color:#fff; text-decoration:none; font-weight:600; font-size:.9rem; }
  .lov-header .cta { background:${kit.accent_color}; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:600; font-size:.85rem; }
</style>
<header class="lov-header">
  ${topbar}
  <div class="bar">
    <div class="logo">${logo}</div>
    <nav><ul>${navHtml}</ul></nav>
    <div class="right">${phone}${cta}</div>
  </div>
</header>`;
}

/* ───── FOOTER ───── */
function renderFooter(cfg: any, kit: BrandKitLite) {
  const columns: Array<{ title: string; links: Array<{ label: string; url: string }> }> =
    cfg.columns ?? [];
  const colsHtml = columns
    .map(
      (c) => `
    <div class="col">
      <h4>${esc(c.title)}</h4>
      <ul>${(c.links || [])
        .map((l) => `<li><a href="${esc(l.url || "#")}">${esc(l.label)}</a></li>`)
        .join("")}</ul>
    </div>`,
    )
    .join("");

  const social = cfg.show_social
    ? `<div class="social">${["facebook", "instagram", "google", "linkedin", "youtube"]
        .filter((k) => cfg.social_links?.[k])
        .map(
          (k) =>
            `<a href="${esc(cfg.social_links[k])}" aria-label="${k}">${k[0].toUpperCase()}</a>`,
        )
        .join("")}</div>`
    : "";

  const legal = (cfg.legal_links || [])
    .map((l: any) => `<a href="${esc(l.url || "#")}">${esc(l.label)}</a>`)
    .join(" · ");

  const dark = cfg.dark_mode !== false;
  const bg = dark ? kit.primary_color : "#f8fafc";
  const fg = dark ? "rgba(255,255,255,.85)" : "#334155";
  const muted = dark ? "rgba(255,255,255,.55)" : "#64748b";

  const logoBlock =
    cfg.show_logo && kit.logo_url
      ? `<img src="${esc(kit.logo_url)}" alt="${esc(kit.logo_alt || "Logo")}" style="height:40px;margin-bottom:12px;">`
      : "";

  return `
<style>
  .lov-footer * { box-sizing:border-box; margin:0; padding:0; font-family:system-ui,sans-serif; }
  .lov-footer { background:${bg}; color:${fg}; padding:40px 24px 20px; }
  .lov-footer .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:32px; max-width:1200px; margin:0 auto; }
  .lov-footer h4 { font-size:.9rem; margin-bottom:10px; color:${dark ? "#fff" : "#0f172a"}; }
  .lov-footer ul { list-style:none; }
  .lov-footer li { margin-bottom:6px; }
  .lov-footer a { color:${fg}; text-decoration:none; font-size:.85rem; }
  .lov-footer a:hover { color:${kit.accent_color}; }
  .lov-footer .bottom { max-width:1200px; margin:24px auto 0; padding-top:16px; border-top:1px solid ${dark ? "rgba(255,255,255,.15)" : "#e2e8f0"}; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:.78rem; color:${muted}; }
  .lov-footer .social { display:flex; gap:8px; margin-top:10px; }
  .lov-footer .social a { width:30px; height:30px; border-radius:50%; background:${kit.accent_color}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.75rem; }
</style>
<footer class="lov-footer">
  <div class="grid">
    <div class="col">${logoBlock}${cfg.show_nap ? `<p style="font-size:.8rem;line-height:1.5;">${esc(cfg.nap_text || "")}</p>` : ""}${social}</div>
    ${colsHtml}
  </div>
  <div class="bottom">
    <span>${esc(cfg.copyright_text || "© " + new Date().getFullYear())}</span>
    <span>${legal}</span>
  </div>
</footer>`;
}

/* ───── LINK BLOCK ───── */
function renderLinkBlock(cfg: any, kit: BrandKitLite) {
  const links: Array<{ label: string; url: string; icon?: string }> = cfg.links ?? [];
  const layout = cfg.layout || "grid";
  const max = cfg.max_visible || links.length;
  const visible = links.slice(0, max);
  const border = cfg.border_style || "box";

  const itemStyle =
    border === "box"
      ? `border:1px solid #e2e8f0; padding:14px; border-radius:8px;`
      : border === "line"
        ? `border-bottom:1px solid #e2e8f0; padding:10px 0;`
        : `padding:8px 0;`;

  const layoutStyle =
    layout === "grid"
      ? `display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;`
      : layout === "cards"
        ? `display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px;`
        : `display:flex; flex-direction:column; gap:6px;`;

  return `
<style>
  .lov-linkblock { font-family:system-ui,sans-serif; padding:24px; }
  .lov-linkblock h3 { font-size:1.1rem; margin-bottom:14px; color:${kit.primary_color}; }
  .lov-linkblock .items { ${layoutStyle} }
  .lov-linkblock a { ${itemStyle} text-decoration:none; color:#0f172a; font-size:.9rem; transition:.15s; display:flex; align-items:center; gap:8px; }
  .lov-linkblock a:hover { color:${kit.accent_color}; ${border === "box" || border === "cards" ? `border-color:${kit.accent_color};` : ""} }
  .lov-linkblock .ic { width:18px; height:18px; background:${kit.accent_color}; border-radius:4px; flex-shrink:0; }
</style>
<div class="lov-linkblock">
  ${cfg.title ? `<h3>${esc(cfg.title)}</h3>` : ""}
  <div class="items">
    ${visible
      .map(
        (l) =>
          `<a href="${esc(l.url || "#")}">${cfg.show_icons ? `<span class="ic"></span>` : ""}${esc(l.label)}</a>`,
      )
      .join("")}
  </div>
</div>`;
}

/* ───── CTA BAR ───── */
function renderCtaBar(cfg: any, kit: BrandKitLite) {
  const bg =
    cfg.background === "primary"
      ? kit.primary_color
      : cfg.background === "accent"
        ? kit.accent_color
        : cfg.background === "dark"
          ? "#0f172a"
          : cfg.custom_bg || kit.primary_color;

  const pos = cfg.position || "top";
  const positionCss =
    pos === "sticky_bottom"
      ? "position:sticky;bottom:0;z-index:100;"
      : pos === "floating"
        ? "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);border-radius:999px;max-width:90%;"
        : "";

  return `
<style>
  .lov-ctabar { ${positionCss} background:${bg}; color:#fff; padding:14px 24px; display:flex; align-items:center; justify-content:center; gap:18px; font-family:system-ui,sans-serif; font-size:.92rem; ${cfg.mobile_only ? "@media(min-width:768px){display:none;}" : ""} }
  .lov-ctabar .text { flex:1; max-width:600px; }
  .lov-ctabar .btn { background:#fff; color:${bg}; padding:8px 18px; border-radius:6px; text-decoration:none; font-weight:600; font-size:.85rem; white-space:nowrap; }
  .lov-ctabar .x { background:transparent; border:0; color:#fff; font-size:1.1rem; cursor:pointer; opacity:.7; }
</style>
<div class="lov-ctabar">
  <span class="text">${esc(cfg.text || "")}</span>
  ${cfg.cta_label ? `<a class="btn" href="${esc(cfg.cta_url || "#")}">${esc(cfg.cta_label)}</a>` : ""}
  ${cfg.dismissible ? `<button class="x" onclick="this.parentElement.remove()">×</button>` : ""}
</div>`;
}

/* ───── PUBLIC API ───── */
export function renderComponentHtml(
  type: string,
  _variant: string,
  config: Record<string, any>,
  kit: BrandKitLite | null,
): string {
  const safeKit: BrandKitLite = kit ?? {
    primary_color: "#1d4ed8",
    secondary_color: "#ffffff",
    accent_color: "#dc2626",
  };
  switch (type) {
    case "header":
      return renderHeader(config || {}, safeKit);
    case "footer":
      return renderFooter(config || {}, safeKit);
    case "link_block":
      return renderLinkBlock(config || {}, safeKit);
    case "cta_bar":
      return renderCtaBar(config || {}, safeKit);
    default:
      return `<!-- Unknown component type: ${esc(type)} -->`;
  }
}

export function buildComponentPreview(html: string, kit: BrandKitLite | null): string {
  const bg = kit?.secondary_color || "#ffffff";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;background:${bg};min-height:100vh;}</style></head><body>${html}</body></html>`;
}

export const COMPONENT_TYPE_META: Record<
  string,
  { label: string; variants: string[]; defaultConfig: Record<string, any> }
> = {
  header: {
    label: "Header",
    variants: ["minimal", "standard", "full", "mega"],
    defaultConfig: {
      logo_url: "",
      logo_alt: "",
      topbar_active: false,
      topbar_text: "",
      nav_items: [
        { label: "Leistungen", url: "/leistungen" },
        { label: "Über uns", url: "/ueber-uns" },
        { label: "Kontakt", url: "/kontakt" },
      ],
      phone: "",
      phone_visible: false,
      cta_text: "Jetzt anfragen",
      cta_url: "#",
      sticky: true,
    },
  },
  footer: {
    label: "Footer",
    variants: ["minimal", "standard", "rich"],
    defaultConfig: {
      columns: [
        {
          title: "Leistungen",
          links: [
            { label: "Service A", url: "#" },
            { label: "Service B", url: "#" },
          ],
        },
        {
          title: "Unternehmen",
          links: [
            { label: "Über uns", url: "#" },
            { label: "Kontakt", url: "#" },
          ],
        },
      ],
      show_nap: true,
      nap_text: "",
      show_social: false,
      social_links: {},
      legal_links: [
        { label: "Impressum", url: "/impressum" },
        { label: "Datenschutz", url: "/datenschutz" },
      ],
      copyright_text: `© ${new Date().getFullYear()} Alle Rechte vorbehalten`,
      show_logo: true,
      dark_mode: true,
    },
  },
  link_block: {
    label: "Link Block",
    variants: ["grid", "list", "cards"],
    defaultConfig: {
      title: "Schnellzugriff",
      links: [
        { label: "Link 1", url: "#" },
        { label: "Link 2", url: "#" },
        { label: "Link 3", url: "#" },
      ],
      layout: "grid",
      max_visible: 6,
      show_icons: true,
      border_style: "box",
    },
  },
  cta_bar: {
    label: "CTA Bar",
    variants: ["standard", "compact", "promo"],
    defaultConfig: {
      text: "Sichern Sie sich Ihren Beratungstermin",
      cta_label: "Termin buchen",
      cta_url: "#",
      background: "primary",
      custom_bg: "#1d4ed8",
      position: "top",
      dismissible: false,
      mobile_only: false,
    },
  },
};
