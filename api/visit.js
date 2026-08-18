const net = require("net");

function clean(value, limit) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit);
}

function isPublicIp(ip) {
  if (!net.isIP(ip)) return false;
  if (ip === "::1" || ip === "127.0.0.1") return false;
  if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^(fc|fd|fe80):/i.test(ip)) return false;
  return true;
}

function validWebhook(url) {
  return /^https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url);
}

async function lookupGeo(ip) {
  if (!isPublicIp(ip)) return {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const r = await fetch("https://ipapi.co/" + encodeURIComponent(ip) + "/json/", {
      headers: { "User-Agent": "ReignScriptsVisitLogger/1.0" },
      signal: controller.signal
    });
    if (!r.ok) return {};
    const data = await r.json();
    return {
      city: clean(data.city || "Unknown", 80),
      country: clean(data.country_name || data.country || "Unknown", 80),
      isp: clean(data.org || "Unknown", 120)
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const enabled = process.env.LOGGING_ENABLED === "true";
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";
  const geoLookupEnabled = process.env.GEO_LOOKUP !== "false";
  const siteName = process.env.SITE_NAME || "Reign Scripts";

  if (!enabled) return res.status(204).end();
  if (!validWebhook(webhookUrl)) {
    return res.status(503).json({ error: "logging webhook is not configured" });
  }

  const forwarded = clean(req.headers["x-forwarded-for"] || "", 256).split(",")[0].trim();
  const ip = (forwarded || req.socket.remoteAddress || "Unknown").replace(/^::ffff:/, "");

  const event = req.body || {};
  const geo = geoLookupEnabled ? await lookupGeo(ip) : {};

  const embed = {
    title: "New visitor",
    color: 6514417,
    fields: [
      { name: "IP", value: "`" + clean(ip, 64) + "`", inline: true },
      { name: "Location", value: "`" + clean([geo.city, geo.country].filter(Boolean).join(", ") || "Unknown", 170) + "`", inline: true },
      { name: "ISP", value: "`" + clean(geo.isp || "Unknown", 170) + "`", inline: false },
      { name: "Device", value: "`" + clean(event.device || "Unknown", 40) + "`", inline: true },
      { name: "Browser / OS", value: "`" + clean((event.browser || "Unknown") + " / " + (event.os || "Unknown"), 100) + "`", inline: true },
      { name: "Screen", value: "`" + clean((event.screen || "Unknown") + " • " + (event.viewport || "Unknown"), 100) + "`", inline: false },
      { name: "Referrer", value: clean(event.referrer || "Direct", 500), inline: false },
      { name: "Page", value: clean(event.page || "/", 500), inline: false }
    ],
    footer: { text: siteName + " • visit log" },
    timestamp: new Date().toISOString()
  };

  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (!r.ok) return res.status(502).json({ error: "webhook rejected the event" });
    return res.status(204).end();
  } catch {
    return res.status(502).json({ error: "webhook request failed" });
  }
};