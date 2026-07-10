(function ($) {

    "use strict";


    /*------------------------------------------
        = ALL ESSENTIAL FUNCTIONS
    -------------------------------------------*/

    // Toggle mobile navigation
    function toggleMobileNavigation() {
        var navbar = $(".navigation-holder");
        var openBtn = $(".navbar-header .open-btn");
        var closeBtn = $(".navigation-holder .close-navbar");
        var body = $(".page-wrapper");

        openBtn.on("click", function () {
            if (!navbar.hasClass("slideInn")) {
                navbar.addClass("slideInn");
                body.addClass("body-overlay");
            }
            return false;
        })

        closeBtn.on("click", function () {
            if (navbar.hasClass("slideInn")) {
                navbar.removeClass("slideInn");
            }
            body.removeClass("body-overlay");
            return false;
        })
    }

    toggleMobileNavigation();


    // Highlight current page in header navigation
    function setActiveNav() {
        var path = window.location.pathname.split('/').pop() || 'index.html';
        if (!path) path = 'index.html';

        var nav = document.querySelector('#navbar .navbar-nav');
        if (!nav) return;

        nav.querySelectorAll('li.current, li.active').forEach(function (li) {
            li.classList.remove('current', 'active');
        });

        nav.querySelectorAll('a[href]').forEach(function (link) {
            var href = link.getAttribute('href');
            if (!href || href === '#') return;

            var linkFile = href.split('/').pop().split('#')[0] || 'index.html';
            if (linkFile === path) {
                var li = link.closest('li');
                if (li) li.classList.add('current');

                var subMenu = link.closest('.sub-menu');
                if (subMenu) {
                    var parent = subMenu.closest('.menu-item-has-children');
                    if (parent) parent.classList.add('current');
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setActiveNav);
    } else {
        setActiveNav();
    }


    // Function for toggle class for small menu
    function toggleClassForSmallNav() {
        var windowWidth = window.innerWidth;
        var mainNav = $("#navbar > ul");

        if (windowWidth <= 991) {
            mainNav.addClass("small-nav");
        } else {
            mainNav.removeClass("small-nav");
        }
    }

    toggleClassForSmallNav();


    // Function for small menu
    function smallNavFunctionality() {
        var windowWidth = window.innerWidth;
        var mainNav = $(".navigation-holder");
        var smallNav = $(".navigation-holder > .small-nav");
        var subMenu = smallNav.find(".sub-menu");
        var megamenu = smallNav.find(".mega-menu");
        var menuItemWidthSubMenu = smallNav.find(".menu-item-has-children > a");

        if (windowWidth <= 991) {
            subMenu.hide();
            megamenu.hide();
            menuItemWidthSubMenu.on("click", function (e) {
                var $this = $(this);
                $this.siblings().slideToggle();
                e.preventDefault();
                e.stopImmediatePropagation();
            })
        } else if (windowWidth > 991) {
            mainNav.find(".sub-menu").show();
            mainNav.find(".mega-menu").show();
        }
    }

    smallNavFunctionality();


    // Parallax background
    function bgParallax() {
        if ($(".parallax").length) {
            $(".parallax").each(function () {
                var height = $(this).position().top;
                var resize = height - $(window).scrollTop();
                var doParallax = -(resize / 5);
                var positionValue = doParallax + "px";
                var img = $(this).data("bg-image");

                $(this).css({
                    backgroundImage: "url(" + img + ")",
                    backgroundPosition: "50%" + positionValue,
                    backgroundSize: "cover"
                });
            });
        }
    }



    // SLIDER
    var menu = [];
    jQuery('.swiper-slide').each(function (index) {
        menu.push(jQuery(this).find('.slide-inner').attr("data-text"));
    });
    var interleaveOffset = 0.5;
    var swiperOptions = {
        loop: true,
        speed: 1000,
        parallax: true,
        autoplay: {
            delay: 8000,
            disableOnInteraction: false,
        },

        watchSlidesProgress: true,

        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },

        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        on: {
            progress: function () {
                var swiper = this;
                for (var i = 0; i < swiper.slides.length; i++) {
                    var slideProgress = swiper.slides[i].progress;
                    var innerOffset = swiper.width * interleaveOffset;
                    var innerTranslate = slideProgress * innerOffset;
                    swiper.slides[i].querySelector(".slide-inner").style.transform =
                        "translate3d(" + innerTranslate + "px, 0, 0)";
                }
            },

            touchStart: function () {
                var swiper = this;
                for (var i = 0; i < swiper.slides.length; i++) {
                    swiper.slides[i].style.transition = "";
                }
            },

            setTransition: function (speed) {
                var swiper = this;
                for (var i = 0; i < swiper.slides.length; i++) {
                    swiper.slides[i].style.transition = speed + "ms";
                    swiper.slides[i].querySelector(".slide-inner").style.transition =
                        speed + "ms";
                }
            }
        }
    };

    var swiper = new Swiper(".swiper-container", swiperOptions);

    if (swiper.autoplay) {
        $(".hero-slider .swiper-container").hover(
            function () { swiper.autoplay.stop(); },
            function () { swiper.autoplay.start(); }
        );
    }

    // DATA BACKGROUND IMAGE
    // DATA BACKGROUND IMAGE
    function updateSliderBackgrounds() {
        var sliderBgSetting = $(".slide-bg-image");
        var isMobile = window.matchMedia("(max-width: 767px)").matches;

        sliderBgSetting.each(function (indx) {
            var desktopBg = $(this).attr("data-background");
            var mobileBg = $(this).attr("data-mobile-background");
            var mobilePos = $(this).attr("data-mobile-position");

            if (isMobile && mobileBg) {
                $(this).css("background-image", "url(" + mobileBg + ")");
                if (mobilePos) {
                    $(this).css("background-position", mobilePos);
                }
            } else if (desktopBg) {
                $(this).css("background-image", "url(" + desktopBg + ")");
                $(this).css("background-position", ""); // Reset to CSS default for desktop
            }
        });
    }

    updateSliderBackgrounds();
    $(window).on('resize', updateSliderBackgrounds);



    /*------------------------------------------
        = HIDE PRELOADER
    -------------------------------------------*/
    function preloader() {
        if ($('.preloader').length) {
            $('.preloader').delay(0).fadeOut(100, function () {
                wow.init();
            });
        }
    }


    /*------------------------------------------
        = WOW ANIMATION SETTING
    -------------------------------------------*/
    var wow = new WOW({
        boxClass: 'wow',      // default
        animateClass: 'animated', // default
        offset: 0,          // default
        mobile: true,       // default
        live: true        // default
    });


    /*------------------------------------------
        = ACTIVE POPUP IMAGE
    -------------------------------------------*/
    if ($(".fancybox").length) {
        $(".fancybox").fancybox({
            openEffect: "elastic",
            closeEffect: "elastic",
            wrapCSS: "project-fancybox-title-style"
        });
    }


    /*------------------------------------------
        = POPUP VIDEO
    -------------------------------------------*/
    if ($(".video-btn").length) {
        $(".video-btn").on("click", function () {
            $.fancybox({
                href: this.href,
                type: $(this).data("type"),
                'title': this.title,
                helpers: {
                    title: { type: 'inside' },
                    media: {}
                },

                beforeShow: function () {
                    $(".fancybox-wrap").addClass("gallery-fancybox");
                }
            });
            return false
        });
    }


    /*------------------------------------------
        = ACTIVE GALLERY POPUP IMAGE
    -------------------------------------------*/
    if ($(".popup-gallery").length) {
        $('.popup-gallery').magnificPopup({
            delegate: 'a',
            type: 'image',

            gallery: {
                enabled: true
            },

            zoom: {
                enabled: true,

                duration: 300,
                easing: 'ease-in-out',
                opener: function (openerElement) {
                    return openerElement.is('img') ? openerElement : openerElement.find('img');
                }
            }
        });
    }


    /*------------------------------------------
        = FUNCTION FORM SORTING GALLERY
    -------------------------------------------*/
    function sortingGallery() {
        if ($(".sortable-gallery .gallery-filters").length) {
            var $container = $('.gallery-container');
            $container.isotope({
                filter: '*',
                animationOptions: {
                    duration: 750,
                    easing: 'linear',
                    queue: false,
                }
            });

            $(".gallery-filters li a").on("click", function () {
                $('.gallery-filters li .current').removeClass('current');
                $(this).addClass('current');
                var selector = $(this).attr('data-filter');
                $container.isotope({
                    filter: selector,
                    animationOptions: {
                        duration: 750,
                        easing: 'linear',
                        queue: false,
                    }
                });
                return false;
            });
        }
    }

    sortingGallery();


    /*------------------------------------------
        = MASONRY GALLERY SETTING
    -------------------------------------------*/
    function masonryGridSetting() {
        if ($('.masonry-gallery').length) {
            var $grid = $('.masonry-gallery').masonry({
                itemSelector: '.grid-item',
                columnWidth: '.grid-item',
                percentPosition: true
            });

            $grid.imagesLoaded().progress(function () {
                $grid.masonry('layout');
            });
        }
    }

    // masonryGridSetting();


    /*------------------------------------------
        = STICKY HEADER
    -------------------------------------------*/

    // Function for clone an element for sticky menu
    function cloneNavForSticyMenu($ele, $newElmClass) {
        $ele.addClass('original').clone().insertAfter($ele).addClass($newElmClass).removeClass('original');
    }

    // clone home style 1 navigation for sticky menu
    if ($('.site-header .navigation').length) {
        cloneNavForSticyMenu($('.site-header .navigation'), "sticky-header");
    }

    var lastScrollTop = '';

    function stickyMenu($targetMenu, $toggleClass) {
        var st = $(window).scrollTop();
        var mainMenuTop = $('.site-header .navigation');

        if ($(window).scrollTop() > 1000) {
            if (st > lastScrollTop) {
                // hide sticky menu on scroll down
                $targetMenu.removeClass($toggleClass);

            } else {
                // active sticky menu on scroll up
                $targetMenu.addClass($toggleClass);
            }

        } else {
            $targetMenu.removeClass($toggleClass);
        }

        lastScrollTop = st;
    }


    /*------------------------------------------
        = Header search toggle
    -------------------------------------------*/
    if ($(".header-search-form-wrapper").length) {
        var searchToggleBtn = $(".search-toggle-btn");
        var searchContent = $(".header-search-form");
        var body = $("body");

        searchToggleBtn.on("click", function (e) {
            searchContent.toggleClass("header-search-content-toggle");
            e.stopPropagation();
        });

        body.on("click", function () {
            searchContent.removeClass("header-search-content-toggle");
        }).find(searchContent).on("click", function (e) {
            e.stopPropagation();
        });
    }


    /*------------------------------------------
        = PROGRESS BAR
    -------------------------------------------*/
    function progressBar() {
        var $progressWrappers = $('.progress');
        if (!$progressWrappers.length) {
            return;
        }

        function animateBar(wrapper) {
            var $wrapper = $(wrapper);
            var $bar = $wrapper.find('.progress-bar');
            if (!$bar.length || $bar.hasClass('appeared')) {
                return;
            }
            var percent = $bar.data('percent') || 0;
            $bar.css('width', percent + '%').addClass('appeared');
            if (!$wrapper.find('span').length) {
                $wrapper.append('<span>' + percent + '%' + '</span>');
            }
        }

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateBar(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.15
            });

            $progressWrappers.each(function () {
                observer.observe(this);
            });
        } else {
            $progressWrappers.each(function () {
                animateBar(this);
            });
        }
    }

    progressBar();


    /*------------------------------------------
        = SKILL BAR ANIMATION
    -------------------------------------------*/
    function animateSkillBars() {
        var $skillBars = $('.skill-bar-wrap');
        if (!$skillBars.length) {
            return;
        }

        function animateSkillBar(wrapper) {
            var $wrapper = $(wrapper);
            var $skillFill = $wrapper.find('.skill-fill');
            var $label = $wrapper.find('label span');

            if (!$skillFill.length || $skillFill.hasClass('animated')) {
                return;
            }

            var targetPercent = $skillFill.data('pct') || 0;
            $skillFill.addClass('animated');

            // Animate the progress bar width
            $skillFill.css('width', targetPercent + '%');

            // Animate the percentage count-up
            if ($label.length) {
                var currentCount = 0;
                var increment = targetPercent / 50; // Controls animation smoothness (1.2s / 50 steps)
                var countUpInterval = 24; // ~1.2 seconds total for count-up

                var countInterval = setInterval(function () {
                    currentCount += increment;
                    if (currentCount >= targetPercent) {
                        currentCount = targetPercent;
                        clearInterval(countInterval);
                    }
                    $label.text(Math.round(currentCount) + '%');
                }, countUpInterval);
            }
        }

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateSkillBar(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.2
            });

            $skillBars.each(function () {
                observer.observe(this);
            });
        } else {
            // Fallback for older browsers
            $skillBars.each(function () {
                animateSkillBar(this);
            });
        }
    }

    animateSkillBars();


    /*------------------------------------------
        = PARTNERS SLIDER
    -------------------------------------------*/
    if ($(".partners-slider").length) {
        $(".partners-slider").owlCarousel({
            autoplay: true,
            smartSpeed: 300,
            margin: 30,
            loop: true,
            autoplayHoverPause: true,
            dots: false,
            responsive: {
                0: {
                    items: 2
                },

                550: {
                    items: 3
                },

                992: {
                    items: 4
                },

                1200: {
                    items: 5
                }
            }
        });
    }


    /*------------------------------------------
        = TESTIMONIALS SLIDER
    -------------------------------------------*/
    if ($(".testimonials-slider").length) {
        $(".testimonials-slider").owlCarousel({
            autoplay: true,
            smartSpeed: 300,
            loop: true,
            autoplayHoverPause: true,
            items: 1
        });
    }


    /*------------------------------------------
    //     = PROJECTS SLIDER
    // -------------------------------------------*/
    // if ($(".projects-slider").length) {
    //     $(".projects-slider").owlCarousel({
    //         loop: true,
    //         margin: 25,
    //         dots: false,
    //         nav: true,
    //         navText: ['<span class="owl-nav-arrow">&#10094;</span>', '<span class="owl-nav-arrow">&#10095;</span>'],
    //         smartSpeed: 800,
    //         autoplay: true,
    //         autoplayTimeout: 4500,
    //         autoplayHoverPause: true,
    //         autoplaySpeed: 800,
    //         navSpeed: 800,
    //         dotsSpeed: 800,
    //         dragEndSpeed: 800,
    //         responsive: {
    //             0: {
    //                 items: 1,
    //                 margin: 15
    //             },

    //             550: {
    //                 items: 1,
    //                 margin: 15
    //             },

    //             892: {
    //                 items: 2,
    //                 margin: 20
    //             },

    //             1200: {
    //                 items: 2,
    //                 margin: 25
    //             },

    //             1400: {
    //                 items: 3,
    //                 margin: 25
    //             }
    //         }
    //     });
    // }


    // /*------------------------------------------
    //     = TESTIMONIALS SLIDER S2    
    // -------------------------------------------*/
    // if ($(".testimonials-slider-s2").length) {
    //     $(".testimonials-slider-s2").owlCarousel({
    //         loop: true,
    //         margin: 30,
    //         smartSpeed: 500,
    //         responsive: {
    //             0: {
    //                 items: 1,
    //             },

    //             650: {
    //                 items: 2,
    //                 center: false,
    //                 margin: 15
    //             },

    //             1200: {
    //                 items: 2
    //             }
    //         }
    //     });
    // }


    /*------------------------------------------
        = FUNFACT
    -------------------------------------------*/
    if ($(".odometer").length) {
        var $odometer = $('.odometer');

        function updateOdometers() {
            $odometer.each(function () {
                var countNumber = $(this).attr("data-count");
                $(this).html(countNumber);
            });
        }

        if ('IntersectionObserver' in window) {
            var odometerObserver = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        updateOdometers();
                        obs.disconnect();
                    }
                });
            }, {
                threshold: 0.15
            });

            $odometer.each(function () {
                odometerObserver.observe(this);
            });
        } else {
            updateOdometers();
        }
    }


    /*------------------------------------------
        = POST SLIDER
    -------------------------------------------*/
    if ($(".post-slider").length) {
        $(".post-slider").owlCarousel({
            mouseDrag: false,
            smartSpeed: 500,
            margin: 30,
            loop: true,
            nav: true,
            navText: ['<i class="fi flaticon-back"></i>', '<i class="fi flaticon-next"></i>'],
            dots: false,
            items: 1
        });
    }


    /*------------------------------------------
        = CONTACT FORM SUBMISSION
    -------------------------------------------*/
    if ($("#contact-form-main").length) {
        $("#contact-form-main").validate({
            rules: {
                name: {
                    required: true,
                    minlength: 2
                },

                email: "required",

                phone: "required",

                subject: {
                    required: true
                }

            },

            messages: {
                name: "Please enter your name",
                email: "Please enter your email address",
                phone: "Please enter your phone number",
                subject: "Please select your contact subject"
            },

            submitHandler: function (form) {
                $.ajax({
                    type: "POST",
                    url: "contact.php",
                    data: $(form).serialize(),
                    success: function () {
                        $("#loader").hide();
                        $("#success").slideDown("slow");
                        setTimeout(function () {
                            $("#success").slideUp("slow");
                        }, 3000);
                        form.reset();
                    },
                    error: function () {
                        $("#loader").hide();
                        $("#error").slideDown("slow");
                        setTimeout(function () {
                            $("#error").slideUp("slow");
                        }, 3000);
                    }
                });
                return false; // required to block normal submit since you used ajax
            }

        });
    }



    /*==========================================================================
        WHEN DOCUMENT LOADING
    ==========================================================================*/
    $(window).on('load', function () {

        preloader();

        toggleMobileNavigation();

        smallNavFunctionality();

        sortingGallery();

        setActiveNav();

    });



    /*==========================================================================
        WHEN WINDOW SCROLL
    ==========================================================================*/
    $(window).on("scroll", function () {

        if ($(".site-header").length) {
            stickyMenu($('.site-header .navigation'), "sticky-on");
        }

    });


    /*==========================================================================
        WHEN WINDOW RESIZE
    ==========================================================================*/
    $(window).on("resize", function () {

        toggleClassForSmallNav();

        clearTimeout($.data(this, 'resizeTimer'));
        $.data(this, 'resizeTimer', setTimeout(function () {
            smallNavFunctionality();
        }, 200));

    });

})(window.jQuery);









