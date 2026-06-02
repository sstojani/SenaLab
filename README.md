# 🧪 Sena Lab — Clinical Laboratory Results Portal

> A modern, full-stack web platform for a family-owned clinical laboratory in Librazhd, Albania.  
> Patients retrieve their test results online from any device. Staff manage records from a secure dashboard.

---

## What it does

### For patients
- Visit the public website and enter the **unique code** from their lab visit
- View published test results instantly — no app download, no account needed
- Print or save results as a professional PDF with QR code

### For laboratory staff
- Secure login with email + password (Supabase Auth — real JWTs)
- Create, edit, and publish patient records with complete test result data
- Auto-populated reference ranges from a built-in test catalog (16 common tests)
- Live report preview — see exactly what the PDF looks like before publishing
- Export professional reports with lab logo, QR code, and signature block

### For administrators
- Full patient record management (create / edit / delete)
- Invite new staff members by email — they set their own password
- Update laboratory profile (name, address, phone)
- Change your own password from the settings page
- Role-based access: `admin` has full control, `laburant` manages patient records

---

## Key features

| Feature | Details |
|---|---|
| 🌐 **Works on any device** | Patient results accessible on phones, tablets, desktops from anywhere |
| 🔒 **Real authentication** | Supabase Auth — JWTs, no hardcoded credentials anywhere |
| 🛡️ **Row-Level Security** | Public users can only read *Published* records — staff data never exposed |
| 📄 **Professional PDF export** | jsPDF-generated reports with logo, QR code, and reference ranges |
| 🎨 **Modern dark UI** | Glassmorphism design, animated particle background, 3D fluid hero orb |
| ✨ **Scroll animations** | Bidirectional — elements animate in scrolling down, out scrolling up |
| 🚀 **Zero build step** | Vanilla HTML / CSS / JS — no bundler, no framework, deploys in seconds |
| ☁️ **Netlify-ready** | Security headers (CSP, HSTS, X-Frame-Options) and serverless functions pre-configured |
| 🔐 **Brute-force protection** | 5 failed login attempts triggers a 30-second lockout |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5 · CSS3 · JavaScript (no framework) |
| 3D animation | [Three.js](https://threejs.org) — fluid orb with GLSL simplex-noise shaders |
| Typography | Figtree + Inter via Google Fonts |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth (email/password, JWT sessions) |
| PDF export | [jsPDF](https://github.com/parallax/jsPDF) |
| QR codes | qrcode.js + api.qrserver.com |
| Hosting | [Netlify](https://netlify.com) (static site + serverless functions) |
| Functions | Node.js (Netlify Functions) — staff invite and delete |

---

## Project structure

```
SenaLab/
├── index.html              # Single-page app — all views in one file
├── styles.css              # Complete design system (dark glassmorphism)
├── app.js                  # Application logic — routing, forms, auth, PDF
├── db.js                   # Async Supabase data layer (all DB operations)
├── animations.js           # Particle network, scroll reveals, 3D tilt, magnetic buttons
├── fluid-hero.js           # Three.js fluid orb (GLSL shaders, mouse interaction)
├── config.js               # ← Fill in your Supabase URL + anon key here
├── schema.sql              # Run once in Supabase SQL Editor to create all tables
├── netlify.toml            # Deployment + security headers config
├── SETUP.md                # Step-by-step first-run guide
├── assets/
│   ├── sena-lab-logo.png
│   └── vendor/
│       ├── jspdf.umd.min.js
│       └── qrcode.min.js
└── netlify/
    └── functions/
        ├── invite-staff.js   # Serverless: creates a Supabase Auth user
        └── delete-staff.js   # Serverless: permanently removes a staff member
```

---

## Getting started

> Full step-by-step walkthrough: **[SETUP.md](./SETUP.md)**

### Quick summary (≈ 10 minutes)

1. **Create a free [Supabase](https://supabase.com) project**
2. **Run `schema.sql`** in Supabase → SQL Editor
3. **Edit `config.js`** — paste your Project URL and `anon` key
4. **Create your first admin** via Supabase → Authentication → Users, then set their `role = 'admin'` in the `staff_profiles` table
5. **Deploy to Netlify** — drag-and-drop the folder, or connect this GitHub repo
6. **Add two environment variables** in Netlify: `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`

---

## Security highlights

- ✅ No default or demo credentials anywhere in the codebase
- ✅ Row-Level Security enforced at the database level (not just the app)
- ✅ Session tokens are cryptographically random UUIDs
- ✅ Login brute-force protection (5 attempts → 30-second lockout)
- ✅ Supabase service key only used server-side (Netlify Functions) — never in client code
- ✅ Content Security Policy, HSTS, X-Frame-Options, and Permissions-Policy headers via `netlify.toml`
- ✅ `.claude/` and `server.js` blocked from public access by redirect rules

---

## Local development

```bash
# Requires Node.js — runs a static file server on port 5173
node server.js
# Then open: http://127.0.0.1:5173
```

> `config.js` must be filled in with your Supabase credentials before the app will load.

---

## Built with ❤️ for the family

This platform was built to help the **Murtini family laboratory** in Librazhd, Albania serve their patients better — so nobody has to make an extra trip just to pick up a piece of paper.

---

## License

MIT — use it, fork it, and adapt it for your own clinic or laboratory.
