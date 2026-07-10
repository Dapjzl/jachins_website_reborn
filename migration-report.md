# JACHINS Website Migration Report & Audit

**Date:** July 6, 2026  
**Role:** Senior Full-Stack Engineer, UI/UX Engineer, Frontend Architect, and Technical SEO Specialist  
**Project Scope:** Migrate the existing JACHINS Development Limited website to the new premium template while preserving branding, content, SEO, accessibility, and responsive behavior.

---

## 1. Phase 1 — Project Audit

### 1.1 Old Site Audit (`/old-site`)
The old site is a traditional static multi-page website built with HTML5, CSS, and jQuery. It includes backend mail processing via PHP.

#### Pages & URLs
1. **Home (`index.html`)**: Core page containing the corporate hero slider, key statistics, service pillar intros, capability lists, partner marquee, and testimonials.
2. **About Us (`about.html`)**: Deep dive into corporate identity, mission, vision, structured operational processes, geographic reach, FAQs, project highlights, and certifications.
3. **Services Listing (`services.html`)**: A lightweight redirect file routing users to `index.html#services`.
4. **People Services (`consultancy-services.html`)**: Focuses on "People Development" (JETS training, competency academies, and workforce programs).
5. **Asset Services (`project-services.html`)**: Focuses on "Assets" (engineering design, commissioning, and asset integrity).
6. **Infrastructure Services (`management-services.html`)**: Focuses on "Critical Infrastructure" (procurement, construction, and SCADA).
7. **CSR (`csr.html`)**: Corporate Social Responsibility and social impact page.
8. **Contact (`contact.html`)**: Direct contact page with a contact form.
9. **Page Not Found / Fallbacks**:
   - `404` (No extension): Page not found template with logo, header, and home link.
   - `0` (No extension): WordPress-style "Page Not Found" saved output.

#### Components & Layouts
- **Navigation Header**: Responsive header with mobile toggle menu, top bar (phone, email, social links), logo, and dropdown services submenu.
- **Hero Slider**: Swiper-based slider with three slides (swiping text and parallax images).
- **Statistics Counter**: Flexbox row with odometer effects showing experience years and delivery statistics.
- **Process Accordion/FAQ**: Toggleable panels for FAQs.
- **Partner Carousel**: Custom CSS infinite scroll marquee.
- **Testimonial Slider**: Client review carousel.
- **Footer**: Three-column upper footer (About Jachins, Important Links, Address/Contact), permits grid (commented out), and compliant logos listing.

#### Asset Inventory
- **Images (`assets/images`)**:
   - Logo: `jachins_logo.png`
   - Hero/Slider: `slider/jachins-helmet.jpg`, `slider/slider4.jpeg`, `slider/slider89.png`
   - Backgrounds: `cta-bg.jpg`, `cta-s2-bg.jpg`, `services-bg.jpg`
   - Project/Service Graphics: `people_development.png`, `people_jets.png`, `asset_mag1.png`, `asset_mag2.png`, `completed_asset.png`, etc.
   - Partners/Clients: `partners/ce.png`, `co.png`, `em.png`, `nnpc.png`, `npl.png`, `po.png`, `seplat.png`, `ws.png`
   - Certificates / Permits: `permits1.png`, `permits2.png`
- **PDFs & Downloads**: None physically exist in `/old-site`.
- **Icons**: Themify Icons (`themify-icons.css`) and Flaticons (`flaticon.css`).
- **CSS Stylesheets (`assets/css`)**:
   - Standard styles: `style.css` (215 KB), `responsive.css` (39 KB)
   - Layout: `bootstrap.min.css` (Bootstrap 3/4)
   - Plugins: `animate.css`, `owl.carousel.css`, `swiper.min.css`, `jquery.fancybox.css`, `odometer-theme-default.css`, `slick.css`