// test code
(function () {
  /* ── config ── */
  var AUTO_PLAY_MS   = 3500;   // ms between auto-slides
  var VISIBLE_MOBILE = 1;      // slides visible on mobile
  var VISIBLE_TABLET = 2;      // slides visible on tablet
  var VISIBLE_DESK   = 3;      // slides visible on desktop (3 of 5)
 
  /* ── elements ── */
  var wrap        = document.getElementById('projSliderWrap');
  var track       = document.getElementById('projTrack');
  var btnPrev     = document.getElementById('projPrev');
  var btnNext     = document.getElementById('projNext');
  var dotsWrap    = document.getElementById('projDots');
  var progressBar = document.getElementById('projProgressBar');
 
  if (!wrap || !track) return;
 
  var slides      = track.querySelectorAll('.grid');
  var total       = slides.length;
  var current     = 0;
  var autoTimer   = null;
  var progTimer   = null;
  var slideWidth  = 0;
  var visible     = VISIBLE_DESK;
 
  /* ── work out how many slides are visible ── */
  function getVisible() {
    var w = window.innerWidth;
    if (w <= 600)  return VISIBLE_MOBILE;
    if (w <= 991)  return VISIBLE_TABLET;
    return VISIBLE_DESK;
  }
 
  /* ── size every slide to fill 1/visible of the wrapper ── */
  function setDimensions() {
    visible    = getVisible();
    slideWidth = wrap.offsetWidth / visible;
    track.style.width = (slideWidth * total) + 'px';
    slides.forEach(function (s) {
      s.style.width = slideWidth + 'px';
    });
    goTo(current, false); // re-snap without animation
  }
 
  /* ── build dot buttons ── */
  function buildDots() {
    dotsWrap.innerHTML = '';
    var maxIndex = total - visible;
    for (var i = 0; i <= maxIndex; i++) {
      (function (idx) {
        var dot = document.createElement('button');
        dot.className = 'proj-slider-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
        dot.addEventListener('click', function () { goTo(idx, true); });
        dotsWrap.appendChild(dot);
      })(i);
    }
  }
 
  /* ── update dots ── */
  function updateDots() {
    var dots = dotsWrap.querySelectorAll('.proj-slider-dot');
    dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
  }
 
  /* ── update arrow disabled state ── */
  function updateArrows() {
    btnPrev.disabled = current === 0;
    btnNext.disabled = current >= total - visible;
  }
 
  /* ── move to index ── */
  function goTo(idx, animate) {
    var maxIndex = total - visible;
    current = Math.max(0, Math.min(idx, maxIndex));
    track.style.transition = animate ? 'transform 0.55s cubic-bezier(0.4,0,0.2,1)' : 'none';
    track.style.transform  = 'translateX(-' + (current * slideWidth) + 'px)';
    updateDots();
    updateArrows();
    resetProgress();
  }
 
  /* ── auto-play ── */
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(function () {
      var next = current >= total - visible ? 0 : current + 1;
      goTo(next, true);
    }, AUTO_PLAY_MS);
  }
  function stopAuto() {
    clearInterval(autoTimer);
    clearTimeout(progTimer);
  }
 
  /* ── progress bar animation ── */
  function resetProgress() {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    clearTimeout(progTimer);
    progTimer = setTimeout(function () {
      progressBar.style.transition = 'width ' + AUTO_PLAY_MS + 'ms linear';
      progressBar.style.width = '100%';
    }, 30);
  }
 
  /* ── arrow clicks ── */
  btnPrev.addEventListener('click', function () {
    goTo(current - 1, true);
    stopAuto(); startAuto();
  });
  btnNext.addEventListener('click', function () {
    goTo(current + 1, true);
    stopAuto(); startAuto();
  });
 
  /* ── pause on hover ── */
  wrap.addEventListener('mouseenter', stopAuto);
  wrap.addEventListener('mouseleave', function () { startAuto(); resetProgress(); });
 
  /* ── touch / swipe support ── */
  var touchStartX = 0;
  wrap.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    stopAuto();
  }, { passive: true });
  wrap.addEventListener('touchend', function (e) {
    var diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      goTo(diff > 0 ? current + 1 : current - 1, true);
    }
    startAuto();
  }, { passive: true });
 
  /* ── resize ── */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setDimensions();
      buildDots();
    }, 200);
  });
 
  /* ── init ── */
  setDimensions();
  buildDots();
  updateArrows();
  startAuto();
  resetProgress();
 
})();