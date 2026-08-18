const net = require("net");

function clean(value, limit) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit);
}

function validWebhook(url) {
  return /^https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url);
}

// Simple in-memory rate limiting (best-effort for serverless)
// Limitations: In a serverless environment (like Vercel), instances scale up and down independently.
// This in-memory Map only rate-limits requests hitting the same active container.
// It will reset on cold starts and does not share state across regions/instances.
// For robust global rate limiting, a durable store (like Redis/Upstash) is required.
const rateLimitCache = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 5;

  // Cleanup old entries to prevent memory leak
  if (rateLimitCache.size > 1000) {
    const expireTime = now - windowMs;
    for (const [key, val] of rateLimitCache.entries()) {
        if (val.startTime < expireTime) rateLimitCache.delete(key);
    }
  }

  const record = rateLimitCache.get(ip) || { count: 0, startTime: now };
  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count++;
  }
  rateLimitCache.set(ip, record);
  return record.count > maxRequests;
}

module.exports = async (req, res) => {
  // 1. Only POST requests allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Small request-body limit
  // Vercel parses JSON bodies automatically. Let's strictly validate the size of the payload.
  const rawBody = JSON.stringify(req.body || {});
  if (rawBody.length > 2048) {
    return res.status(413).json({ error: "Payload Too Large" });
  }

  // 3. Strict schema validation
  const event = req.body;
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return res.status(400).json({ error: "Invalid payload format" });
  }
  
  // Enforce types and limits on expected fields
  const page = clean(event.page || "/", 200);
  const referrer = clean(event.referrer || "Direct", 200);
  // We explicitly stopped collecting browser, OS, language, screen size, etc. to reduce privacy risks.

  const enabled = process.env.LOGGING_ENABLED === "true";
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";
  const siteName = process.env.SITE_NAME || "Reign Scripts";

  if (!enabled) return res.status(204).end();
  if (!validWebhook(webhookUrl)) {
    return res.status(503).json({ error: "Logging webhook is not configured" });
  }

  // 4. Trusted IP parsing
  // Vercel sets x-vercel-forwarded-for and x-real-ip. We prefer x-vercel-forwarded-for as it's directly from Vercel's edge.
  const vercelIp = req.headers["x-vercel-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const isTrustedIp = Boolean(vercelIp || realIp);
  
  // Use the trusted IP if available, otherwise fallback but mark it as unverified
  const rawIp = vercelIp || realIp || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
  const ip = clean(rawIp.split(",")[0].trim(), 64).replace(/^::ffff:/, "");

  // 5. Rate limiting (after IP resolution, before external calls)
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too Many Requests" });
  }

  // 6. Discord Webhook Payload
  // Geo-location lookup via ipapi.co was removed to protect visitor privacy and reduce third-party dependencies.
  const embed = {
    title: "New Visitor Logged",
    color: 6514417,
    fields: [
      { name: "IP Address", value: "`" + ip + "` " + (isTrustedIp ? "*(Verified)*" : "*(Unverified)*"), inline: true },
      { name: "Page", value: page, inline: false },
      { name: "Referrer", value: referrer, inline: false }
    ],
    footer: { text: siteName + " • Privacy-focused log" },
    timestamp: new Date().toISOString()
  };

  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
          embeds: [embed],
          allowed_mentions: { parse: [] } // Defense in depth against malicious payloads
      })
    });
    if (!r.ok) return res.status(502).json({ error: "Webhook rejected the event" });
    return res.status(204).end();
  } catch {
    return res.status(502).json({ error: "Webhook request failed" });
  }
};