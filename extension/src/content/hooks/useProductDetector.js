import { useState, useEffect, useRef } from 'react';
import { extractProduct } from '../../utils/extractors.js';

export function useProductDetector({ connected, sendBrowsingUpdate }) {
  const [detectedProduct, setDetectedProduct] = useState(null);
  const lastUrlRef = useRef('');
  const lastSentUrlRef = useRef('');

  useEffect(() => {
    if (!connected) {
      setDetectedProduct(null);
      return;
    }

    const interval = setInterval(() => {
      const product = extractProduct();
      
      const currentUrl = product ? product.productUrl : null;
      const currentTitle = product ? product.name : null;

      if (lastSentUrlRef.current !== currentUrl) {
        sendBrowsingUpdate(currentTitle, currentUrl);
        lastSentUrlRef.current = currentUrl;
      }

      if (!product || product.price < 10) {
        if (lastUrlRef.current !== location.href) {
          setDetectedProduct(null);
          lastUrlRef.current = location.href;
        }
        return;
      }

      setDetectedProduct((prev) => {
        if (!prev) {
          lastUrlRef.current = product.productUrl;
          return product;
        }
        if (product.productUrl !== lastUrlRef.current) {
          lastUrlRef.current = product.productUrl;
          return product;
        }
        if (!prev.description && product.description) {
          return { ...prev, description: product.description };
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [connected]);

  return { detectedProduct };
}
