/* ============================================
   Career Buddy Tech — Main Script
   ============================================ */

(function () {
    'use strict';

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let lenis;

    // --- Lenis ---
    function initLenis() {
        if (prefersReducedMotion) return;
        lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.5 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    // --- Countdown (June 30, 2026) ---
    function initCountdown() {
        const target = new Date('2026-06-30T23:59:59').getTime();
        const els = {
            days: document.getElementById('cdDays'),
            hours: document.getElementById('cdHours'),
            mins: document.getElementById('cdMins'),
            secs: document.getElementById('cdSecs'),
        };
        if (!els.days) return;

        function tick() {
            const diff = Math.max(0, target - Date.now());
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            els.days.textContent = String(d).padStart(2, '0');
            els.hours.textContent = String(h).padStart(2, '0');
            els.mins.textContent = String(m).padStart(2, '0');
            els.secs.textContent = String(s).padStart(2, '0');
        }
        tick();
        setInterval(tick, 1000);
    }

    // --- Premium Curriculum (stacking cards) ---
    function initCurriculumStack() {
        const section = document.getElementById('curriculum');
        if (!section) return;

        const cards = section.querySelectorAll('.curriculum-card');
        const navLinks = section.querySelectorAll('.cur-nav-link');
        if (!cards.length || !navLinks.length) return;

        const rootStyles = getComputedStyle(document.documentElement);
        const navH = parseInt(rootStyles.getPropertyValue('--nav-h'), 10) || 72;
        const tickerH = parseInt(rootStyles.getPropertyValue('--ticker-h'), 10) || 36;
        const navOffset = navH + tickerH + 16;
        const scrollOffset = -navOffset;

        function scrollToCard(targetCard) {
            if (!targetCard) return;
            if (lenis) {
                lenis.scrollTo(targetCard, { offset: scrollOffset, duration: 1.2 });
            } else {
                const y = targetCard.getBoundingClientRect().top + window.scrollY + scrollOffset;
                window.scrollTo({ top: y, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }
        }

        let currentActiveId = cards[0] ? cards[0].id : null;

        function setActiveNav(cardId) {
            if (cardId === currentActiveId) return;
            currentActiveId = cardId;
            navLinks.forEach((link) => {
                link.classList.toggle('active', link.dataset.target === cardId);
            });
            // Scroll active pill into view on horizontal nav (tablet/mobile)
            const activeLink = section.querySelector(`.cur-nav-link[data-target="${cardId}"]`);
            if (activeLink) {
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }

        // Scroll-position-based active nav detection (works in both directions, all viewports)
        let scrollTicking = false;
        function onScrollUpdateNav() {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(() => {
                scrollTicking = false;
                // Determine the trigger line — just below the sticky nav area
                const triggerLine = navOffset + 80;
                let activeId = null;

                // Find the last card whose top is at or above the trigger line
                for (let i = cards.length - 1; i >= 0; i--) {
                    const rect = cards[i].getBoundingClientRect();
                    if (rect.top <= triggerLine) {
                        activeId = cards[i].id;
                        break;
                    }
                }

                // If none found (scrolled above all cards), pick the first
                if (!activeId && cards.length) {
                    activeId = cards[0].id;
                }

                if (activeId) setActiveNav(activeId);
            });
        }

        window.addEventListener('scroll', onScrollUpdateNav, { passive: true });
        // Also listen to Lenis scroll if available
        if (lenis) {
            lenis.on('scroll', onScrollUpdateNav);
        }

        // Nav link click handler — works the same on all viewports (stacking, no accordion)
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.dataset.target;
                const targetCard = section.querySelector(`#${CSS.escape(targetId)}`);
                if (!targetCard) return;
                setActiveNav(targetId);
                scrollToCard(targetCard);
            });
        });

        // Run once on init to set correct active state
        onScrollUpdateNav();
    }

    // --- Scroll Animations ---
    function initScrollAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // Skip hero — those use initHeroEntrance() only (ScrollTrigger was resetting them to opacity 0)
        gsap.utils.toArray('.reveal-up').forEach((el) => {
            if (el.closest('.hero')) return;
            if (el.closest('#curriculum') && !el.closest('.curriculum-header')) return;

            gsap.to(el, {
                scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                immediateRender: false,
            });
        });

        gsap.to('.hero-left', {
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
            y: 60,
        });

        document.querySelectorAll('[data-count]').forEach((el) => {
            if (el.closest('.hero')) return;

            const target = parseInt(el.dataset.count, 10);
            const obj = { val: 0 };
            ScrollTrigger.create({
                trigger: el, start: 'top 92%', once: true,
                onEnter: () => {
                    gsap.to(obj, {
                        val: target, duration: 2, ease: 'power2.out',
                        onUpdate: () => { el.textContent = Math.round(obj.val); },
                    });
                },
            });
        });
    }

    // --- Hero Three.js ---
    function initHeroThree() {
        const canvas = document.getElementById('heroCanvas');
        if (!canvas || typeof THREE === 'undefined') return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 40;

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const count = isMobile ? 600 : 1500;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.25, color: 0xff5722, transparent: true, opacity: 0.5,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const particles = new THREE.Points(geo, mat);
        scene.add(particles);

        let mx = 0, my = 0, tx = 0, ty = 0;
        document.addEventListener('mousemove', (e) => {
            mx = (e.clientX / window.innerWidth - 0.5) * 2;
            my = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        let visible = true;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);

        (function animate() {
            requestAnimationFrame(animate);
            if (!visible) return;
            tx += (mx - tx) * 0.04;
            ty += (my - ty) * 0.04;
            particles.rotation.y += 0.0004;
            particles.rotation.x = ty * 0.08;
            camera.position.x = tx * 4;
            renderer.render(scene, camera);
        })();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- Experience Three.js ---
    function initExperienceThree() {
        const canvas = document.getElementById('experienceCanvas');
        if (!canvas || typeof THREE === 'undefined') return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 0, 35);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const grid = new THREE.GridHelper(60, 30, 0xff5722, 0x1a1a1a);
        grid.material.opacity = 0.12;
        grid.material.transparent = true;
        grid.position.y = -12;
        scene.add(grid);

        const objects = [];
        [
            { geo: new THREE.IcosahedronGeometry(5, 1), pos: [12, 4, 0] },
            { geo: new THREE.TorusGeometry(4, 1, 8, 20), pos: [-14, -2, 3] },
            { geo: new THREE.OctahedronGeometry(4, 0), pos: [4, 10, -8] },
        ].forEach(({ geo, pos }) => {
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                color: 0xff5722, wireframe: true, transparent: true, opacity: 0.2,
            }));
            mesh.position.set(...pos);
            objects.push(mesh);
            scene.add(mesh);
        });

        let ex = 0, ey = 0;
        document.addEventListener('mousemove', (e) => {
            ex = (e.clientX / window.innerWidth - 0.5) * 2;
            ey = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        let vis = false;
        new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: 0.1 }).observe(canvas);

        (function animate() {
            requestAnimationFrame(animate);
            if (!vis) return;
            objects.forEach((o, i) => {
                o.rotation.x += 0.004 + i * 0.002;
                o.rotation.y += 0.006;
            });
            camera.position.x = ex * 6;
            camera.position.y = -ey * 4;
            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        })();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- Cursor ---
    function initCursor() {
        if (isMobile) return;
        const glow = document.getElementById('cursorGlow');
        const dot = document.getElementById('cursorDot');
        if (!glow || !dot) return;
        document.body.classList.add('cursor-ready');

        let cx = 0, cy = 0, gx = 0, gy = 0;
        document.addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; dot.style.left = cx + 'px'; dot.style.top = cy + 'px'; });
        (function anim() { gx += (cx - gx) * 0.08; gy += (cy - gy) * 0.08; glow.style.left = gx + 'px'; glow.style.top = gy + 'px'; requestAnimationFrame(anim); })();

        document.querySelectorAll('a, button, .btn, input, select, textarea, .faq-question, .cur-tab').forEach((el) => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });
    }

    // --- Magnetic Buttons ---
    function initMagneticButtons() {
        if (isMobile) return;
        document.querySelectorAll('.magnetic-btn').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const r = btn.getBoundingClientRect();
                gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.25, duration: 0.35, ease: 'power2.out' });
            });
            btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }));
        });
    }

    // --- Tilt Cards ---
    function initTiltCards() {
        if (isMobile) return;
        document.querySelectorAll('[data-tilt]').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, transformPerspective: 1000, duration: 0.35, ease: 'power2.out' });
            });
            card.addEventListener('mouseleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power2.out' }));
        });
    }

    // --- Swipers ---
    function initSwipers() {
        if (typeof Swiper === 'undefined') return;

        new Swiper('.features-swiper', {
            slidesPerView: 1.2, spaceBetween: 16, loop: true,
            autoplay: { delay: 4000, disableOnInteraction: false },
            breakpoints: { 640: { slidesPerView: 2.2 }, 1024: { slidesPerView: 3.2 } },
        });

        new Swiper('.campus-swiper', {
            slidesPerView: 1, loop: true, autoplay: { delay: 3500 },
            pagination: { el: '.campus-swiper .swiper-pagination', clickable: true },
        });

        new Swiper('.logos-swiper', {
            slidesPerView: 2.5, spaceBetween: 12, loop: true,
            autoplay: { delay: 0, disableOnInteraction: false }, speed: 3500, freeMode: true,
            breakpoints: { 640: { slidesPerView: 4 }, 1024: { slidesPerView: 6 } },
        });

        new Swiper('.stories-swiper', {
            slidesPerView: 1, spaceBetween: 20, loop: true,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: '.stories-swiper .swiper-pagination', clickable: true },
            breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
        });

        new Swiper('.mentors-swiper', {
            slidesPerView: 1.2, spaceBetween: 20, loop: true,
            speed: 300,
            autoplay: { delay: 2500, disableOnInteraction: false },
            navigation: { nextEl: '.mentors-slider-wrapper .swiper-button-next', prevEl: '.mentors-slider-wrapper .swiper-button-prev' },
            breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 4 } },
        });
    }

    // --- Navbar ---
    function initNavbar() {
        const navbar = document.getElementById('navbar');
        const toggle = document.getElementById('navToggle');
        const links = document.getElementById('navLinks');
        if (!navbar) return;

        ScrollTrigger.create({
            start: 80,
            onUpdate: (self) => navbar.classList.toggle('scrolled', self.scroll() > 80),
        });

        if (toggle && links) {
            toggle.addEventListener('click', () => { toggle.classList.toggle('active'); links.classList.toggle('open'); });
            links.querySelectorAll('.nav-link').forEach((l) => l.addEventListener('click', () => { toggle.classList.remove('active'); links.classList.remove('open'); }));
        }

        document.querySelectorAll('a[href^="#"]').forEach((a) => {
            if (a.closest('.curriculum-section .curriculum-sidebar')) return;
            a.addEventListener('click', (e) => {
                const t = document.querySelector(a.getAttribute('href'));
                if (t && lenis) { e.preventDefault(); lenis.scrollTo(t, { offset: -110, duration: 1.4 }); }
            });
        });
    }

    // --- FAQ ---
    function initFAQ() {
        document.querySelectorAll('.faq-item').forEach((item) => {
            const q = item.querySelector('.faq-question');
            const a = item.querySelector('.faq-answer');
            q.addEventListener('click', () => {
                const open = item.classList.contains('active');
                document.querySelectorAll('.faq-item.active').forEach((i) => {
                    i.classList.remove('active');
                    i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    i.querySelector('.faq-answer').style.maxHeight = '0';
                });
                if (!open) { item.classList.add('active'); q.setAttribute('aria-expanded', 'true'); a.style.maxHeight = a.scrollHeight + 'px'; }
            });
        });
    }

    // --- Form ---
    function initForm() {
        const form = document.querySelector('.contact-form');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const txt = btn.querySelector('.btn-text');
            const orig = txt.textContent;
            txt.textContent = 'Submitting...';
            btn.disabled = true;
            setTimeout(() => {
                txt.textContent = 'Application Submitted!';
                btn.style.background = '#22c55e';
                setTimeout(() => { txt.textContent = orig; btn.style.background = ''; btn.disabled = false; form.reset(); }, 3000);
            }, 1500);
        });
    }

    // --- Hero Entrance ---
    function initHeroEntrance() {
        const hero = document.querySelector('.hero');
        const heroEls = hero ? hero.querySelectorAll('.reveal-up') : [];

        if (prefersReducedMotion) {
            heroEls.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
            document.querySelectorAll('.hero [data-count]').forEach((el) => { el.textContent = el.dataset.count; });
            if (hero) hero.classList.add('hero-loaded');
            return;
        }

        gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                if (hero) hero.classList.add('hero-loaded');
                heroEls.forEach((el) => gsap.set(el, { clearProps: 'opacity,transform' }));
            },
        })
            .from('.hero-eyebrow', { opacity: 0, y: 24, duration: 0.7, delay: 0.2 })
            .from('.hero-title', { opacity: 0, y: 40, duration: 0.9 }, '-=0.3')
            .from('.hero-sub', { opacity: 0, y: 24, duration: 0.7 }, '-=0.5')
            .from('.hero-actions', { opacity: 0, y: 24, duration: 0.7 }, '-=0.4')
            .from('.countdown-box', { opacity: 0, y: 24, duration: 0.7 }, '-=0.3')
            .from('.hero-stats-row', { opacity: 0, y: 24, duration: 0.7 }, '-=0.3')
            .from('.hero-right', { opacity: 0, x: 40, duration: 0.9 }, '-=0.8');

        // Animate hero stats on load (they are already in viewport)
        document.querySelectorAll('.hero [data-count]').forEach((el) => {
            const target = parseInt(el.dataset.count, 10);
            const obj = { val: 0 };
            gsap.to(obj, {
                val: target,
                duration: 2,
                delay: 0.6,
                ease: 'power2.out',
                onUpdate: () => { el.textContent = Math.round(obj.val); },
            });
        });
    }

    function init() {
        initLenis();
        initScrollAnimations();
        initCountdown();
        initHeroThree();
        initExperienceThree();
        initCursor();
        initMagneticButtons();
        initTiltCards();
        initSwipers();
        initNavbar();
        initFAQ();
        initForm();
        initHeroEntrance();
        initCurriculumStack();
        window.addEventListener('load', () => ScrollTrigger.refresh());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

// --- AI Trends Charts ---
function initAITrendsCharts() {
    // Chart 1: Pace of Change
    const ctx1 = document.getElementById('chart1');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['2010', '2012', '2014', '2016', '2018', '2020', '2022', '2024', '2026'],
                datasets: [{
                    label: 'Innovation Speed',
                    data: [10, 12, 15, 20, 30, 55, 80, 95, 100],
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167,139,250,0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#a78bfa',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 2000, easing: 'easeOutQuart' },
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } }
                }
            }
        });
    }
    
    // Chart 2: Service Jobs vs Skilled Jobs
    const ctx2 = document.getElementById('chart2');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
                datasets: [
                    { label: 'Service Jobs', data: [100, 95, 85, 75, 65, 55, 45], backgroundColor: '#4ade80', borderRadius: 4 },
                    { label: 'AI/Skilled Jobs', data: [30, 40, 55, 70, 85, 95, 110], backgroundColor: '#fbbf24', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutBounce',
                    delay: function(context) {
                        let delay = 0;
                        if (context.type === 'data' && context.mode === 'default') {
                            delay = context.dataIndex * 150 + context.datasetIndex * 300;
                        }
                        return delay;
                    }
                },
                plugins: { legend: { labels: { color: 'rgba(255,255,255,0.8)' } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } }
                }
            }
        });
    }
    
    // Chart 3: AI Replacing Entry-Level
    const ctx3 = document.getElementById('chart3');
    if (ctx3) {
        new Chart(ctx3, {
            type: 'line',
            data: {
                labels: ['2019', '2020', '2021', '2022', '2023', '2024'],
                datasets: [
                    { label: 'Fresher Hiring', data: [100, 90, 80, 70, 55, 40], borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 3, fill: true, tension: 0.4 },
                    { label: 'Job Additions', data: [40, 50, 65, 80, 95, 110], borderColor: 'rgba(255,255,255,0.5)', borderWidth: 2, borderDash: [5,5], fill: false, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 2000, easing: 'easeOutQuart' },
                plugins: { legend: { labels: { color: 'rgba(255,255,255,0.8)' } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } }
                }
            }
        });
    }
    
    // Chart 4: Package Gap
    const ctx4 = document.getElementById('chart4');
    if (ctx4) {
        new Chart(ctx4, {
            type: 'line',
            data: {
                labels: ['2019', '2020', '2021', '2022', '2023', '2024'],
                datasets: [
                    { label: 'AI/ML Jobs (LPA)', data: [15, 18, 22, 26, 28, 32], borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.2)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#4ade80', pointRadius: 4 },
                    { label: 'Avg Fresher (LPA)', data: [3.5, 3.6, 3.8, 4, 4.2, 4.5], borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, fill: true, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 2000, easing: 'easeOutQuart' },
                plugins: { legend: { labels: { color: 'rgba(255,255,255,0.8)' } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize charts when section comes into view
    const aiTrendsSection = document.getElementById('ai-trends');
    if (aiTrendsSection) {
        const chartObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                initAITrendsCharts();
                chartObserver.unobserve(aiTrendsSection);
            }
        }, { threshold: 0.2 });
        chartObserver.observe(aiTrendsSection);
    }
});
