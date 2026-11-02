/**
 * JACHINS Intranet Authentication & Realtime Manager
 *
 * Login page:
 *    index.html
 *
 * Protected pages:
 *    dashboard.html
 *    ceo-finances.html
 *    employees.html
 *    etc.
 */

(function () {
    "use strict";

    // ⚠️ AUTHORIZED MANAGEMENT EMAIL CONFIGURATIONS ⚠️
    const AUTHORIZED_CEO_EMAIL = "abimbola@jachinsgroup.com"; 
    const AUTHORIZED_HR_EMAILS = [
        // "hr@jachinsgroup.com" // Add authorized HR emails here
    ];
    const AUTHORIZED_ADMIN_EMAILS = [
        // "it-admin@jachinsgroup.com" // Add authorized IT Admin emails here
    ];

    let cachedProfile = null;
    let timersStarted = false;
    let logoutInProgress = false;

    let lastActivity = Date.now();
    let hiddenAt = null;

    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
    const AWAY_LIMIT_MS = 15 * 60 * 1000;


    /* =========================================================
       SUPABASE CLIENT
       ========================================================= */

    function getClient() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (typeof window.getSupabaseClient === "function") {
            const client = window.getSupabaseClient();

            if (client) {
                window.supabaseClient = client;
                return client;
            }
        }

        if (
            typeof supabase !== "undefined" &&
            typeof supabase.createClient === "function" &&
            window.SUPABASE_CONFIG
        ) {
            try {

                window.supabaseClient = supabase.createClient(
                    window.SUPABASE_CONFIG.url,
                    window.SUPABASE_CONFIG.anonKey,
                    {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    }
                );

                return window.supabaseClient;

            } catch (error) {

                console.error(
                    "Unable to create Supabase client:",
                    error
                );

                return null;
            }
        }

        console.error("Supabase client is not available.");

        return null;
    }


    /* =========================================================
       SESSION
       ========================================================= */

    async function getSession() {

        const sb = getClient();

        if (!sb || !sb.auth) {
            console.error(
                "Supabase authentication client unavailable."
            );
            return null;
        }

        try {

            const result = await sb.auth.getSession();

            if (result.error) {

                console.error(
                    "Supabase getSession error:",
                    result.error
                );

                return null;
            }

            return result.data
                ? result.data.session
                : null;

        } catch (error) {

            console.error(
                "getSession error:",
                error
            );

            return null;
        }
    }


    /* =========================================================
       INITIALS
       ========================================================= */

    function initialsOf(name) {

        if (!name) {
            return "?";
        }

        const parts = String(name)
            .trim()
            .split(/\s+/);

        const first =
            parts[0]
                ? parts[0][0]
                : "";

        const last =
            parts.length > 1
                ? parts[parts.length - 1][0]
                : "";

        return (
            first + last
        ).toUpperCase() || "?";
    }

    function normalizeRole(role) {
        const clean = String(role || "").trim().toLowerCase();
        // Strict mapping whitelist to avoid any blank or broken string leaking privileges
        if (clean === "ceo" || clean === "executive") return "ceo";
        if (clean === "admin" || clean === "it") return "admin";
        if (clean === "hr") return "hr";
        return "employee"; // Default fallback for all standard staff
    }

    function getDashboardForRole(role) {
        const cleanRole = normalizeRole(role);
        if (cleanRole === "ceo") {
            return "executive-dashboard.html";
        }
        if (cleanRole === "admin") {
            return "admin-dashboard.html";
        }
        if (cleanRole === "hr") {
            return "hr-dashboard.html";
        }
        return "dashboard.html"; // General employee default
    }


    /* =========================================================
       PROFILE
       ========================================================= */

    async function loadProfile(authUserId, userEmail) {

        if (!authUserId && !userEmail) {

            console.warn(
                "loadProfile called without auth user ID or email."
            );

            return null;
        }

        if (!authUserId) {
            cachedProfile = null;
            console.error("Cannot validate an employee profile without the authenticated user ID.");
            return null;
        }

        if (
            cachedProfile &&
            cachedProfile.auth_user_id === authUserId
        ) {
            cachedProfile.role = normalizeRole(cachedProfile.role);
            return cachedProfile;
        }
        cachedProfile = null;

        const sb = getClient();

        if (!sb) {
            console.error(
                "Cannot load employee profile: Supabase unavailable."
            );
            return null;
        }


        /* =====================================================
           STEP 1: Search by auth_user_id
           ===================================================== */

        if (authUserId) {

            try {

                const result = await sb
                    .from("employees")
                    .select(
                        "id, auth_user_id, employee_id, email, name, role, department, avatar_url"
                    )
                    .eq("auth_user_id", authUserId)
                    .maybeSingle();

                if (result.data) {
                    result.data.role = normalizeRole(result.data.role);
                    cachedProfile = result.data;
                    return cachedProfile;
                }

            } catch (error) {
                console.error("Unexpected auth_user_id profile lookup error:", error);
            }
        }


        /* =====================================================
           STEP 2: Search by email
           ===================================================== */

        if (userEmail) {

            try {

                const cleanEmail = String(userEmail).trim().toLowerCase();

                const result = await sb
                    .from("employees")
                    .select(
                        "id, auth_user_id, employee_id, email, name, role, department, avatar_url"
                    )
                    .ilike("email", cleanEmail)
                    .maybeSingle();

                if (result.data) {

                    if (!result.data.auth_user_id) {
                        await sb
                            .from("employees")
                            .update({ auth_user_id: authUserId })
                            .eq("id", result.data.id)
                            .is("auth_user_id", null);

                        result.data.auth_user_id = authUserId;
                    }

                    result.data.role = normalizeRole(result.data.role);
                    cachedProfile = result.data;
                    return cachedProfile;
                }

            } catch (error) {
                console.error("Unexpected email profile lookup error:", error);
            }
        }

        return null;
    }


    /* =========================================================
       LOGIN (STRICT PORTAL GATEWAY VALIDATION LOGIC)
       ========================================================= */

    async function login(email, password, portalType = 'general') {

        const sb = getClient();

        if (!sb || !sb.auth) {
            throw new Error("Supabase authentication is not available.");
        }

        const cleanEmail = String(email || "").trim().toLowerCase();

        if (!cleanEmail || !password) {
            throw new Error("Please enter your email and password.");
        }

        /* =====================================================
           1. PRE-AUTHENTICATION PORTAL GATES (Strict Gatekeeping)
           ===================================================== */
        if (portalType === 'ceo' && cleanEmail !== AUTHORIZED_CEO_EMAIL.toLowerCase()) {
            throw new Error("ACCESS DENIED: Only the Chief Executive Officer is authorized to sign into the Executive Portal.");
        }

        if (portalType === 'admin' && AUTHORIZED_ADMIN_EMAILS.length > 0 && !AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
            throw new Error("ACCESS DENIED: Unauthorized account for IT & Administration Gateway.");
        }

        if (portalType === 'hr' && AUTHORIZED_HR_EMAILS.length > 0 && !AUTHORIZED_HR_EMAILS.includes(cleanEmail)) {
            throw new Error("ACCESS DENIED: Unauthorized account for Human Resources Portal.");
        }

        // Authenticate with Supabase Auth
        const {
            data: authData,
            error: authError
        } = await sb.auth.signInWithPassword({
            email: cleanEmail,
            password: password
        });

        if (authError) {
            throw authError;
        }

        if (!authData || !authData.user) {
            throw new Error("Authentication succeeded but Supabase did not return a user.");
        }

        const user = authData.user;
        cachedProfile = null;

        // 2. Fetch employee profile and determine role from database
        const profile = await loadProfile(user.id, user.email);

        if (!profile) {
            await sb.auth.signOut();
            const profileError = new Error("Your account is authenticated, but the employee profile could not be found.");
            profileError.code = "EMPLOYEE_PROFILE_NOT_FOUND";
            throw profileError;
        }

        const role = normalizeRole(profile.role); // 'ceo', 'admin', 'hr', or 'employee'

        /* =====================================================
           3. STRICT TWO-WAY PORTAL & ROLE CROSS-VALIDATION
           ===================================================== */

        // RULE A: If a General Employee tries to log into ANY management/executive portal -> BLOCK
        if (role === 'employee' && (portalType === 'ceo' || portalType === 'admin' || portalType === 'hr')) {
            await sb.auth.signOut();
            throw new Error("ACCESS DENIED: General staff accounts cannot access administrative or executive portals.");
        }

        // RULE B: If a Management/Executive account tries to log into the General Staff portal -> BLOCK
        if (portalType === 'general' && (role === 'ceo' || role === 'admin' || role === 'hr')) {
            await sb.auth.signOut();
            throw new Error("ACCESS DENIED: Management and administrative accounts must use their designated portals.");
        }

        // RULE C: Portal-Specific Gateway Enforcement
        if (portalType === 'ceo' && role !== 'ceo') {
            await sb.auth.signOut();
            throw new Error("SECURITY VIOLATION: Non-executive account unauthorized for the CEO workspace.");
        }

        if (portalType === 'admin' && role !== 'admin') {
            await sb.auth.signOut();
            throw new Error("ACCESS DENIED: This account does not possess IT Administrator privileges.");
        }

        if (portalType === 'hr' && role !== 'hr') {
            await sb.auth.signOut();
            throw new Error("ACCESS DENIED: This account does not possess HR privileges.");
        }

        // Verify profile belongs to auth user
        if (profile.auth_user_id !== user.id) {
            await sb.auth.signOut();
            throw new Error("Your employee profile is linked to a different authentication account.");
        }

        const sessionPayload = {
            user: user,
            session: authData.session,
            profile: profile
        };

        try {
            window.sessionStorage.setItem(
                "intranet_session",
                JSON.stringify(sessionPayload)
            );
        } catch (error) {
            console.warn("Could not save intranet session:", error);
        }

        return sessionPayload;
    }


    /* =========================================================
       NEW EMPLOYEE ACCOUNT REGISTRATION
       ========================================================= */

    async function registerEmployee(email, password, fullName, department) {
        const sb = getClient();
        if (!sb) throw new Error("Database connection unavailable.");

        const cleanEmail = String(email || "").trim().toLowerCase();

        if (cleanEmail === AUTHORIZED_CEO_EMAIL.toLowerCase()) {
            throw new Error("This email is strictly reserved for Executive CEO Access.");
        }

        const { data, error } = await sb.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    department: department
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            const empCode = "JAC-" + Math.floor(1000 + Math.random() * 9000);

            await sb.from("employees").insert({
                auth_user_id: data.user.id,
                employee_id: empCode,
                email: cleanEmail,
                name: fullName,
                role: "employee",
                department: department || "General Operations"
            });
        }

        return data;
    }


    /* =========================================================
       POPULATE USER UI
       ========================================================= */

    function populateUserUI(profile, user) {

        if (!profile && !user) {
            return;
        }

        const metadata = (user && user.user_metadata) || {};

        const fullName =
            (profile && profile.name) ||
            metadata.full_name ||
            metadata.name ||
            (
                user && user.email
                    ? user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, function (letter) {
                        return letter.toUpperCase();
                    })
                    : "Employee"
            );

        const firstName = metadata.first_name || fullName.trim().split(/\s+/)[0] || "Employee";
        const email = (user && user.email) || (profile && profile.email) || "";
        const role = normalizeRole(profile && profile.role);
        const department = (profile && profile.department) || metadata.department || "JACHINS Group";
        const employeeId = (profile && profile.employee_id) || metadata.employee_id || "N/A";
        const initials = initialsOf(fullName);
        const avatarUrl = (profile && (profile.avatar_url || profile.photo_url || profile.image_url)) || null;

        document.querySelectorAll("[data-user-name]").forEach(function (element) {
            if (element.textContent !== fullName) element.textContent = fullName;
        });

        document.querySelectorAll("[data-user-first-name]").forEach(function (element) {
            if (element.textContent !== firstName) element.textContent = firstName;
        });

        document.querySelectorAll("[data-user-email]").forEach(function (element) {
            if (element.textContent !== email) element.textContent = email;
        });

        document.querySelectorAll("[data-user-avatar]").forEach(function (element) {
            if (avatarUrl && avatarUrl.trim() !== "") {
                element.innerHTML = '<img src="' + avatarUrl + '" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">';
            } else {
                if (element.textContent !== initials) element.textContent = initials;
            }
        });

        document.querySelectorAll("[data-user-role]").forEach(function (element) {
            let displayRole = 'Staff Member';
            if (role === 'ceo') displayRole = 'Chief Executive Officer';
            else if (role === 'admin') displayRole = 'IT Administrator';
            else if (role === 'hr') displayRole = 'Human Resources Manager';
            if (element.textContent !== displayRole) element.textContent = displayRole;
        });

        document.querySelectorAll("[data-user-department]").forEach(function (element) {
            if (element.textContent !== department) element.textContent = department;
        });

        document.querySelectorAll("[data-user-id]").forEach(function (element) {
            if (element.textContent !== employeeId) element.textContent = employeeId;
        });

        // Unhide Admin sidebar elements if user is Admin
        if (role === "admin") {
            document.querySelectorAll(".sis-admin-only-hidden").forEach(function (el) {
                el.classList.remove("sis-admin-only-hidden");
            });
        }

        const roleDashboard = getDashboardForRole(role);

        const navDash = document.getElementById("navDashboardLink");
        if (navDash) {
            navDash.setAttribute("href", roleDashboard);
        }

        document.querySelectorAll('a[href="dashboard.html"], [data-home-link="true"]').forEach(function (link) {
            link.setAttribute("href", roleDashboard);
        });

        // Dynamic link rerouting for CEO (Finances, Requisitions, and Asset Management)
        if (role === "ceo") {
            document.querySelectorAll('a[href="finances.html"]').forEach(function (link) {
                link.setAttribute("href", "ceo-finances.html");
            });
            document.querySelectorAll('a[href="requisition.html"], a[href="item-requisition.html"]').forEach(function (link) {
                link.setAttribute("href", "ceo-item-requisitions.html");
            });
            document.querySelectorAll('a[href="assets.html"]').forEach(function (link) {
                link.setAttribute("href", "ceo-assets.html");
            });
        }
    }


    /* =========================================================
       PROTECTED PAGE & SECURITY GUARDS
       ========================================================= */

    async function protectPage() {

        const body = document.body;

        if (!body || body.getAttribute("data-protected") !== "true") {
            return null;
        }

        try {
            const session = await getSession();

            if (!session || !session.user) {
                window.location.replace("index.html");
                return null;
            }

            const profile = await loadProfile(session.user.id, session.user.email);

            if (!profile) {
                window.location.replace("index.html?reason=profile");
                return null;
            }

            const role = normalizeRole(profile.role);
            const isCeoPage = window.location.pathname.includes("ceo-finances") || window.location.pathname.includes("ceo-item-requisitions") || window.location.pathname.includes("ceo-assets") || window.location.pathname.includes("executive-dashboard") || body.getAttribute("data-ceo-only") === "true";

            if (isCeoPage && role !== "ceo") {
                window.location.replace(getDashboardForRole(role));
                return null;
            }

            if (body.getAttribute("data-page") === "admin-dashboard" || body.getAttribute("data-admin") === "true") {
                if (role !== "admin") {
                    window.location.replace(getDashboardForRole(role));
                    return null;
                }
            }

            populateUserUI(profile, session.user);
            startAutoLogoutTimers();

            return {
                session: session,
                user: session.user,
                profile: profile
            };

        } catch (error) {
            window.location.replace("index.html");
            return null;
        }
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout(reason) {

        if (logoutInProgress) return;
        logoutInProgress = true;

        try {
            const sb = getClient();
            if (sb && sb.auth) await sb.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            cachedProfile = null;
            try {
                window.sessionStorage.clear();
                window.localStorage.removeItem("intranet_session");
            } catch (error) {}

            window.location.replace(
                "index.html" + (reason ? "?reason=" + encodeURIComponent(reason) : "")
            );
        }
    }

    function wireLogout() {
        document.querySelectorAll("[data-logout]").forEach(function (element) {
            if (element.dataset.authLogoutWired === "true") return;
            element.dataset.authLogoutWired = "true";
            element.addEventListener("click", function (event) {
                event.preventDefault();
                logout();
            });
        });
    }

    function startAutoLogoutTimers() {
        if (timersStarted) return;
        timersStarted = true;

        ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(function (eventName) {
            document.addEventListener(eventName, function () {
                lastActivity = Date.now();
            }, { passive: true });
        });

        window.setInterval(function () {
            if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
                logout("timeout");
            }
        }, 30 * 1000);
    }

    function clearProfileAvatar(authUserId, user) {
        if (!cachedProfile || cachedProfile.auth_user_id !== authUserId) {
            cachedProfile = null;
            return false;
        }

        cachedProfile.avatar_url = null;
        cachedProfile.photo_url = null;
        cachedProfile.image_url = null;
        populateUserUI(cachedProfile, user);
        return true;
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.IntranetAuth = {
        login: login,
        registerEmployee: registerEmployee,
        getSession: getSession,
        loadProfile: loadProfile,
        getDashboardForRole: getDashboardForRole,
        populateUserUI: populateUserUI,
        clearProfileAvatar: clearProfileAvatar,
        protectPage: protectPage,
        wireLogout: wireLogout,
        logout: logout,
        doLogout: logout,
        startAutoLogoutTimers: startAutoLogoutTimers
    };

})();

