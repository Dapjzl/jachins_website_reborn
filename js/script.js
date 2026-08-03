(function ($) {
   "use strict";
    const $window = $(window);
    const CONFIG = { mobileBreakpoint: 768, formAction: ["form-process.php", "review-form.php"] };

    // Preloader
    $window.on("load", () => setTimeout(() => $(".sis-preloader").fadeOut(1000), 700));

    // Mobile Menu
        const initialMenuItems = $('#menu > li').toArray();
        const initialMenu2Items = $('#menu2 > li').toArray();

        const handleMobileMenus = () => {
            const isMobile = $window.width() <= CONFIG.mobileBreakpoint;
            const hasSlickNav = $(".slicknav_nav").length;

            if (isMobile && !hasSlickNav && $.fn.slicknav) {

                $("#menu2").children().appendTo("#menu");

                $("#menu").slicknav({
                    label: "",
                    prependTo: ".responsive-menu",

                    beforeOpen: function () {
                        $('body').addClass('mobile-menu-open');
                    },

                    beforeClose: function () {
                        $('body').removeClass('mobile-menu-open');
                    }
                });

            } else if (!isMobile && hasSlickNav) {

                $("#menu").slicknav("destroy");

                initialMenuItems.forEach(item => $("#menu").append(item));
                initialMenu2Items.forEach(item => $("#menu2").append(item));
            }
        };

        handleMobileMenus();

        let resizeTimer;
        $window.on("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(handleMobileMenus, 200);
        });


        // submenu scroll fix
        $(document).on('click', '.slicknav_arrow', function () {
            setTimeout(() => {
                const parent = $(this).closest('.slicknav_parent');
                const menu = $('.slicknav_menu');

                menu.animate({
                    scrollTop: parent.position().top + menu.scrollTop() - 80
                }, 300);
            }, 200);
        });

    // Active Navigation
    $(() => {
        let page = location.pathname.split("/").pop().toLowerCase() || "index.html";
        document.querySelectorAll("#sisf-page-header .nav-link").forEach(link => {
            const href = (link.getAttribute("href") || "").split("/").pop().toLowerCase() || "index.html";
            if (href === page) {
                link.classList.add("active");
                let parent = link.closest("li.submenu");
                while (parent) {
                    parent.querySelector(":scope > .nav-link")?.classList.add("active");
                    parent = parent.parentElement.closest("li.submenu");
                }
            }
        });
    });

    // Skills Progress Bar — FIX: use scaleX transform instead of width to avoid layout thrashing
    if ($.fn.waypoint && $('.sis-skills-progress-bar').length) {
        let animated = false;
        $('.sis-skills-progress-bar').waypoint(() => {
            if (animated) return;
            animated = true;
            $('.sis-skillbar').each(function () {
                const $this = $(this);
                const percent = parseInt($this.attr('data-percent'), 10) || 0;
                const $bar = $this.find('.sis-count-bar');
                const $text = $this.find('.sis-skill-no');

                // FIX: Use transform: scaleX instead of animating width (layout-triggering)
                // scaleX runs on GPU compositor — no layout or paint
                $bar.css({
                    'transform-origin': 'left center',
                    'transform': 'scaleX(0)',
                    'transition': 'transform 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                });

                // Trigger on next frame to ensure the initial scaleX(0) is painted first
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        $bar.css('transform', `scaleX(${percent / 100})`);
                    });
                });

                // Counter animation using rAF instead of jQuery animate for smoother updates
                const startTime = performance.now();
                const duration = 2000;
                function animateCounter(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
                    $text.text(Math.ceil(easedProgress * percent) + '%');
                    if (progress < 1) requestAnimationFrame(animateCounter);
                }
                requestAnimationFrame(animateCounter);
            });
        }, { offset: '50%' });
    }

     // GSAP Reveal & Text Animations
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);

        document.querySelectorAll(".sis-reveal").forEach(container => {
            const image = container.querySelector("img"); if (!image) return;
            const tl = gsap.timeline({ scrollTrigger: { trigger: container, toggleActions: "play none none none" } });
            tl.set(container, { autoAlpha: 1 });
            tl.from(container, { xPercent: -100, duration: 1, ease: "power2.out" });
            tl.from(image, { xPercent: 100, duration: 1, delay: -1, scale: 1, ease: "power2.out" });
        });

        ['.sis-text-anime-style-1', '.sis-text-anime-style-3'].forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                const split = new SplitText(element, { type: selector === '.sis-text-anime-style-1' ? "chars, words" : "chars, words" });
                gsap.from(selector === '.sis-text-anime-style-1' ? split.words : split.chars, {
                    duration: 1, delay: selector === '.sis-text-anime-style-1' ? 0.5 : 0.2, x: selector === '.sis-text-anime-style-1' ? 20 : 40,
                    autoAlpha: 0, stagger: selector === '.sis-text-anime-style-1' ? 0.05 : 0.03, ease: "power2.out",
                    scrollTrigger: { trigger: element, start: "top 85%" }
                });
            });
        });
    }

    // Animation On Scroll Js — FIX: reduced duration for snappier feel and less simultaneous animation
    if (typeof AOS !== "undefined") {
        AOS.init({
            once: true,
            duration: 700,      // was 1000ms — shorter = less simultaneous GPU work
            easing: 'ease-out-cubic',
            offset: 80          // start animations slightly earlier to stagger less at once
        });
    }

    // Counter Up
    if ($.fn.counterUp && $('.sis-counter').length) $('.sis-counter').counterUp({ delay: 6, time: 2000 });

    // Back to Top — FIX: passive listener + rAF throttle to avoid blocking scroll thread
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        let rafPending = false;
        // FIX: native addEventListener with { passive: true } — jQuery's .on('scroll') is active by default
        window.addEventListener('scroll', () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                backToTop.classList.toggle('show', window.scrollY > 300);
                rafPending = false;
            });
        }, { passive: true });

        backToTop.addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    // Forms
    if ($.fn.validator && $("#enquiryForm").length) {
        $("#enquiryForm").validator({ focus: false }).on("submit", e => {
            if (!e.isDefaultPrevented()) { e.preventDefault(); submitForm($(e.target)); }
        });
    }
    if ($.fn.validator && $("#reviewForm").length) {
        $("#reviewForm").validator({ focus: false }).on("submit", e => {
            if (!e.isDefaultPrevented()) { e.preventDefault(); submitForm($(e.target)); }
        });
    }
     function submitForm($form) {

        let actionUrl = "";

        if ($form.attr("id") === "enquiryForm") {
            actionUrl = CONFIG.formAction[0];
        } else if ($form.attr("id") === "reviewForm") {
            actionUrl = CONFIG.formAction[1];
        }

        $.post(actionUrl, $form.serialize(), function (response) {

            if (response?.trim() === "success") {
                $form[0].reset();
                showMsg(true, "Booking email sent successfully!");
            } else {
                showMsg(false, response || "Something went wrong.");
            }

        }).fail(function () {
            showMsg(false, "Server request failed.");
        });
    }
    function showMsg(valid, msg) { $("#msgSubmit").removeClass().addClass(valid ? "text-success" : "text-danger").text(msg); }

    /* Initialize Swiper Sliders */
    const initSwiper = (selector, options) => {
        if (typeof Swiper === "undefined") return null;
        if ($(selector).length) {
            return new Swiper(selector, options);
        }
        return null;
    };

	const swiperOptions = {
        slidesPerView: 1,
        speed: 1000,
        loop: true,
        autoplay: { delay: 5000 },
    };
    // Five Slide Per View - Swiper Slider Js
    initSwiper(".sisf-comman-swiper--slider .swiper", {
        ...swiperOptions,
        spaceBetween: 20,
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
        breakpoints: { 0: { slidesPerView: 2 }, 768: { slidesPerView: 3, centeredSlides: false }, 1024: { slidesPerView: 5 } }
    });

    // Four Slide Per View - Swiper Slider Js
    initSwiper(".sis-comman-swiper-slider .swiper", {
        ...swiperOptions,
        spaceBetween: 20,
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
        breakpoints: { 0: { slidesPerView: 1 }, 768: { slidesPerView: 2, centeredSlides: false }, 1024: { slidesPerView: 4 } }
    });

    // Three Slide Per View - Swiper Slider Js
    initSwiper(".sis-comman--swiper-slider .swiper", {
        ...swiperOptions,
        spaceBetween: 20,
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
        breakpoints: { 0: { slidesPerView: 1 }, 768: { slidesPerView: 2, centeredSlides: false }, 1024: { slidesPerView: 3 } }
    });

    // One Slide Per View - Swiper Slider Js
    initSwiper(".sis-comman-swiper--slider .swiper", {
        ...swiperOptions,
        spaceBetween: 20,
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
        breakpoints: { 0: { slidesPerView: 1 }, 768: { slidesPerView: 1, centeredSlides: false }, 1024: { slidesPerView: 1 } }
    });

    // Hero Slider Start
	function animateActiveSlideText() {
        gsap.set(".sis-text-anime-style-2", { clearProps: "all" });

        const activeSlide = document.querySelector(".swiper-slide-active");
        if (!activeSlide) return;
        const animatedTextElements = activeSlide.querySelectorAll(".sis-text-anime-style-2");

        animatedTextElements.forEach((element) => {
            const animationSplitText = new SplitText(element, { type: "chars, words" });

            gsap.from(animationSplitText.chars, {
				opacity: 0,
                duration: 0.11,
				delay: 0.14,
				x: 250,
				autoAlpha: 0,
				stagger: 0.09,
				ease: "power5.out",
            });
        });
    }

	initSwiper(".hero-slider-layout .swiper", {
        ...swiperOptions,
        autoplay: { delay: 6000 },
        pagination: { el: ".hero-pagination", clickable: true },
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
		on: {
			init: function () {
				animateActiveSlideText();
			},
			slideChangeTransitionStart: function () {
				animateActiveSlideText();
			}
		}
    });
    // Hero Slider End

    // Magnific Popup - Gallery
    if ($.fn.magnificPopup && $('.sis-gallery-items').length) {
        $('.sis-gallery-items').magnificPopup({
            delegate: 'a', type: 'image', closeOnContentClick: false, closeBtnInside: false,
            mainClass: 'mfp-with-zoom', image: { verticalFit: true }, gallery: { enabled: true },
            zoom: { enabled: true, duration: 300, opener: el => el.find('img') }
        });
    }

    // Magnific Popup - Video
    if ($.fn.magnificPopup && $('.popup-video').length) {
        $('.popup-video').magnificPopup({
            type: 'iframe', mainClass: 'mfp-fade', removalDelay: 160, preloader: false, fixedContentPos: true,
            callbacks: {
                open: function () {
                    const videoSrc = $.magnificPopup.instance.currItem.src;
                    setTimeout(() => {
                        const content = document.querySelector('.mfp-content'); if (!content) return;
                        const iframe = content.querySelector('iframe'); if (iframe) iframe.remove();
                        const video = document.createElement('video');
                        video.src = videoSrc; video.autoplay = true; video.muted = true;
                        video.controls = true; video.playsInline = true;
                        video.style.width = '100%'; video.style.height = 'auto';
                        video.addEventListener('click', e => e.stopPropagation());
                        content.appendChild(video); video.play().catch(() => {});
                    }, 50);
                },
                close: function () {
                    const video = document.querySelector('.mfp-content video');
                    if (video) { video.pause(); video.remove(); }
                }
            }
        });
    }
})(jQuery);

