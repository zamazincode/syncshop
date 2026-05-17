import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// CSS'i string olarak import et (Vite ?inline sorgusu)
// Bu sayede CSS ayrı dosya olarak üretilmez, JS içine gömülür.
// Shadow DOM'a style tag olarak enjekte edeceğiz.
import sidebarStyles from './styles/sidebar.css?inline';

/**
 * Content Script Entry Point
 *
 * Chrome extension'ın web sayfasına (Trendyol/HB) enjekte ettiği ilk dosya.
 *
 * Shadow DOM Neden Gerekli?
 * - Trendyol'un CSS'i bizim component'lerimizi bozabilir (veya tam tersi)
 * - Shadow DOM, kendi CSS scope'unu oluşturur
 * - İçerideki stiller dışarıyı, dışarıdaki stiller içeriyi etkilemez
 *
 * CSS Yükleme Stratejisi:
 * Normal bir web app'te CSS <link> ile yüklenir. Ama Shadow DOM
 * dışarıdaki <link>'leri görmez. Bu yüzden CSS'i ?inline ile
 * JS string'e çevirip <style> tag olarak Shadow DOM'a enjekte ediyoruz.
 */

// Google Fonts'u ana sayfaya ekle (Shadow DOM dışında)
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Host element oluştur
const host = document.createElement('div');
host.id = 'syncshop-host';
document.body.appendChild(host);

// Shadow DOM aç
const shadow = host.attachShadow({ mode: 'open' });

// CSS'i Shadow DOM'a enjekte et
const styleEl = document.createElement('style');
styleEl.textContent = sidebarStyles;
shadow.appendChild(styleEl);

// React mount container
const root = document.createElement('div');
root.id = 'syncshop-root';
shadow.appendChild(root);

// React mount
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