- **JavaScript Files (`assets/js`)**:
   - Core: `jquery.min.js`, `bootstrap.min.js`, `jquery-plugin-collection.js`
   - Custom helpers: `script.js` (30 KB), `consult.js` (10 KB)
   - Accessibility: `accessibility.js` (Dynamic alt-attribute generation and keyboard navigation hooks)
   - Performance: `lazyload.js` (Fallback lazy loading script)
   - UI utilities: `ui.js` (Back to top, smooth scrolling)

#### Forms & APIs
- **Contact Form**: HTML form on `contact.html` targeting `contact.php` asynchronously.
- **Form Mailer API (`contact.php`)**: Validates input data (raw POST or JSON body) and routes emails to `info@jachinsgroup.com` using standard PHP `mail()`. Falls back to logging emails to `email_log.txt` in local dev environments.

#### Metadata & SEO
- Meta title, meta description, and keywords populated per page.
- Structured JSON-LD Organization Schema embedded on `index.html`.
- Open Graph tags (`og:title`, `og:description`, `og:image`, etc.) and Twitter Cards configured.
- Robots directives set to `index, follow` (except on saved WordPress 404 pages).

---

### 1.2 New Template Audit (`/new-template`)
The new template is a modern, high-performance static HTML template leveraging Bootstrap 5, GSAP (GreenSock Animation Platform), ScrollTrigger, SplitText, Swiper, and AOS for visual polish.

#### Pages Available
1. `index.html`: Banner hero, about segment, grid components, pricing plans, team members list, testimonials, blog lists, and footer.
2. `about-us.html`: Dedicated about page with custom visual styling.
3. `service.html`: Overview of industrial services.
4. `project.html`, `project-grid.html`, `project-detail.html`: Work grids and detail pages.
5. `blogs.html`: Standard blog roll.
6. `contact.html`: Contact details and message form.
7. `error.html`: 404 error page.

#### Layout System & Styling Framework
- **CSS Layout**: Bootstrap 5 (`bootstrap.min.css`) combined with a bespoke custom rules stylesheet `custom.css` (175 KB).
- **Design Language**: Rich dark/gold theme with modern typography, glassmorphism overlays, SVG micro-graphics, animated borders, custom cursor overlays (`mousecursor.css`/`magiccursor.js`), and smooth image reveals (`sis-reveal`).
- **Typography**: Google Fonts Link loading *Space Grotesk* (headings) and *DM Sans* (body text).
- **Responsive Navigation**: Mobile-first navbar powered by jQuery `SlickNav` (`jquery.slicknav.js` / `slicknav.min.css`) and responsive media queries in `custom.css`.

#### Build & Run Environment
- **Build Tools**: Purely client-side static HTML/CSS/JS (no compiler/Webpack/Vite/Gulp required).
- **Local Dev Server**: Served via `npm run dev` or equivalent local server.

#### Animation & Interactive Libraries
- **GSAP Suite**: `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.js` (Custom text split animations on scroll).
- **Swiper**: `swiper-bundle.min.js` (Custom sliders, client carousels, testimonials).
- **AOS**: `aos.js` (Scroll fade and slide interactions).
- **Waypoint & Counterup**: `jquery.waypoints.min.js`, `jquery.counterup.min.js` (Numeric count-up counters).
- **Popup Lightbox**: `jquery.magnific-popup.min.js` (Image gallery lightbox & HTML5 video iframe triggers).

---

## 2. Phase 2 — Content Mapping

We will map the existing JACHINS content directly to the corresponding sections of the new template.

