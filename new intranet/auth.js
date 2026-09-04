/**
 * JACHINS Intranet Authentication Manager
 *
 * Login page:
 *     index.html
 *
 * Protected pages:
 *     dashboard.html
 *     employees.html
 *     etc.
 */

(function () {
    "use strict";

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

        /*
         * Use cached profile only when the auth_user_id matches.
         */

        if (
            cachedProfile &&
            authUserId &&
            cachedProfile.auth_user_id === authUserId
        ) {
            return cachedProfile;
        }

        const sb = getClient();

        if (!sb) {

            console.error(
                "Cannot load employee profile: Supabase unavailable."
            );

            return null;
        }


        /* =====================================================
           STEP 1
           Search by auth_user_id
           ===================================================== */

        if (authUserId) {

            try {

                console.log(
                    "Looking for employee using auth_user_id:",
                    authUserId
                );

                const result = await sb
                    .from("employees")
                    .select(
                        "id, auth_user_id, employee_id, email, name, role, department"
                    )
                    .eq("auth_user_id", authUserId)
                    .maybeSingle();

                if (result.error) {

                    console.error(
                        "Employee lookup by auth_user_id failed:",
                        result.error
                    );

                } else if (result.data) {

                    cachedProfile = result.data;

                    console.log(
                        "Employee profile FOUND by auth_user_id:",
                        cachedProfile
                    );

                    return cachedProfile;
                }

            } catch (error) {

                console.error(
                    "Unexpected auth_user_id profile lookup error:",
                    error
                );
            }
        }


        /* =====================================================
           STEP 2
           Search by email
           ===================================================== */

        if (userEmail) {

            try {

                const cleanEmail =
                    String(userEmail)
                        .trim()
                        .toLowerCase();

                console.log(
                    "Looking for employee using email:",
                    cleanEmail
                );

                const result = await sb
                    .from("employees")
                    .select(
                        "id, auth_user_id, employee_id, email, name, role, department"
                    )
                    .ilike("email", cleanEmail)
                    .maybeSingle();

                if (result.error) {

                    console.error(
                        "Employee lookup by email failed:",
                        result.error
                    );

                } else if (result.data) {

                    cachedProfile = result.data;

                    console.log(
                        "Employee profile FOUND by email:",
                        cachedProfile
                    );

                    /*
                     * If the employee row has no auth_user_id,
                     * attempt to connect it.
                     */

                    if (
                        authUserId &&
                        !result.data.auth_user_id
                    ) {

                        try {

                            const updateResult = await sb
                                .from("employees")
                                .update({
                                    auth_user_id: authUserId
                                })
                                .eq("id", result.data.id);

                            if (updateResult.error) {

                                console.warn(
                                    "Employee found, but auth_user_id could not be linked:",
                                    updateResult.error
                                );

                            } else {

                                cachedProfile.auth_user_id =
                                    authUserId;

                                console.log(
                                    "Employee auth_user_id successfully linked."
                                );
                            }

                        } catch (linkError) {

                            console.warn(
                                "Error linking auth_user_id:",
                                linkError
                            );
                        }
                    }

                    return cachedProfile;
                }

            } catch (error) {

                console.error(
                    "Unexpected email profile lookup error:",
                    error
                );
            }
        }


        /* =====================================================
           NOTHING FOUND
           ===================================================== */

        console.error(
            "NO EMPLOYEE PROFILE FOUND.",
            {
                authUserId: authUserId || null,
                email: userEmail || null
            }
        );

        return null;
    }


    /* =========================================================
       LOGIN
       ========================================================= */

    async function login(email, password) {

        const sb = getClient();

        if (!sb || !sb.auth) {

            throw new Error(
                "Supabase authentication is not available."
            );
        }

        const cleanEmail =
            String(email || "")
                .trim()
                .toLowerCase();

        if (!cleanEmail || !password) {

            throw new Error(
                "Please enter your email and password."
            );
        }

        console.log(
            "Attempting Supabase login:",
            cleanEmail
        );


        /* =====================================================
           SUPABASE AUTHENTICATION
           ===================================================== */

        const {
            data: authData,
            error: authError
        } = await sb.auth.signInWithPassword({
            email: cleanEmail,
            password: password
        });

        if (authError) {

            console.error(
                "Supabase authentication failed:",
                authError
            );

            throw authError;
        }

        if (
            !authData ||
            !authData.user
        ) {

            throw new Error(
                "Authentication succeeded but Supabase did not return a user."
            );
        }

        const user = authData.user;

        console.log(
            "AUTHENTICATED USER:",
            {
                id: user.id,
                email: user.email
            }
        );


        /* =====================================================
           EMPLOYEE PROFILE
           ===================================================== */

        const profile = await loadProfile(
            user.id,
            user.email
        );


        if (!profile) {

            /*
             * IMPORTANT:
             *
             * Authentication itself succeeded.
             *
             * This is now a genuine employee-table lookup
             * failure, not an "invalid password" error.
             */

            const profileError = new Error(
                "Your account is authenticated, but the employee profile could not be loaded."
            );

            profileError.code =
                "EMPLOYEE_PROFILE_NOT_FOUND";

            /*
             * Do NOT immediately sign out here.
             *
             * Keeping the session temporarily makes debugging
             * much easier and prevents the login page from
             * hiding the actual database/RLS problem.
             */

            throw profileError;
        }


        /* =====================================================
           VERIFY PROFILE BELONGS TO AUTH USER
           ===================================================== */

        if (
            profile.auth_user_id &&
            profile.auth_user_id !== user.id
        ) {

            console.error(
                "Employee profile belongs to a different auth user.",
                {
                    profileAuthUserId:
                        profile.auth_user_id,

                    authenticatedUserId:
                        user.id
                }
            );

            const mismatchError = new Error(
                "Your employee profile is linked to a different authentication account."
            );

            mismatchError.code =
                "EMPLOYEE_AUTH_USER_MISMATCH";

            throw mismatchError;
        }


        /* =====================================================
           CREATE SESSION PAYLOAD
           ===================================================== */

        const sessionPayload = {

            user: user,

            session: authData.session,

            profile: profile

        };


        /* =====================================================
           SAVE SESSION
           ===================================================== */

        try {

            window.sessionStorage.setItem(
                "intranet_session",
                JSON.stringify(sessionPayload)
            );

        } catch (error) {

            console.warn(
                "Could not save intranet session:",
                error
            );
        }


        console.log(
            "LOGIN COMPLETED SUCCESSFULLY:",
            {
                authUserId: user.id,
                employeeRowId: profile.id,
                employeeId: profile.employee_id,
                name: profile.name,
                role: profile.role
            }
        );

        return sessionPayload;
    }


    /* =========================================================
       POPULATE USER UI
       ========================================================= */

    function populateUserUI(profile, user) {

        if (!profile && !user) {
            return;
        }

        const metadata =
            (user && user.user_metadata) || {};

        const fullName =
            (profile && profile.name) ||
            metadata.full_name ||
            metadata.name ||
            (
                user &&
                user.email
                    ? user.email
                        .split("@")[0]
                        .replace(/[._]/g, " ")
                        .replace(/\b\w/g, function (letter) {
                            return letter.toUpperCase();
                        })
                    : "Employee"
            );

        const firstName =
            metadata.first_name ||
            fullName
                .trim()
                .split(/\s+/)[0] ||
            "Employee";

        const email =
            (user && user.email) ||
            (profile && profile.email) ||
            "";

        const role =
            (profile && profile.role) ||
            metadata.role ||
            "Staff Member";

        const department =
            (profile && profile.department) ||
            metadata.department ||
            "JACHINS Group";

        const employeeId =
            (profile && profile.employee_id) ||
            metadata.employee_id ||
            "N/A";

        const initials =
            initialsOf(fullName);


        document
            .querySelectorAll("[data-user-name]")
            .forEach(function (element) {
                element.textContent = fullName;
            });


        document
            .querySelectorAll("[data-user-first-name]")
            .forEach(function (element) {
                element.textContent = firstName;
            });


        document
            .querySelectorAll("[data-user-email]")
            .forEach(function (element) {
                element.textContent = email;
            });


        document
            .querySelectorAll("[data-user-avatar]")
            .forEach(function (element) {
                element.textContent = initials;
            });


        document
            .querySelectorAll("[data-user-role]")
            .forEach(function (element) {
                element.textContent = role;
            });


        document
            .querySelectorAll("[data-user-department]")
            .forEach(function (element) {
                element.textContent = department;
            });


        document
            .querySelectorAll("[data-user-id]")
            .forEach(function (element) {
                element.textContent = employeeId;
            });


        const isAdmin =
            String(role)
                .trim()
                .toLowerCase() === "admin";


        document
            .querySelectorAll(".sis-admin-only-hidden")
            .forEach(function (element) {

                if (isAdmin) {
                    element.classList.remove(
                        "sis-admin-only-hidden"
                    );
                } else {
                    element.classList.add(
                        "sis-admin-only-hidden"
                    );
                }

            });
    }


    /* =========================================================
       PROTECTED PAGE
       ========================================================= */

    async function protectPage() {

        const body = document.body;

        if (
            !body ||
            body.getAttribute("data-protected") !== "true"
        ) {
            return null;
        }

        try {

            const session =
                await getSession();


            if (
                !session ||
                !session.user
            ) {

                console.warn(
                    "No authenticated session. Redirecting to index.html."
                );

                window.location.replace(
                    "index.html"
                );

                return null;
            }


            const profile =
                await loadProfile(
                    session.user.id,
                    session.user.email
                );


            if (!profile) {

                console.error(
                    "Authenticated user has no employee profile."
                );

                window.location.replace(
                    "index.html?reason=profile"
                );

                return null;
            }


            if (
                body.getAttribute("data-admin") === "true"
            ) {

                const isAdmin =
                    String(profile.role || "")
                        .toLowerCase() === "admin";

                if (!isAdmin) {

                    window.location.replace(
                        "dashboard.html"
                    );

                    return null;
                }
            }


            populateUserUI(
                profile,
                session.user
            );

            startAutoLogoutTimers();


            return {
                session: session,
                user: session.user,
                profile: profile
            };

        } catch (error) {

            console.error(
                "protectPage error:",
                error
            );

            window.location.replace(
                "index.html"
            );

            return null;
        }
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout(reason) {

        if (logoutInProgress) {
            return;
        }

        logoutInProgress = true;

        try {

            const sb = getClient();

            if (sb && sb.auth) {
                await sb.auth.signOut();
            }

        } catch (error) {

            console.error(
                "Supabase logout error:",
                error
            );

        } finally {

            cachedProfile = null;

            try {

                window.sessionStorage.clear();

                window.localStorage.removeItem(
                    "intranet_session"
                );

            } catch (error) {

                console.warn(
                    "Could not clear browser storage:",
                    error
                );
            }

            const query =
                reason
                    ? "?reason=" +
                      encodeURIComponent(reason)
                    : "";

            window.location.replace(
                "index.html" + query
            );
        }
    }


    /* =========================================================
       LOGOUT BUTTONS
       ========================================================= */

    function wireLogout() {

        document
            .querySelectorAll("[data-logout]")
            .forEach(function (element) {

                if (
                    element.dataset.authLogoutWired === "true"
                ) {
                    return;
                }

                element.dataset.authLogoutWired =
                    "true";

                element.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        logout();

                    }
                );
            });
    }


    /* =========================================================
       AUTOMATIC LOGOUT
       ========================================================= */

    function startAutoLogoutTimers() {

        if (timersStarted) {
            return;
        }

        timersStarted = true;

        [
            "mousemove",
            "keydown",
            "click",
            "scroll",
            "touchstart"
        ].forEach(function (eventName) {

            document.addEventListener(
                eventName,
                function () {
                    lastActivity = Date.now();
                },
                {
                    passive: true
                }
            );

        });


        window.setInterval(
            function () {

                if (
                    Date.now() -
                    lastActivity >
                    INACTIVITY_LIMIT_MS
                ) {

                    logout("timeout");
                }

            },
            30 * 1000
        );


        document.addEventListener(
            "visibilitychange",
            function () {

                if (document.hidden) {

                    hiddenAt = Date.now();

                } else {

                    if (
                        hiddenAt &&
                        Date.now() - hiddenAt >
                        AWAY_LIMIT_MS
                    ) {

                        logout("timeout");

                        return;
                    }

                    hiddenAt = null;
                }

            }
        );
    }


    /* =========================================================
       AUTH STATE CHANGES
       ========================================================= */

    function listenAuthStateChanges() {

        const sb = getClient();

        if (!sb || !sb.auth) {
            return;
        }

        sb.auth.onAuthStateChange(
            async function (event, session) {

                const isProtected =
                    document.body &&
                    document.body.getAttribute(
                        "data-protected"
                    ) === "true";


                if (event === "SIGNED_OUT") {

                    if (isProtected) {

                        window.location.replace(
                            "index.html"
                        );
                    }

                    return;
                }


                if (
                    event === "SIGNED_IN" ||
                    event === "TOKEN_REFRESHED" ||
                    event === "USER_UPDATED"
                ) {

                    if (
                        session &&
                        session.user &&
                        isProtected
                    ) {

                        try {

                            const profile =
                                await loadProfile(
                                    session.user.id,
                                    session.user.email
                                );

                            if (profile) {

                                populateUserUI(
                                    profile,
                                    session.user
                                );
                            }

                        } catch (error) {

                            console.error(
                                "Auth state profile update error:",
                                error
                            );
                        }
                    }
                }

            }
        );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.IntranetAuth = {

        login: login,

        getSession: getSession,

        loadProfile: loadProfile,

        populateUserUI: populateUserUI,

        protectPage: protectPage,

        wireLogout: wireLogout,

        logout: logout,

        doLogout: logout,

        startAutoLogoutTimers:
            startAutoLogoutTimers

    };

})();