(function () {
   var wheel = document.querySelector('.sis-lifecycle-wheel');
   if (!wheel) return;

   var pointer = wheel.querySelector('#sisPointer');
   var items = wheel.querySelectorAll('.sis-wheel-item');
   var stageAngles = [0, 45, 90, 135, 180, 225, 270, 315];
   var stageCount = stageAngles.length;
   var currentStage = 0;
   var currentRotation = 0;
   // FIX: total cycle = animation(1100ms) + pause(1000ms) = 2100ms
   var pauseMs = 1000;
   var animMs = 1100;
   var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   var isVisible = true;
   var timeoutId = null;

   // FIX: use Page Visibility API to pause when tab is hidden — prevents rAF/timer buildup
   document.addEventListener('visibilitychange', function () {
       isVisible = !document.hidden;
       if (isVisible && timeoutId === null) scheduleNext();
   });

   function setActiveItem(stageIndex) {
      items.forEach(function (item) {
         var isActive = parseInt(item.getAttribute('data-stage'), 10) === stageIndex;
         item.classList.toggle('active', isActive);
      });
   }

   function goToStage(stageIndex) {
      var targetAngle = stageAngles[stageIndex];
      var delta = targetAngle - (currentRotation % 360);

      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      currentRotation += delta;

      if (reducedMotion) {
         pointer.style.transition = 'none';
      }
      pointer.style.transform = 'rotate(' + currentRotation + 'deg)';
      setActiveItem(stageIndex);
   }

   function advance() {
      timeoutId = null;
      if (!isVisible) return; // FIX: don't run when tab is hidden
      currentStage = (currentStage + 1) % stageCount;
      goToStage(currentStage);
      scheduleNext();
   }

   // FIX: setTimeout chain instead of setInterval — each call schedules the next
   // so it can never accumulate or fire at the wrong rate
   function scheduleNext() {
      var delay = reducedMotion ? pauseMs : pauseMs + animMs;
      timeoutId = setTimeout(advance, delay);
   }

   goToStage(currentStage);
   scheduleNext();
})();