| Old Page Section (`/old-site`) | New Template Target Section (`/new-template`) | Formatting/Styling Approach |
| :--- | :--- | :--- |
| **Header (Top bar, logo, menus)** | Header (Top bar + standard navigation) | Replace placeholder text, phone, email, and social networks with JACHINS data. Configure JACHINS logo and responsive SlickNav hierarchy. |
| **Home Hero Slider (Parallax Swiper)** | Hero Slider Section (`sis-main-banner`) | Retain the template’s CSS/JS structures, replacing the slides with JACHINS slide images (`jachins-helmet.jpg`, `slider4.jpeg`, `slider89.png`) and headlines. |
| **Home "Integrated Delivery Scope"** | Template Grid Section / Counter Row | Map statistics counters (15+ Years, 360°, 100%) to `sis-counter` blocks. Map People/Assets/Infrastructure text to the 3-column service preview columns. |
| **Home Process/Capabilities Grid** | Services Layout | Populate the 6-step process (`Field Development Strategy` to `General Industry`) using the styled features grids in `index.html`. |
| **Home "100% Local Expertise"** | "Why Choose Us" / Text Reveal Block | Map the "100% Local Expertise, Global Standards" content to the premium side-by-side text block with GSAP scroll triggers. |
| **Home Partner Marquee** | Swiper Brand Carousel | Replace template logos with JACHINS partner logos (`ce.png`, `em.png`, etc.) using the Swiper brands loop. |
| **Home Testimonials** | Swiper Testimonial Slider | Populate JACHINS' real client testimonials. |
| **About Us: Who We Are** | About Page: Profile & Narrative Block | Migrate JACHINS' background narrative into the template’s custom side-by-side card layouts on `about-us.html`. |
| **About Us: Vision, Mission & Values**| About Page: Mission/Vision Accordion | Place in the custom accordion or three-column layout cards to highlight values (Safety, Integrity, Excellence). |
| **About Us: FAQ List** | Template Accordion Component | Populate JACHINS' FAQs inside the Bootstrap accordion element. |
| **Services Pages** | `service.html` & custom service files | Create three separate service files using the template's layout framework: `consultancy-services.html` (People), `project-services.html` (Assets), and `management-services.html` (Infrastructure). Keep URL structures intact for SEO. |
| **HSE Policy & Scope** | New Page: `hse.html` | Build a dedicated HSE page using the about template structure to house JACHINS' Safety Management policies, guidelines, and compliance structures. |
| **Careers & Vacancies** | New Page: `careers.html` | Build a clean, styled Careers page using the template’s layouts to provide application guidance and highlight talent development. |
| **Contact Page & Mailer** | `contact.html` & `contact.php` | Integrate the standard JACHINS contact details, Google Map frame, and rewire the front-end form validation to route submissions to `contact.php`. |
| **Footer (Certificates & Links)** | Footer Section (`footer-imag`) | Populate JACHINS' legal copy, site hierarchy, address, and place compliance labels. |

---

## 3. Phase 3 — Asset Migration & Optimization

1. **Asset Copying**: Copy all files from `/old-site/assets/images/` to `/new-template/images/` without altering names, maintaining subdirectory structures (`partners/`, `slider/`, `latest-projects/`, `project-single/`).
2. **Missing Assets (Certifications)**: The DPR, ISO, and NCDMB SVG logos referenced in the old footer (`assets/images/certifications/`) do not physically exist in `/old-site`. 
   - **Resolution Plan**: Re-acquire or download standard vector SVGs for:
     - ISO 9001 (Quality Management)
     - ISO 14001 (Environmental)
     - ISO 45001 (Health & Safety)
     - NCDMB (Nigerian Content Board)
     - DPR/NUPRC (Nigerian Petroleum Regulatory Commission)
   - Store these in `new-template/images/certifications/`.
3. **Image Optimization**:
   - Use high-quality WebP format or optimized compression for large background and slider images (e.g. `slider22.jpg`, `slider4.jpeg`, `jachins-helmet.jpg`) to improve PageSpeed score and load times.
   - Implement `loading="lazy"` on all non-above-the-fold images.
4. **No Placeholders**: Never substitute JACHINS client logos, projects, or background images with generic placeholders.

---

## 4. Phase 4 — Page Migration Strategy

Migration will be executed sequentially. After completing each page, work will halt to present a report and await approval:

1. **Home Page (`index.html`)**  
   Migrate metadata, title tags, Hero Swiper slides, Stats Counter, Services preview, Local Expertise segment, Brand slider, Testimonials, and footer certification badges.
