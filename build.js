/**
 * Netlify build script — runs before deploy.
 *
 * Instead of writing a publicly-accessible config.js, this script
 * injects the Supabase credentials as an INLINE <script> directly
 * into index.html. No separate URL ever exposes the keys.
 *
 * Required Netlify environment variables:
 *   SUPABASE_URL       — your project URL
 *   SUPABASE_ANON_KEY  — your anon / public key
 */
const fs = require('fs');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bTyyHv-Du2FPVoTEGpywuQ_LUD3gdPV';

if (!url) {
  console.error('❌  Missing SUPABASE_URL environment variable.');
  process.exit(1);
}

// 1. Replace the <script src="config.js"> tag in index.html with an
//    inline script — no separate file means no public URL to sniff.
let html = fs.readFileSync('index.html', 'utf8');
const inline = `<script>window.SENA_CONFIG={supabaseUrl:'${url}',supabaseKey:'${key}'};</script>`;
html = html.replace('<script src="config.js"></script>', inline);
fs.writeFileSync('index.html', html);

// 2. Overwrite config.js with a harmless placeholder so the file
//    exists on disk (avoids 404 during the build) but reveals nothing.
fs.writeFileSync('config.js', '/* credentials are injected inline into index.html at build time */\n');

console.log('✅  Supabase config injected inline into index.html — no config.js exposed.');
