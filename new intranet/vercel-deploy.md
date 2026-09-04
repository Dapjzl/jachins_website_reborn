# Vercel deployment checklist for the static intranet

1. Prepare your Supabase project
   - Create or open the Supabase project.
   - Go to Authentication > Providers and enable Email sign-in.
   - Open SQL Editor and run the contents of `supabase-schema.sql`.
   - Add a few seed employee records, including each employee's `auth_user_id` and matching `email`.

2. Set the front-end config
   - Open `new intranet/supabase-config.js`.
   - Replace the placeholder URL and anon key with your actual Supabase project values.
   - Keep `window.SUPABASE_CONFIG` available before `auth.js` loads.

3. Make sure the app is static and Vercel-ready
   - Host the intranet folder as a static site on Vercel.
   - Use relative links such as `dashboard.html`, `index.html`, `hr.html`.
   - Do not rely on PHP or Apache-specific runtime behavior.
   - Ensure all protected pages include `data-protected="true"` and include `auth.js` after `supabase-config.js`.

4. Configure login and session guards
   - `index.html` is the public login page.
   - `dashboard.html` and all protected pages call `requireAuth()` from `auth.js`.
   - Users who are not signed in are redirected to `index.html`.
   - `admin.html` uses `requireAdminAccess()`, which redirects non-admin users to `dashboard.html`.

5. Recommended employee mapping pattern
   - When a user signs in with Supabase email/password, fetch the matching row from `public.employees` using `auth_user_id`.
   - If that fails, try a fallback lookup by `email`.
   - Use the employee row to populate the employee name, role, department, and employee ID in the page UI.

6. Security notes
   - Never trust browser-only role hiding as an authorization mechanism.
   - Use Postgres Row Level Security to control employee visibility and admin actions.
   - Keep the Supabase anon key public but scope access with RLS.

7. Deployment verification checklist
   - Login page loads.
   - Valid credentials redirect to `dashboard.html`.
   - Invalid credentials show the error banner.
   - Protected page access without a session redirects to login.
   - Admin page blocks non-admin users.
   - Logout clears the Supabase session and redirects to the login page.

8. Optional next step
   - Replace the static demo employee data with live data from Supabase once you have your real `employees` records and roles in production.
