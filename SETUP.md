# Sena Lab — First-time Setup Guide

Follow these steps once before deploying. Takes about 10 minutes.

---

## Step 1 — Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New project**
3. Name it `sena-lab`, choose a region close to Albania (e.g. Frankfurt), set a database password
4. Wait ~2 minutes for provisioning

---

## Step 2 — Run the database schema

1. In your Supabase project, go to **SQL Editor** → **New query**
2. Open the file `schema.sql` from this project
3. Copy-paste the entire contents into the editor
4. Click **Run** — you should see "Success. No rows returned."

---

## Step 3 — Fill in `config.js`

1. In Supabase, go to **Settings → API**
2. Copy **Project URL** and **anon / public** key
3. Open `config.js` in this project and fill them in:

```js
window.SENA_CONFIG = {
  supabaseUrl: 'https://YOUR-ID.supabase.co',
  supabaseKey: 'eyJhbGci…',
};
```

---

## Step 4 — Create the first admin user

1. In Supabase, go to **Authentication → Users** → **Add user**
2. Enter your email and a strong password
3. After creating them, go to **Table Editor → staff_profiles**
4. Find the new row (it was auto-created by the trigger)
5. Change the `role` column from `laburant` to `admin`
6. Save

> From now on you can create all other staff from inside the app (Personnel page → Invite staff).

---

## Step 5 — Deploy to Netlify

### Option A — Drag and drop (quickest)

1. Go to [netlify.com](https://netlify.com)
2. Drag the `Sena Lab` folder onto the deploy area
3. Done — your site is live in under a minute

### Option B — Git (recommended for ongoing changes)

1. Create a private GitHub repository
2. Push this folder to it
3. In Netlify → **Add new site → Import from Git**
4. Pick the repo. Leave **Build command** empty, set **Publish directory** to `.`
5. Click **Deploy site**

---

## Step 6 — Set Netlify environment variables

> Only needed for staff invite / delete to work.

1. Netlify dashboard → your site → **Site settings → Environment variables**
2. Add:
   - `SUPABASE_URL` — same value as in `config.js`
   - `SUPABASE_SERVICE_KEY` — from Supabase → Settings → API → **service_role** key
3. Redeploy the site

---

## Changing your password later

Log in as any staff member, go to **Settings**, scroll to **Change your password**, enter and confirm a new password.

---

## Adding new staff later

1. Log in as admin
2. Go to **Personnel** → **Invite staff**
3. Enter their email, name, and role
4. They receive an email with a link to set their own password

---

## Summary of what goes where

| Data | Lives in |
|---|---|
| Patient records + test results | Supabase database |
| Staff accounts + passwords | Supabase Auth |
| Lab name / address / phone | Supabase database |
| Supabase URL + anon key | `config.js` (public, safe) |
| Supabase service key | Netlify environment variable (private) |
| Nothing | localStorage / browser (fully removed) |
