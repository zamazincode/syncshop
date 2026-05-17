/**
 * SyncShop — Background Service Worker
 *
 * Chrome extension'da 3 "dünya" vardır:
 * 1. Popup — extension ikonuna tıklayınca açılan küçük pencere
 * 2. Content Script — web sayfasının içine enjekte edilen kod
 * 3. Background (Service Worker) — ikisi arasında köprü, sürekli çalışan arka plan
 *
 * Bu dosya #3. Popup ile Content Script doğrudan konuşamaz,
 * mesajları background üzerinden iletirler (message relay).
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'product-detected') {
    // Content script ürün algıladığında, popup'ın okuyabileceği yere kaydet
    chrome.storage.local.set({ currentProduct: message.product });
  }
  return true; // async sendResponse için gerekli
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SyncShop] Extension installed');
});
