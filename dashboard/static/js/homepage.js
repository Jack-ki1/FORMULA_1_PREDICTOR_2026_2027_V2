(() => {
    const root = document.documentElement;

    /* ---------- THEME ---------- */
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const savedTheme = localStorage.getItem("f1-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;

    root.dataset.theme = savedTheme || (prefersLight ? "light" : "dark");

    function syncTheme() {
        const light = root.dataset.theme === "light";
        themeIcon.className = "theme-icon fa-regular " + (light ? "fa-moon" : "fa-sun") + " text-xs";
        themeToggle?.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");

        document.querySelector('meta[name="theme-color"]')?.setAttribute(
            "content",
            light ? "#f2f2ee" : "#07080b"
        );
    }

    syncTheme();

    themeToggle?.addEventListener("click", () => {
        root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("f1-theme", root.dataset.theme);
        syncTheme();
    });

    /* ---------- MOBILE NAV ---------- */
    const menuBtn = document.getElementById("menuBtn");
    const mobileDrawer = document.getElementById("mobileDrawer");

    menuBtn?.addEventListener("click", () => {
        const open = mobileDrawer.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.innerHTML = `<i class="fa-solid ${open ? "fa-xmark" : "fa-bars"}"></i>`;
    });

    mobileDrawer?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mobileDrawer.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
            menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        });
    });

    /* ---------- SEARCH / COMMAND PALETTE ---------- */
    const searchBtn = document.getElementById("searchBtn");
    const searchModal = document.getElementById("searchModal");
    const closeSearch = document.getElementById("closeSearch");
    const searchInput = document.getElementById("searchInput");
    const results = [...document.querySelectorAll(".search-result")];

    function toggleSearch(open) {
        searchModal?.classList.toggle("open", open);
        if (open) {
            searchInput.value = "";
            results.forEach(item => item.classList.remove("hidden"));
            setTimeout(() => searchInput.focus(), 40);
        }
    }

    searchBtn?.addEventListener("click", () => toggleSearch(true));
    closeSearch?.addEventListener("click", () => toggleSearch(false));

    searchModal?.addEventListener("click", event => {
        if (event.target === searchModal) toggleSearch(false);
    });

    searchInput?.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        results.forEach(item => {
            const haystack = `${item.dataset.search} ${item.textContent}`.toLowerCase();
            item.classList.toggle("hidden", Boolean(q) && !haystack.includes(q));
        });
    });

    /* ---------- KEYBOARD SHORTCUTS ---------- */
    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            toggleSearch(true);
        }

        if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
            event.preventDefault();
            toggleSearch(true);
        }

        if (event.key.toLowerCase() === "t" && document.activeElement?.tagName !== "INPUT") {
            root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
            localStorage.setItem("f1-theme", root.dataset.theme);
            syncTheme();
        }

        if (event.key === "Escape") toggleSearch(false);
    });

    /* ---------- SCROLL REVEAL ---------- */
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.11 });

    document.querySelectorAll(".reveal,.stagger").forEach(el => revealObserver.observe(el));

    /* ---------- READING PROGRESS ---------- */
    const progress = document.getElementById("readingProgress");

    function updateProgress() {
        const scrollTop = window.scrollY;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = height > 0 ? scrollTop / height : 0;
        if (progress) progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    }

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    /* ---------- HERO PARALLAX ---------- */
    const hero = document.querySelector(".hero");
    const heroVideo = document.getElementById("heroVideo");

    if (
        hero &&
        heroVideo &&
        window.matchMedia("(pointer:fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        hero.addEventListener("pointermove", event => {
            const rect = hero.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;

            heroVideo.style.transform =
                `scale(1.05) translate(${x * -10}px, ${y * -8}px)`;
        });

        hero.addEventListener("pointerleave", () => {
            heroVideo.style.transform = "scale(1.035)";
        });
    }

    /* ---------- MAGNETIC BUTTONS ---------- */
    if (
        window.matchMedia("(pointer:fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        document.querySelectorAll(".magnetic").forEach(button => {
            button.addEventListener("pointermove", event => {
                const rect = button.getBoundingClientRect();
                const x = event.clientX - (rect.left + rect.width / 2);
                const y = event.clientY - (rect.top + rect.height / 2);

                button.style.transform =
                    `translate(${x * .09}px, ${y * .09}px)`;
            });

            button.addEventListener("pointerleave", () => {
                button.style.transform = "";
            });
        });
    }

    /* ---------- CARD TILT ---------- */
    if (
        window.matchMedia("(pointer:fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        document.querySelectorAll(".panel-hover").forEach(card => {
            card.addEventListener("pointermove", event => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - .5;
                const y = (event.clientY - rect.top) / rect.height - .5;

                card.style.transform =
                    `perspective(1200px) rotateX(${(-y * 1.8).toFixed(2)}deg) rotateY(${(x * 1.8).toFixed(2)}deg) translateY(-7px)`;
            });

            card.addEventListener("pointerleave", () => {
                card.style.transform = "";
            });
        });
    }

    /* ---------- SMART VIDEO CONTROLS ---------- */
    document.querySelectorAll("video[data-video]").forEach(video => {
        video.setAttribute("preload", "metadata");

        video.addEventListener("error", () => {
            video.style.display = "none";
        });
    });

    document.querySelectorAll(".video-toggle").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const article = button.closest(".video-card");
            const video = article?.querySelector("video");

            if (!video) return;

            if (video.paused) {
                video.play().catch(() => {});
                button.innerHTML = '<i class="fa-solid fa-pause"></i>';
                button.setAttribute("aria-label", "Pause video");
            } else {
                video.pause();
                button.innerHTML = '<i class="fa-solid fa-play"></i>';
                button.setAttribute("aria-label", "Play video");
            }
        });
    });

    document.querySelectorAll(".video-mute").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const article = button.closest(".video-card");
            const video = article?.querySelector("video");

            if (!video) return;

            video.muted = !video.muted;

            button.innerHTML =
                video.muted
                    ? '<i class="fa-solid fa-volume-xmark"></i>'
                    : '<i class="fa-solid fa-volume-high"></i>';
        });
    });

    const mediaObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: .12 });

    document.querySelectorAll("video[data-video]").forEach(video => mediaObserver.observe(video));

    /* ---------- IMAGE LIGHTBOX ---------- */
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    const lightboxClose = document.getElementById("lightboxClose");

    function closeLightbox() {
        lightbox?.classList.remove("open");
    }

    document.querySelectorAll("[data-lightbox='true']").forEach(image => {
        image.style.cursor = "zoom-in";

        image.addEventListener("click", () => {
            lightboxImage.src = image.currentSrc || image.src;
            lightboxImage.alt = image.alt;
            lightbox.classList.add("open");
        });
    });

    document.querySelectorAll(".image-open").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            const target = document.getElementById(button.dataset.imageTarget);

            if (!target) return;

            lightboxImage.src = target.currentSrc || target.src;
            lightboxImage.alt = target.alt;
            lightbox.classList.add("open");
        });
    });

    lightboxClose?.addEventListener("click", closeLightbox);
    lightbox?.addEventListener("click", event => {
        if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeLightbox();
    });

    /* ---------- ANIMATED NUMBERS ---------- */
    function animateNumber(element, end, duration = 1300) {
        if (!element || element.dataset.animated) return;

        element.dataset.animated = "1";
        const start = performance.now();

        function frame(now) {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = Math.floor(end * eased).toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                element.textContent = end.toLocaleString();
            }
        }

        requestAnimationFrame(frame);
    }

    document.querySelectorAll(".ticker-number.js-count").forEach(el => {
        const value = Number(el.dataset.value || 0);

        new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                animateNumber(el, value);
            }
        }, { threshold: .7 }).observe(el);
    });

    /* ---------- ACTIVE SECTION RAIL ---------- */
    const rail = document.getElementById("activeRail");
    const railButtons = [...document.querySelectorAll("#activeRail button")];

    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                railButtons.forEach(button => {
                    button.classList.toggle(
                        "active",
                        button.dataset.target === entry.target.id
                    );
                });
            }
        });
    }, { rootMargin: "-35% 0px -50% 0px", threshold: 0 });

    ["home","race-weekend","garage","media","duel","circuit"].forEach(id => {
        const target = document.getElementById(id);
        if (target) sectionObserver.observe(target);
    });

    railButtons.forEach(button => {
        button.addEventListener("click", () => {
            document.getElementById(button.dataset.target)?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });

    /* ---------- RACE WEEKEND STORY ANIMATION ---------- */
    const weekendSteps = [...document.querySelectorAll(".weekend-step")];

    if (weekendSteps.length) {
        let active = 0;

        setInterval(() => {
            weekendSteps.forEach(step => step.classList.remove("active"));
            weekendSteps[active % weekendSteps.length].classList.add("active");
            active++;
        }, 2400);
    }

    /* ---------- CLICK-TO-COPY SECTION LINKS ---------- */
    document.querySelectorAll("[data-copy-link]").forEach(button => {
        button.addEventListener("click", async () => {
            const url = `${window.location.origin}${window.location.pathname}#${button.dataset.copyLink}`;

            try {
                await navigator.clipboard.writeText(url);

                const old = button.innerHTML;
                button.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied';

                setTimeout(() => {
                    button.innerHTML = old;
                }, 1300);
            } catch {
                // Clipboard unavailable — leave the interface untouched.
            }
        });
    });

    /* ---------- PERFORMANCE: DEFER NON-CRITICAL IMAGES ---------- */
    document.querySelectorAll("img[loading='lazy']").forEach(image => {
        image.addEventListener("load", () => image.classList.add("loaded"), { once: true });
    });
})();
