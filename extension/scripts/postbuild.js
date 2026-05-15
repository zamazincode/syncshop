/**
 * SyncShop Extension — Post-Build Script
 *
 * Vite build sonrası manifest.json ve icons/ klasörünü dist/ içine kopyalar.
 * Chrome extension'ı dist/ klasöründen yüklenir.
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// process.cwd() = package.json'ın bulunduğu klasör (extension/)
const root = process.cwd();
const dist = resolve(root, 'dist');

if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

// manifest.json kopyala
cpSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));

// icons/ kopyala
cpSync(resolve(root, 'public/icons'), resolve(dist, 'icons'), { recursive: true });

console.log('✅ manifest.json + icons/ → dist/ kopyalandı');
