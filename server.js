"use strict";

const http = require("node:http");

const fs = require("node:fs");

const path = require("node:path");

const net = require("node:net");

const ROOT = __dirname;

const PUBLIC = path.join(ROOT, "public");

const CONFIG = path.join(ROOT, "config.json");

const PORT = Number(process.argv[2] || 8088);

const MAX_BODY = 24 * 1024;

const recent = new Map;

const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

function readConfig() {
    try {
        const parsed = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
        return {
            enabled: parsed.enabled === true,
            webhookUrl: typeof parsed.webhookUrl === "string" ? parsed.webhookUrl.trim() : "",
            geoLookup: parsed.geoLookup !== false,
            trustProxy: parsed.trustProxy === true,
            rateLimitSeconds: Math.min(3600, Math.max(1, Number(parsed.rateLimitSeconds) || 30)),
            siteName: clean(parsed.siteName || "Bloxified", 80)
        };
    } catch (error) {
        console.error("[config] Unable to read config.json:", error.message);
        return {
            enabled: false,
            webhookUrl: "",
        geoLookup: false,
        trustProxy: false,
            rateLimitSeconds: 30,
            siteName: "Bloxified"
        };
    }
}

function clean(value, limit) {
    return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit);
}

function requestIp(req, config) {
    const forwarded = config.trustProxy ? clean(req.headers["x-forwarded-for"] || "", 256).split(",")[0].trim() : "";
    const candidate = forwarded || req.socket.remoteAddress || "Unknown";
    return candidate.startsWith("::ffff:") ? candidate.slice(7) : candidate;
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

function sendJson(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store"
    });
    res.end(body);
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", chunk => {
            size += chunk.length;
            if (size > MAX_BODY) {
                reject(new Error("request body exceeds limit"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
            } catch {
                reject(new Error("invalid JSON"));
            }
        });
        req.on("error", reject);
    });
}

async function lookupGeo(ip) {
    if (!isPublicIp(ip)) return {};
    const controller = new AbortController;
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
        const response = await fetch("https://ipapi.co/" + encodeURIComponent(ip) + "/json/", {
            headers: {
                "User-Agent": "BloxifiedVisitLogger/1.0"
            },
            signal: controller.signal
        });
        if (!response.ok) return {};
        const data = await response.json();
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

async function logVisit(req, res) {
    const config = readConfig();
    if (!config.enabled) return sendJson(res, 204, {});
    if (!validWebhook(config.webhookUrl)) return sendJson(res, 503, {
        error: "logging webhook is not configured"
    });
    const ip = requestIp(req, config);
    const now = Date.now();
    const prior = recent.get(ip) || 0;
    if (now - prior < config.rateLimitSeconds * 1e3) return sendJson(res, 204, {});
    recent.set(ip, now);
    if (recent.size > 5e3) {
        const cutoff = now - config.rateLimitSeconds * 2e3;
        for (const [key, value] of recent) if (value < cutoff) recent.delete(key);
    }
    let event;
    try {
        event = await readJson(req);
    } catch (error) {
        return sendJson(res, 400, {
            error: error.message
        });
    }
    const geo = config.geoLookup ? await lookupGeo(ip) : {};
    const embed = {
        title: "New visitor",
        color: 6514417,
        fields: [ {
            name: "IP",
            value: "`" + clean(ip, 64) + "`",
            inline: true
        }, {
            name: "Location",
            value: "`" + clean([ geo.city, geo.country ].filter(Boolean).join(", ") || "Unknown", 170) + "`",
            inline: true
        }, {
            name: "ISP",
            value: "`" + clean(geo.isp || "Unknown", 170) + "`",
            inline: false
        }, {
            name: "Device",
            value: "`" + clean(event.device || "Unknown", 40) + "`",
            inline: true
        }, {
            name: "Browser / OS",
            value: "`" + clean((event.browser || "Unknown") + " / " + (event.os || "Unknown"), 100) + "`",
            inline: true
        }, {
            name: "Screen",
            value: "`" + clean((event.screen || "Unknown") + " • " + (event.viewport || "Unknown"), 100) + "`",
            inline: false
        }, {
            name: "Referrer",
            value: clean(event.referrer || "Direct", 500),
            inline: false
        }, {
            name: "Page",
            value: clean(event.page || "/", 500),
            inline: false
        } ],
        footer: {
            text: config.siteName + " • visit log"
        },
        timestamp: (new Date).toISOString()
    };
    try {
        const response = await fetch(config.webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                embeds: [ embed ]
            })
        });
        if (!response.ok) {
            console.error("[logger] Webhook returned", response.status);
            return sendJson(res, 502, {
                error: "webhook rejected the event"
            });
        }
        return sendJson(res, 204, {});
    } catch (error) {
        console.error("[logger] Webhook request failed:", error.message);
        return sendJson(res, 502, {
            error: "webhook request failed"
        });
    }
}

function serveStatic(req, res) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
        res.writeHead(400).end("Bad request");
        return;
    }
    if (pathname === "/") pathname = "/index.html";
    const resolved = path.resolve(PUBLIC, "." + pathname);
    if (!resolved.startsWith(PUBLIC + path.sep)) {
        res.writeHead(403).end("Forbidden");
        return;
    }
    fs.stat(resolved, (error, stat) => {
        if (error || !stat.isFile()) {
            res.writeHead(404).end("Not found");
            return;
        }
        res.writeHead(200, {
            "Content-Type": mime[path.extname(resolved).toLowerCase()] || "application/octet-stream",
            "Content-Length": stat.size,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        });
        if (req.method === "HEAD") return res.end();
        fs.createReadStream(resolved).pipe(res);
    });
}

const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/visit") {
        logVisit(req, res).catch(error => {
            console.error("[logger] Unexpected failure:", error);
            if (!res.headersSent) sendJson(res, 500, {
                error: "internal error"
            });
        });
        return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, {
            Allow: "GET, HEAD, POST"
        }).end("Method not allowed");
        return;
    }
    serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
    const config = readConfig();
    console.log("Bloxified server listening on http://0.0.0.0:" + PORT);
    console.log("Visit logging:", config.enabled && validWebhook(config.webhookUrl) ? "enabled" : "disabled");
});
