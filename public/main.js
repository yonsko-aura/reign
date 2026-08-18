document.addEventListener("DOMContentLoaded", () => {
    // Nav slide logic
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        const header = document.querySelector('header');
        if (currentScroll > lastScroll && currentScroll > 50) {
            header.classList.add('nav-hidden');
        } else {
            header.classList.remove('nav-hidden');
        }
        lastScroll = currentScroll;
    });

    // Reveal on scroll logic
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => revealObserver.observe(el));

    // Copy script logic
    const copyBtns = document.querySelectorAll(".copy-btn");
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const script = btn.dataset.script;
            navigator.clipboard.writeText(script).then(() => {
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                showToast();
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }).catch(() => {
                const textarea = document.createElement("textarea");
                textarea.value = script;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                showToast();
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        });
    });
    function showToast() {
        const toast = document.getElementById("toast");
        toast.style.transform = "translateY(0)";
        toast.style.opacity = "1";
        setTimeout(() => {
            toast.style.transform = "translateY(20px)";
            toast.style.opacity = "0";
        }, 2500);
    }

    // FAQ logic
    const faqQuestions = document.querySelectorAll('.faq-q');
    faqQuestions.forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            item.classList.toggle('open');
        });
    });

    // Navbar highlighting logic
    const sections = document.querySelectorAll('section[id], .hero');
    const navLinks = document.querySelectorAll('nav a');
    
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                let id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    let href = link.getAttribute('href');
                    if (id && href === '#' + id) {
                        link.classList.add('active');
                    } else if (!id && href === '#') {
                        // The .hero section corresponds to "Home" (#)
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { threshold: 0.2, rootMargin: "-10% 0px -50% 0px" });

    sections.forEach(sec => navObserver.observe(sec));
});
