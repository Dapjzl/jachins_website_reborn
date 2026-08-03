class Cursor {
    constructor(options) {
        this.options = $.extend(true, {
            container: "body",
            speed: 0.7,
            ease: "expo.out",
            visibleTimeout: 300
        }, options);
        this.body = $(this.options.container);
        this.el = $('<div class="cb-cursor"></div>');
        this.text = $('<div class="cb-cursor-text"></div>');
        // FIX: rAF throttle state — ensures GSAP is called at most once per animation frame
        this._rafPending = false;
        this._pendingX = 0;
        this._pendingY = 0;
        this.init();
    }

    init() {
        this.el.append(this.text);
        this.body.append(this.el);
        this.bind();
        this.move(-window.innerWidth, -window.innerHeight, 0);
    }

    bind() {
        const self = this;

        this.body.on('mouseleave', () => {
            self.hide();
        }).on('mouseenter', () => {
            self.show();
        }).on('mousemove', (e) => {
            // FIX: Store position and batch GSAP call into rAF
            // Previously: gsap.to() was called on EVERY mousemove event (could be 200+/sec)
            // Now: position is updated immediately, GSAP fires at most once per 16ms frame
            self._pendingX = self.stick ? self.stick.x - ((self.stick.x - e.clientX) * 0.15) : e.clientX;
            self._pendingY = self.stick ? self.stick.y - ((self.stick.y - e.clientY) * 0.15) : e.clientY;
            self.pos = { x: self._pendingX, y: self._pendingY };

            if (!self._rafPending) {
                self._rafPending = true;
                requestAnimationFrame(() => {
                    self._rafPending = false;
                    self.update();
                });
            }
        }).on('mousedown', () => {
            self.setState('-active');
        }).on('mouseup', () => {
            self.removeState('-active');
        }).on('mouseenter', 'a,input,textarea,button', () => {
            self.setState('-pointer');
        }).on('mouseleave', 'a,input,textarea,button', () => {
            self.removeState('-pointer');
        }).on('mouseenter', 'iframe', () => {
            self.hide();
        }).on('mouseleave', 'iframe', () => {
            self.show();
        }).on('mouseenter', '[data-cursor]', function () {
            self.setState(this.dataset.cursor);
        }).on('mouseleave', '[data-cursor]', function () {
            self.removeState(this.dataset.cursor);
        }).on('mouseenter', '[data-cursor-text]', function () {
            self.setText(this.dataset.cursorText);
        }).on('mouseleave', '[data-cursor-text]', function () {
            self.removeText();
        }).on('mouseenter', '[data-cursor-stick]', function () {
            self.setStick(this.dataset.cursorStick);
        }).on('mouseleave', '[data-cursor-stick]', function () {
            self.removeStick();
        });
    }

    setState(state) {
        this.el.addClass(state);
    }

    removeState(state) {
        this.el.removeClass(state);
    }

    toggleState(state) {
        this.el.toggleClass(state);
    }

    setText(text) {
        this.text.html(text);
        this.el.addClass('-text');
    }

    removeText() {
        this.el.removeClass('-text');
    }

    setStick(el) {
        const target = $(el);
        const bound = target.get(0).getBoundingClientRect();
        this.stick = {
            y: bound.top + (target.height() / 2),
            x: bound.left + (target.width() / 2)
        };
        this.move(this.stick.x, this.stick.y, 5);
    }

    removeStick() {
        this.stick = false;
    }

    update() {
        this.move();
        this.show();
    }

    move(x, y, duration) {
        gsap.to(this.el, {
            x: x || this.pos.x,
            y: y || this.pos.y,
            force3D: true,
            overwrite: true,
            ease: this.options.ease,
            duration: this.visible ? (duration || this.options.speed) : 0
        });
    }

    show() {
        if (this.visible) return;
        clearInterval(this.visibleInt);
        this.el.addClass('-visible');
        this.visibleInt = setTimeout(() => this.visible = true);
    }

    hide() {
        clearInterval(this.visibleInt);
        this.el.removeClass('-visible');
        this.visibleInt = setTimeout(() => this.visible = false, this.options.visibleTimeout);
    }
}
// Init cursor
const cursor = new Cursor();
