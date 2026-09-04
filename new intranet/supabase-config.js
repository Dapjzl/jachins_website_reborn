/**
 * supabase-config.js
 *
 * JACHINS Employee Intranet
 * Supabase configuration
 */

(function () {
    "use strict";

    /*
     * =========================================================
     * SUPABASE PROJECT CONFIGURATION
     * =========================================================
     */

    const SUPABASE_URL =
        "https://ukiqmxjewewfnppsxour.supabase.co";

    const SUPABASE_ANON_KEY =
        "sb_publishable_dIT_5d803IvY65ba30q2jw_IosfndRG";


    /*
     * =========================================================
     * GLOBAL CONFIGURATION
     * =========================================================
     */

    window.SUPABASE_CONFIG = {
        url: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY
    };


    /*
     * =========================================================
     * SUPABASE CLIENT INITIALIZATION
     * =========================================================
     */

    function initSupabaseClient() {

        /*
         * Do not create the client twice.
         */

        if (window.supabaseClient) {
            return window.supabaseClient;
        }


        /*
         * Make sure the Supabase CDN loaded first.
         */

        if (
            typeof supabase === "undefined" ||
            typeof supabase.createClient !== "function"
        ) {

            console.error(
                "Supabase JS library is not loaded."
            );

            return null;
        }


        try {

            window.supabaseClient =
                supabase.createClient(
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


            console.log(
                "JACHINS Supabase client initialized."
            );


            console.log(
                "Supabase URL:",
                window.SUPABASE_CONFIG.url
            );


            return window.supabaseClient;

        } catch (error) {

            console.error(
                "Supabase client initialization failed:",
                error
            );

            return null;
        }
    }


    /*
     * =========================================================
     * GLOBAL CLIENT ACCESSOR
     * =========================================================
     */

    window.getSupabaseClient =
        initSupabaseClient;


    /*
     * =========================================================
     * INITIALIZE
     * =========================================================
     */

    if (
        typeof supabase !== "undefined" &&
        typeof supabase.createClient === "function"
    ) {

        initSupabaseClient();
    }

})();