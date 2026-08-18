"use strict";

(function() {
    if (window.__reignVisitLogged) return;
    const storageKey = "_reign_visit_logged";
    const consentKey = "_reign_cookie_consent";

    function logVisit() {
        if (window.__reignVisitLogged) return;
        window.__reignVisitLogged = true;
        
        try {
            if (sessionStorage.getItem(storageKey)) return;
            sessionStorage.setItem(storageKey, "1");
        } catch (_) {}
        
        const payload = {
            page: window.location.pathname || "/",
            referrer: document.referrer || "Direct"
        };
        
        fetch("/api/visit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).catch(err => {
            // Silently swallow errors to prevent console spam
        });
    }

    // Check for explicit consent
    let hasConsent = false;
    try {
        hasConsent = localStorage.getItem(consentKey) === "granted";
    } catch (_) {}

    if (hasConsent) {
        logVisit();
    } else {
        // Show privacy consent banner
        document.addEventListener("DOMContentLoaded", () => {
            const banner = document.createElement("div");
            banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #333;padding:16px;text-align:center;z-index:9999;font-family:sans-serif;font-size:13px;color:#ccc;";
            banner.innerHTML = `
                <div style="max-width:800px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
                    <div style="text-align:left;flex:1;min-width:280px;">
                        <strong>Privacy Notice:</strong> We use basic analytics to monitor site traffic. We log your IP (to prevent abuse) and referring page. We do not track your browser, device, or precise location.
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button id="consent-decline" style="background:transparent;border:1px solid #555;color:#ccc;padding:8px 16px;border-radius:6px;cursor:pointer;">Decline</button>
                        <button id="consent-accept" style="background:#f2c94c;border:none;color:#111;font-weight:bold;padding:8px 16px;border-radius:6px;cursor:pointer;">Accept</button>
                    </div>
                </div>
            `;
            document.body.appendChild(banner);

            document.getElementById("consent-accept").addEventListener("click", () => {
                try { localStorage.setItem(consentKey, "granted"); } catch (_) {}
                banner.remove();
                logVisit();
            });

            document.getElementById("consent-decline").addEventListener("click", () => {
                try { localStorage.setItem(consentKey, "declined"); } catch (_) {}
                banner.remove();
            });
        });
    }
})();