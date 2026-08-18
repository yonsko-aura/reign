module.exports = async (req, res) => {
  // 1. Enforce GET/POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  
  // 2. Protect cron endpoint using Vercel CRON_SECRET pattern
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     return res.status(401).json({ error: "Unauthorized" });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!webhookUrl || !kvUrl || !kvToken) {
     return res.status(503).json({ error: "Server configuration missing" });
  }

  // 3. Define the counting window (UTC Yesterday)
  // Cron runs daily at 00:01 UTC for the previous day.
  const yesterday = new Date(Date.now() - 86400000);
  const dateStr = yesterday.toISOString().split('T')[0];
  const countKey = `visits:${dateStr}`;
  const lockKey = `cron_sent:${dateStr}`;

  try {
    // 4. Lock to prevent duplicate summaries (Atomic SET NX)
    // Lock expires in 24 hours
    const lockRes = await fetch(`${kvUrl}/set/${lockKey}/1/NX/PX/86400000`, {
       headers: { Authorization: `Bearer ${kvToken}` }
    });
    const lockData = await lockRes.json();
    if (lockData.result !== "OK") {
       return res.status(200).json({ message: "Summary already sent for this reporting window" });
    }

    // 5. Get aggregate count from durable storage
    const countRes = await fetch(`${kvUrl}/get/${countKey}`, {
       headers: { Authorization: `Bearer ${kvToken}` }
    });
    const countData = await countRes.json();
    const count = parseInt(countData.result || "0", 10);

    // Skip zero visits (configurable behavior)
    if (count === 0 && process.env.SKIP_ZERO_VISIT_SUMMARY === "true") {
       return res.status(200).json({ message: "Skipped zero-visit summary" });
    }

    // 6. Send summary to private Discord webhook
    const embed = {
      title: "Daily Aggregate Visit Summary",
      color: 6514417,
      fields: [
        { name: "Reporting Date (UTC)", value: dateStr, inline: true },
        { name: "Opted-in Visits", value: count.toString(), inline: true }
      ],
      footer: { text: "Aggregate Analytics" },
      timestamp: new Date().toISOString()
    };

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
          embeds: [embed],
          allowed_mentions: { parse: [] }
      })
    });

    if (!discordRes.ok) {
       return res.status(502).json({ error: "Webhook delivery failed" });
    }

    return res.status(200).json({ message: "Aggregate summary sent successfully" });
  } catch {
    return res.status(502).json({ error: "Internal processing failed" });
  }
};