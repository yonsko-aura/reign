"use strict";

(function() {
    if (window.__bloxifiedVisitLogged) return;
    window.__bloxifiedVisitLogged = true;
    var storageKey = "_bloxified_visit_logged";
    try {
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, "1");
    } catch (_) {}
    function browserName(ua) {
        if (/Discord/i.test(ua)) return "Discord App";
        if (/Edg\//i.test(ua)) return "Edge";
        if (/OPR\/|Opera/i.test(ua)) return "Opera";
        if (/Firefox\//i.test(ua)) return "Firefox";
        if (/Chrome\//i.test(ua)) return "Chrome";
        if (/Safari\//i.test(ua)) return "Safari";
        return "Unknown";
    }
    function operatingSystem(ua) {
        if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
        if (/Android/i.test(ua)) return "Android";
        if (/Windows/i.test(ua)) return "Windows";
        if (/Mac OS/i.test(ua)) return "macOS";
        if (/CrOS/i.test(ua)) return "ChromeOS";
        if (/Linux/i.test(ua)) return "Linux";
        return "Unknown";
    }
    var ua = navigator.userAgent || "";
    var isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
    var event = {
        page: location.href,
        referrer: document.referrer || "Direct",
        browser: browserName(ua),
        os: operatingSystem(ua),
        device: isMobile ? "Mobile" : "Desktop",
        userAgent: ua,
        screen: screen.width + "x" + screen.height,
        viewport: innerWidth + "x" + innerHeight,
        touch: Boolean("ontouchstart" in window || navigator.maxTouchPoints > 0),
        language: navigator.language || "Unknown"
    };
    fetch("/api/visit", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
    }).catch(function() {});
})();