/**
 * SyncShop — Environment Configuration
 *
 * Extension'ın hangi server'a bağlanacağını belirler.
 * 'dev' modunda localhost, 'prod' modunda deploy edilmiş URL kullanılır.
 */

const MODE = 'prod'; // 'dev' | 'prod'

const config = {
  dev: {
    API_URL: 'http://127.0.0.1:3001',
    WS_URL: 'http://127.0.0.1:3001',
  },
  prod: {
    API_URL: 'https://syncshop-xpm7.onrender.com',
    WS_URL: 'https://syncshop-xpm7.onrender.com',
  },
};

export const API_URL = config[MODE].API_URL;
export const WS_URL = config[MODE].WS_URL;