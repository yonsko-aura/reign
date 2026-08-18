const crypto = require("crypto");

module.exports = async (req, res) => {
  // 1. Only POST requests allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Enforce the body-size limit before JSON processing (Vercel parses body by default, 
  // but we can check headers to defensively reject oversized payloads before trusting the parsed object).
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10240) { // 10kb
    return res.status(413).json({ error: "Payload Too Large" });
  }

  // 3. Strict schema validation
  const event = req.body;
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return res.status(400).json({ error: "Invalid payload format" });
  }
  
  // Exact field allowlist
  const keys = Object.keys(event);
  if (keys.length !== 1 || keys[0] !== 'event' || event.event !== 'visit') {
    return res.status(400).json({ error: "Invalid payload schema" });
  }

  const enabled = process.env.LOGGING_ENABLED === "true";
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const hmacSecret = process.env.RATE_LIMIT_SECRET;

  if (!enabled) return res.status(204).end();

  // If storage isn't configured, we fail safely without exposing internals
  if (!kvUrl || !kvToken || !hmacSecret) {
    return res.status(503).json({ error: "Analytics storage is not configured" });
  }

  // 4. Trusted IP parsing (Vercel Edge headers)
  const vercelIp = req.headers["x-vercel-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  
  // Do not trust arbitrary headers if not behind Vercel. 
  // If the edge headers exist, we use them for rate-limiting anti-abuse.
  const rawIp = vercelIp || realIp || req.socket.remoteAddress || "Unknown";
  const ip = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

  // 5. Rate limiting with short-lived keyed hash (never persist raw IP)
  const ipHash = crypto.createHmac('sha256', hmacSecret).update(ip).digest('hex');
  const rateLimitKey = `rl:${ipHash}`;

  try {
    // Atomic SET NX PX 60000 (1 minute TTL)
    const rlRes = await fetch(`${kvUrl}/set/${rateLimitKey}/1/NX/PX/60000`, {
       headers: { Authorization: `Bearer ${kvToken}` }
    });
    if (!rlRes.ok) return res.status(502).json({ error: "Storage error" });
    
    const rlData = await rlRes.json();
    if (rlData.result !== "OK") {
       return res.status(429).json({ error: "Too Many Requests" });
    }

    // 6. Atomic durable aggregate counter (UTC daily window)
    const today = new Date().toISOString().split('T')[0];
    const countKey = `visits:${today}`;
    
    const countRes = await fetch(`${kvUrl}/incr/${countKey}`, {
       headers: { Authorization: `Bearer ${kvToken}` }
    });
    if (!countRes.ok) return res.status(502).json({ error: "Storage error" });

    return res.status(204).end();
  } catch {
    return res.status(502).json({ error: "Storage request failed" });
  }
};