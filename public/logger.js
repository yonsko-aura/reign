"use strict";

(function() {
    if (window.__reignVisitLogged) return;
    const storageKey = "_reign_visit_logged";

    function logVisit() {
        if (window.__reignVisitLogged) return;
        window.__reignVisitLogged = true;
        
        try {
            if (sessionStorage.getItem(storageKey)) return;
            sessionStorage.setItem(storageKey, "1");
        } catch (_) {}
        
        fetch("/api/visit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ event: "visit" })
        }).catch(() => {});
    }

    // Log the visit immediately without a banner
    logVisit();
})();