/**
 * SyncShop Extension — Build Orchestrator
 *
 * 3 adımlı build pipeline:
 * 1. Popup build (normal HTML web app)
 * 2. Content script build (IIFE, tek dosya)
 * 3. Statik dosyaları kopyala (manifest, icons, service-worker)
 *
 * Neden orchestrator? Chrome extension'da her "dünya" farklı format ister.
 * Popup = ES module OK, Content Script = IIFE zorunlu, Background = plain JS.
 * Tek bir Vite config ile bunu yapmak mümkün değil.
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const dist = resolve(root, 'dist');

console.log('🔨 SyncShop Extension Build\n');

// Step 1: Popup build (emptyOutDir: true, temiz başlangıç)
console.log('📦 [1/3] Popup build...');
execSync('npx vite build', { stdio: 'inherit', cwd: root });

// Step 2: Content script build (emptyOutDir: false, popup'ı silme)
console.log('\n📦 [2/3] Content script build (IIFE)...');
execSync('npx vite build', {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, BUILD_TARGET: 'content' },
});

// Step 3: Statik dosyaları kopyala
console.log('\n📦 [3/3] Statik dosyalar kopyalanıyor...');

// manifest.json
cpSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));

// icons/
if (existsSync(resolve(root, 'public/icons'))) {
  cpSync(resolve(root, 'public/icons'), resolve(dist, 'icons'), { recursive: true });
}

// Background service worker (basit dosya, build gerekmez)
cpSync(
  resolve(root, 'src/background/service-worker.js'),
  resolve(dist, 'service-worker.js')
);

console.log('\n✅ Build tamamlandı! → dist/');
console.log('   Chrome → chrome://extensions → Load unpacked → dist/ seç');
