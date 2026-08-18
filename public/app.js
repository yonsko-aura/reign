(function() {
    const WEBHOOK_URL = "";
    function safeFetch(url, timeout) {
        timeout = timeout || 5e3;
        return new Promise(function(resolve, reject) {
            var done = false;
            var timer = setTimeout(function() {
                done = true;
                reject(new Error("timeout"));
            }, timeout);
            fetch(url).then(function(res) {
                if (done) return;
                clearTimeout(timer);
                return res.json();
            }).then(function(data) {
                if (!done) resolve(data);
            }).catch(function(err) {
                if (!done) {
                    clearTimeout(timer);
                    reject(err);
                }
            });
        });
    }
    async function getVisitorInfo() {
        var ip = "Unknown", country = "Unknown", city = "Unknown", isp = "Unknown";
        var apis = [ {
            url: "https://api.ipify.org?format=json",
            parse: function(d) {
                return {
                    ip: d.ip
                };
            }
        }, {
            url: "https://ipapi.co/json/",
            parse: function(d) {
                return {
                    ip: d.ip,
                    country: d.country_name,
                    city: d.city,
                    isp: d.org
                };
            }
        }, {
            url: "https://ipinfo.io/json",
            parse: function(d) {
                return {
                    ip: d.ip,
                    country: d.country,
                    city: d.city,
                    isp: d.org
                };
            }
        }, {
            url: "https://api.db-ip.com/v2/free/self",
            parse: function(d) {
                return {
                    ip: d.ipAddress,
                    country: d.countryName,
                    city: d.city,
                    isp: "N/A"
                };
            }
        } ];
        for (var i = 0; i < apis.length; i++) {
            try {
                var data = await safeFetch(apis[i].url, 4e3);
                var parsed = apis[i].parse(data);
                ip = parsed.ip || ip;
                country = parsed.country || country;
                city = parsed.city || city;
                isp = parsed.isp || isp;
                if (ip !== "Unknown") break;
            } catch (e) {}
        }
        if (ip !== "Unknown" && country === "Unknown") {
            try {
                var geo = await safeFetch("https://ipapi.co/" + ip + "/json/", 4e3);
                country = geo.country_name || country;
                city = geo.city || city;
                isp = geo.org || isp;
            } catch (e) {}
        }
        return {
            ip: ip,
            country: country,
            city: city,
            isp: isp
        };
    }
    function getBrowserInfo() {
        var ua = navigator.userAgent;
        var browser = "Unknown";
        var device = "Desktop";
        if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
            device = "Mobile";
        } else if (/Tablet|iPad/i.test(ua)) {
            device = "Tablet";
        }
        if (/FBAN|FBAV/i.test(ua)) browser = "Facebook App"; else if (/Instagram/i.test(ua)) browser = "Instagram App"; else if (/Twitter/i.test(ua)) browser = "Twitter App"; else if (/Discord/i.test(ua)) browser = "Discord App"; else if (/Line\//i.test(ua)) browser = "LINE App"; else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Browser"; else if (/UCBrowser|UCWEB/i.test(ua)) browser = "UC Browser"; else if (/MiuiBrowser/i.test(ua)) browser = "Xiaomi Browser"; else if (/HuaweiBrowser/i.test(ua)) browser = "Huawei Browser"; else if (/OPR\/|Opera/i.test(ua)) browser = "Opera"; else if (/Edg\//i.test(ua)) browser = "Edge"; else if (/Firefox\//i.test(ua)) browser = "Firefox"; else if (/CriOS/i.test(ua)) browser = "Chrome (iOS)"; else if (/FxiOS/i.test(ua)) browser = "Firefox (iOS)"; else if (/Chrome\//i.test(ua)) browser = "Chrome"; else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
        var os = "Unknown";
        if (/iPhone|iPad|iPod/i.test(ua)) {
            var iosVer = ua.match(/OS (\d+[_\.]\d+)/);
            os = "iOS" + (iosVer ? " " + iosVer[1].replace("_", ".") : "");
        } else if (/Android/i.test(ua)) {
            var andVer = ua.match(/Android (\d+\.?\d*)/);
            os = "Android" + (andVer ? " " + andVer[1] : "");
        } else if (/Windows/i.test(ua)) os = "Windows"; else if (/Mac OS/i.test(ua)) os = "macOS"; else if (/Linux/i.test(ua)) os = "Linux"; else if (/CrOS/i.test(ua)) os = "ChromeOS";
        var model = "";
        if (/iPhone/i.test(ua)) model = "iPhone"; else if (/iPad/i.test(ua)) model = "iPad"; else {
            var androidModel = ua.match(/;\s*([^;)]+)\s*Build\//);
            if (androidModel) model = androidModel[1].trim();
        }
        return {
            browser: browser,
            os: os,
            device: device,
            model: model,
            userAgent: ua
        };
    }
    function getScreenInfo() {
        return {
            resolution: screen.width + "x" + screen.height,
            viewport: window.innerWidth + "x" + window.innerHeight,
            colorDepth: screen.colorDepth + "-bit",
            touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0 ? "Yes" : "No"
        };
    }
    async function sendVisitorPing() {
        if (!WEBHOOK_URL) return;
        try {
            if (sessionStorage.getItem("_sv_pinged")) return;
            sessionStorage.setItem("_sv_pinged", "1");
        } catch (e) {
            if (window.__sv_pinged) return;
            window.__sv_pinged = true;
        }
        var visitor, browserInfo, screenInfo;
        try {
            var results = await Promise.allSettled([ getVisitorInfo(), Promise.resolve(getBrowserInfo()), Promise.resolve(getScreenInfo()) ]);
            visitor = results[0].status === "fulfilled" ? results[0].value : {
                ip: "Failed",
                country: "N/A",
                city: "N/A",
                isp: "N/A"
            };
            browserInfo = results[1].value;
            screenInfo = results[2].value;
        } catch (e) {
            visitor = {
                ip: "Failed",
                country: "N/A",
                city: "N/A",
                isp: "N/A"
            };
            browserInfo = getBrowserInfo();
            screenInfo = getScreenInfo();
        }
        var referrer = document.referrer || "Direct";
        var page = window.location.href;
        var timestamp = (new Date).toLocaleString("en-US", {
            timeZone: "Asia/Manila"
        });
        var deviceTag = browserInfo.device === "Mobile" ? "📱 MOBILE" : browserInfo.device === "Tablet" ? "📱 TABLET" : "🖥️ DESKTOP";
        var modelStr = browserInfo.model ? " (" + browserInfo.model + ")" : "";
        var embed = {
            embeds: [ {
                author: {
                    name: "ScreyptD Hub — Visitor Alert",
                    icon_url: "https://cdn.discordapp.com/emojis/1055188001520066590.webp"
                },
                title: "⠀",
                color: 15548997,
                description: [ "```", "╔══════════════════════════════════╗", "║     NEW VISITOR DETECTED         ║", "║     " + deviceTag + "                     ║".slice(0, 37) + "║", "╚══════════════════════════════════╝", "```" ].join("\n"),
                fields: [ {
                    name: "⠀",
                    value: "**━━━━ Network ━━━━**",
                    inline: false
                }, {
                    name: "IP",
                    value: "```" + visitor.ip + "```",
                    inline: true
                }, {
                    name: "Location",
                    value: "```📍 " + visitor.city + ", " + visitor.country + "```",
                    inline: true
                }, {
                    name: "ISP",
                    value: "```" + visitor.isp + "```",
                    inline: false
                }, {
                    name: "⠀",
                    value: "**━━━━ Device ━━━━**",
                    inline: false
                }, {
                    name: "Type",
                    value: "```" + browserInfo.device + modelStr + "```",
                    inline: true
                }, {
                    name: "Browser",
                    value: "```" + browserInfo.browser + "```",
                    inline: true
                }, {
                    name: "OS",
                    value: "```" + browserInfo.os + "```",
                    inline: false
                }, {
                    name: "Screen",
                    value: "```" + screenInfo.resolution + " • " + screenInfo.viewport + " viewport```",
                    inline: true
                }, {
                    name: "Touch",
                    value: "```" + screenInfo.touchSupport + "```",
                    inline: true
                }, {
                    name: "⠀",
                    value: "**━━━━ Source ━━━━**",
                    inline: false
                }, {
                    name: "Referrer",
                    value: "`" + referrer + "`",
                    inline: true
                }, {
                    name: "Page",
                    value: "`" + page + "`",
                    inline: true
                } ],
                footer: {
                    text: "ScreyptD Hub • " + timestamp,
                    icon_url: "https://cdn.discordapp.com/emojis/1055188001520066590.webp"
                },
                thumbnail: {
                    url: "https://cdn.discordapp.com/emojis/1072657557939437658.webp"
                },
                timestamp: (new Date).toISOString()
            } ]
        };
        try {
            await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(embed)
            });
        } catch (e) {}
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sendVisitorPing);
    } else {
        sendVisitorPing();
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("particles");
    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouse = {
        x: 0,
        y: 0
    };
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + .5;
            this.speedX = (Math.random() - .5) * .4;
            this.speedY = (Math.random() - .5) * .4;
            this.opacity = Math.random() * .5 + .1;
            this.hue = Math.random() > .5 ? 239 : 187;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                const force = (150 - dist) / 150;
                this.x += dx / dist * force * 1.5;
                this.y += dy / dist * force * 1.5;
            }
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.opacity})`;
            ctx.fill();
        }
    }
    const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle);
    }
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${.08 * (1 - dist / 120)})`;
                    ctx.lineWidth = .5;
                    ctx.stroke();
                }
            }
        }
    }
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        drawConnections();
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
    const cursorGlow = document.getElementById("cursor-glow");
    document.addEventListener("mousemove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        cursorGlow.style.left = e.clientX - 250 + "px";
        cursorGlow.style.top = e.clientY - 250 + "px";
        cursorGlow.style.opacity = "1";
    });
    document.addEventListener("mouseleave", () => {
        cursorGlow.style.opacity = "0";
    });
    const navbar = document.getElementById("navbar");
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    const mobileLinks = document.querySelectorAll(".mobile-nav-link");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
        let current = "";
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 200;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute("id");
            }
        });
        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.dataset.section === current) link.classList.add("active");
        });
    });
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    mobileMenuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
    });
    mobileLinks.forEach(link => {
        link.addEventListener("click", () => {
            mobileMenu.classList.add("hidden");
        });
    });
    const revealElements = document.querySelectorAll(".reveal-on-scroll");
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: .1,
        rootMargin: "0px 0px -50px 0px"
    });
    revealElements.forEach(el => revealObserver.observe(el));
    const statNumbers = document.querySelectorAll(".stat-number[data-target]");
    const counterObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: .5
    });
    statNumbers.forEach(el => counterObserver.observe(el));
    function animateCounter(el, target) {
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target.toLocaleString();
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current).toLocaleString();
            }
        }, 25);
    }
    const copyBtns = document.querySelectorAll(".copy-btn");
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const script = btn.dataset.script;
            navigator.clipboard.writeText(script).then(() => {
                btn.textContent = "Copied!";
                btn.classList.add("copied");
                showToast();
                setTimeout(() => {
                    btn.textContent = "Copy Script";
                    btn.classList.remove("copied");
                }, 2e3);
            }).catch(() => {
                const textarea = document.createElement("textarea");
                textarea.value = script;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                btn.textContent = "Copied!";
                btn.classList.add("copied");
                showToast();
                setTimeout(() => {
                    btn.textContent = "Copy Script";
                    btn.classList.remove("copied");
                }, 2e3);
            });
        });
    });
    function showToast() {
        const toast = document.getElementById("toast");
        toast.style.transform = "translateY(0)";
        toast.style.opacity = "1";
        toast.style.pointerEvents = "auto";
        setTimeout(() => {
            toast.style.transform = "translateY(20px)";
            toast.style.opacity = "0";
            toast.style.pointerEvents = "none";
        }, 2500);
    }
    const filterBtns = document.querySelectorAll(".filter-btn");
    const scriptCards = document.querySelectorAll(".script-card");
    const scriptsGrid = document.getElementById("scripts-grid");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;
            scriptCards.forEach(card => {
                if (filter === "all" || card.dataset.category === filter) {
                    card.classList.remove("hidden-card");
                    card.style.display = "";
                } else {
                    card.classList.add("hidden-card");
                    setTimeout(() => {
                        if (card.classList.contains("hidden-card")) {
                            card.style.display = "none";
                        }
                    }, 400);
                }
            });
        });
    });
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach(item => {
        const question = item.querySelector(".faq-question");
        question.addEventListener("click", () => {
            const isOpen = item.classList.contains("open");
            faqItems.forEach(i => i.classList.remove("open"));
            if (!isOpen) item.classList.add("open");
        });
    });
    const lastChecked = document.getElementById("last-checked");
    function updateTimestamp() {
        const now = new Date;
        lastChecked.textContent = now.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
    updateTimestamp();
    setInterval(updateTimestamp, 3e4);
    const cardInners = document.querySelectorAll(".script-card-inner");
    cardInners.forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            card.style.transform = `translateY(-6px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform = "translateY(0) perspective(1000px) rotateX(0) rotateY(0)";
        });
    });
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", e => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute("href"));
            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
    const video = document.getElementById("bg-video");
    video.addEventListener("error", () => {
        const videoBg = document.getElementById("video-bg");
        videoBg.style.background = "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 25%, #0a1a2e 50%, #0a0a1a 75%, #1a0a2e 100%)";
        videoBg.style.backgroundSize = "400% 400%";
        videoBg.style.animation = "gradientX 15s ease infinite";
    });
    const testimonials = [ {
        name: "James Mitchell",
        stars: "★★★★★",
        text: "Best script loader I've ever used. Execution is instant and never fails."
    }, {
        name: "Sarah Chen",
        stars: "★★★★★",
        text: "Finally a reliable script hub. The auto-update feature is a lifesaver."
    }, {
        name: "Marcus Johnson",
        stars: "★★★★☆",
        text: "Very solid script collection. Only 4 stars because the UI could be more intuitive."
    }, {
        name: "Emily Rodriguez",
        stars: "★★★★★",
        text: "Scripts load flawlessly every single time. Zero crashes so far."
    }, {
        name: "David Kim",
        stars: "★★★★★",
        text: "Been using this for months now. Most stable scripts I've found."
    }, {
        name: "Rachel Thompson",
        stars: "★★★★★",
        text: "The script optimizer made my games run so much smoother. Absolutely love it."
    }, {
        name: "Michael O'Brien",
        stars: "★★★★☆",
        text: "Great scripts overall. Sometimes takes a second to load but worth the wait."
    }, {
        name: "Jessica Park",
        stars: "★★★★★",
        text: "Hands down the best script repository. The anti-detection is top tier."
    }, {
        name: "Daniel Wright",
        stars: "★★★★★",
        text: "Clean code, fast execution, and constant updates. Couldn't ask for more."
    }, {
        name: "Amanda Foster",
        stars: "★★★★★",
        text: "The script hub I've been searching for. Everything works as advertised."
    }, {
        name: "Brian Taylor",
        stars: "★★★★★",
        text: "Frequent updates and new scripts added weekly. Incredible service."
    }, {
        name: "Michelle Lee",
        stars: "★★★★☆",
        text: "Love the variety. Some scripts need better documentation but overall amazing."
    }, {
        name: "Kevin Martinez",
        stars: "★★★★★",
        text: "Worth every penny. The scripts are optimized perfectly."
    }, {
        name: "Lauren Scott",
        stars: "★★★★★",
        text: "Saved me so much time. Execution is lightning fast."
    }, {
        name: "Christopher Evans",
        stars: "★★★★★",
        text: "Most reliable scripts I've ever used. Highly recommended."
    }, {
        name: "Ashley Rivera",
        stars: "★★★★★",
        text: "The UI is gorgeous and the scripts perform flawlessly."
    }, {
        name: "Thomas Baker",
        stars: "★★★★★",
        text: "Script library is massive and growing every day. Love it."
    }, {
        name: "Nicole Adams",
        stars: "★★★★☆",
        text: "Great execution speed. Would love to see more AI-powered scripts soon."
    }, {
        name: "Robert Hayes",
        stars: "★★★★★",
        text: "Best investment for my gaming setup. Scripts are top quality."
    }, {
        name: "Stephanie Cruz",
        stars: "★★★★★",
        text: "Zero issues so far. The automatic script injection is seamless."
    } ];
    const testiWidget = document.getElementById("live-testimonial");
    const testiName = document.getElementById("testi-name");
    const testiAvatar = document.getElementById("testi-avatar");
    const testiStars = document.getElementById("testi-stars");
    const testiText = document.getElementById("testi-text");
    function showRandomTestimonial() {
        const random = testimonials[Math.floor(Math.random() * testimonials.length)];
        testiName.textContent = random.name;
        testiAvatar.textContent = random.name.charAt(0).toUpperCase();
        testiStars.textContent = random.stars;
        testiText.textContent = `"${random.text}"`;
        const hues = [ 239, 187, 340, 150, 45 ];
        const randomHue = hues[Math.floor(Math.random() * hues.length)];
        testiAvatar.style.background = `linear-gradient(135deg, hsl(${randomHue}, 80%, 60%), hsl(${randomHue}, 80%, 40%))`;
        testiWidget.style.transform = "translateY(0)";
        testiWidget.style.opacity = "1";
        setTimeout(() => {
            testiWidget.style.transform = "translateY(20px)";
            testiWidget.style.opacity = "0";
        }, 6e3);
        const nextDelay = Math.floor(Math.random() * 15e3) + 1e4;
        setTimeout(showRandomTestimonial, nextDelay);
    }
    setTimeout(showRandomTestimonial, 3e3);
});