2. **About Us Page (`about-us.html`)**  
   Migrate general profile, Mission/Vision, Operational Process blocks, FAQs, and licenses.
3. **Services Pages (`service.html`, `consultancy-services.html`, `project-services.html`, `management-services.html`)**  
   Migrate People, Assets, and Infrastructure detail structures, ensuring smooth transitions and GSAP animation triggers.
4. **Projects Grid & Detail Pages (`project.html` / `project-grid.html`)**  
   Populate actual portfolio items (e.g., EFE EPF Facility, Export Terminal Expansion, BlueSpark Well Stimulation) using the template's project showcase pages.
5. **HSE Page (`hse.html`)**  
   Create the dedicated HSE page mapping policies, safety records, and certifications.
6. **Careers Page (`careers.html`)**  
   Create the Careers page outlining employee capabilities, internships, and JETS academy pathways.
7. **Contact Page & API (`contact.html`, `contact.php`)**  
   Set up Google Maps, physical address widgets, and hook up the email transmission script.
8. **Remaining Pages (`csr.html`, `error.html`)**  
   Migrate the CSR sustainability timeline and set up the custom 404 page.

---

## 5. SEO & Accessibility Requirements

### SEO Continuity
- **Page Titles & Meta Descriptions**: Extract exact metadata from `/old-site` HTML files and place in the `<head>` of `/new-template` pages.
- **Canonical URLs**: Set `<link rel="canonical">` to point to production URLs.
- **Heading Hierarchy**: Maintain exactly one `<h1>` per page. Ensure subsequent heading tags (`<h2>` to `<h4>`) follow proper semantic hierarchy.
- **Structured Data**: Port the JSON-LD Organization Schema block from `old-site/index.html` to `new-template/index.html`.
- **Image Alt Attributes**: Verify all `<img>` tags have descriptive, contextual alt attributes.
- **Robots Directives**: Keep `<meta name="robots" content="index, follow">`.

### Accessibility Features
- Port `/old-site/assets/js/accessibility.js` into `/new-template/js/accessibility.js` and reference it across all pages to ensure fallback alt text and keyboard Enter/Space focus handling for clickable media.
- Maintain adequate color contrast ratios between text and background layers.
- Check that all interactive items (form inputs, buttons) have appropriate `aria-label` tags where text descriptions are absent.

---

## 6. Risk Assessment & Technical Risks

1. **Script Collisions & JS Conflicts**:  
   *Risk:* The old site used an older jQuery-plugin-collection wrapper. The new template relies on GSAP, SplitText, ScrollTrigger, AOS, and custom scripts. Loading old custom plugins might break the new cursor animations or reveal transitions.  
   *Mitigation:* Keep `/old-site` JS libraries completely isolated. Do not migrate generic layout JS (like old bootstrap/swiper files). Implement equivalent features natively through the new template's GSAP/Swiper configurations.
2. **Missing Asset Failures**:  
   *Risk:* Visual breaks due to physically missing files in `assets/images/certifications/` and potentially other untracked directories.  
   *Mitigation:* Pre-emptively source clean vector assets for compliance bodies. Audit references during each page verification.
3. **Form Routing Errors**:  
   *Risk:* Submission errors if paths or fields differ from the expected schema inside `contact.php`.  
   *Mitigation:* Ensure form field `name` attributes inside `new-template/contact.html` exactly match `$name`, `$email`, and `$message` variables processed by `contact.php`. Test form handlers locally using file logging triggers.
4. **Link Integrity / Broken Links**:  
   *Risk:* 404 errors if page filenames are changed (e.g. renaming `about.html` to `about-us.html` without updating sitemaps/internal links).  
   *Mitigation:* Ensure internal hyperlinks match the destination files. If template files are renamed or split (e.g. `about.html` vs `about-us.html`), configure internal link redirects or align filenames to match original targets if necessary.