/* =========================================================
   INTRANET PAGE LOADER & REAL-TIME PERSISTENCE OBSERVER
   ========================================================= */
(function () {
    "use strict";

    async function loadPartial(id, file) {
        const placeholder = document.getElementById(id);
        if (!placeholder) return;

        try {
            const response = await fetch(file, { cache: "no-cache" });
            if (!response.ok) throw new Error(`${file} returned ${response.status}`);
            placeholder.innerHTML = await response.text();
        } catch (error) {
            console.error(`Unable to load ${file}:`, error);
        }
    }

    async function initializeIntranetPage() {
        const body = document.body;
        if (!body) return;

        await Promise.all([
            loadPartial("header-placeholder", "header.html"),
            loadPartial("sidebar-placeholder", "sidebar.html"),
            loadPartial("footer-placeholder", "footer.html")
        ]);

        if (window.IntranetAuth) {
            await window.IntranetAuth.protectPage();
            window.IntranetAuth.wireLogout();
        }

        body.classList.add("is-ready");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeIntranetPage, { once: true });
    } else {
        initializeIntranetPage();
    }
})();

/* =========================================================
   GLOBAL CHANGE PHOTO MODAL HANDLER FOR HEADER
   ========================================================= */
window.openHeaderAvatarModal = async function(e) {
    if (e) e.preventDefault();

    const modalEl = document.getElementById("headerAvatarModal");
    if (!modalEl) {
        alert("Header avatar modal element not found.");
        return;
    }

    const client = window.supabaseClient || window.supabase;
    if (!client || !client.auth) return;

    let modalInstance = null;
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    }

    try {
        const authResult = await client.auth.getUser();
        if (authResult.error) throw authResult.error;
        const user = authResult.data && authResult.data.user;
        if (!user) throw new Error("No authenticated user available.");

        const profile = window.IntranetAuth
            ? await window.IntranetAuth.loadProfile(user.id, user.email)
            : null;
        const name = (profile && profile.name) || (user.user_metadata && user.user_metadata.full_name) || "Employee";
        const initials = name.trim().split(/\s+/).map(p => p.charAt(0)).join("").slice(0, 2).toUpperCase() || "?";
        const avatarUrl = profile && (profile.avatar_url || profile.photo_url || profile.image_url);
        const preview = document.getElementById("headerModalPreview");
        const removeButton = document.getElementById("removePhotoBtn");

        if (preview) {
            preview.innerHTML = avatarUrl
                ? '<img src="' + avatarUrl + '" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%">'
                : initials;
        }

        if (removeButton) {
            removeButton.onclick = async function(event) {
                event.preventDefault();
                if (removeButton.disabled) return;
                removeButton.disabled = true;

                try {
                    await client
                        .from("employees")
                        .update({ avatar_url: null, photo_url: null, image_url: null })
                        .eq("auth_user_id", user.id);

                    window.IntranetAuth && window.IntranetAuth.clearProfileAvatar(user.id, user);
                    if (preview) preview.textContent = initials;

                    if (modalInstance) modalInstance.hide();
                    else {
                        modalEl.classList.remove("show");
                        modalEl.style.display = "none";
                    }
                } catch (error) {
                    alert("Failed to remove photo. Please try again.");
                } finally {
                    removeButton.disabled = false;
                }
            };
        }

        if (modalInstance) modalInstance.show();
        else {
            modalEl.classList.add("show");
            modalEl.style.display = "block";
        }
    } catch (error) {
        alert("Unable to load profile photo modal.");
    }
};

/* =========================================================
   REALTIME & NOTIFICATIONS
   ========================================================= */
function playIntranetChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [659.25, 987.77]; 
        notes.forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime + (index * 0.12));
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (index * 0.12) + 0.6);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + (index * 0.12));
            osc.stop(audioCtx.currentTime + (index * 0.12) + 0.6);
        });
    } catch (e) {}
}

function showNotificationToast(title, message, iconClass = "fa-bell text-warning") {
    let container = document.getElementById("toast-notification-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-notification-container";
        container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast show shadow-lg border-0 rounded-3 bg-dark text-white";
    toast.style.cssText = "min-width: 300px; animation: slideIn 0.3s ease;";
    toast.innerHTML = `
        <div class="toast-header bg-dark text-white border-bottom border-secondary d-flex justify-content-between align-items-center p-2">
            <strong class="me-auto"><i class="fa-solid ${iconClass} me-2"></i> ${title}</strong>
            <small class="text-muted">Just now</small>
            <button type="button" class="btn-close btn-close-white ms-2" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
        <div class="toast-body p-3 fs-6">${message}</div>
    `;
    container.appendChild(toast);
    playIntranetChime();
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
}