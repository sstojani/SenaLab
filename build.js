const fs = require('fs');

const url = process.env.SUPABASE_URL      || '';
const key = process.env.SUPABASE_ANON_KEY || '';

console.log('SUPABASE_URL    :', url ? url.slice(0, 30) + '...' : '❌ MISSING');
console.log('SUPABASE_ANON_KEY:', key ? key.slice(0, 20) + '...' : '❌ MISSING');

if (!url || !key) {
  console.error('\n❌ One or more env vars are missing. Check Netlify → Environment variables.\n');
  process.exit(1);
}

const html     = fs.readFileSync('index.html', 'utf8');
const target   = '<script src="config.js"></script>';
const found    = html.includes(target);

console.log('config.js tag found in index.html:', found);

if (!found) {
  console.error('❌ Could not find config.js script tag in index.html');
  process.exit(1);
}

const inline  = `<script>window.SENA_CONFIG={supabaseUrl:'${url}',supabaseKey:'${key}'};</script>`;
const newHtml = html.replace(target, inline);

fs.writeFileSync('index.html', newHtml);
console.log('✅ Config injected inline into index.html — no config.js exposed.');
