// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';

const CURRENCY_SYMBOLS = {
  AED: 'د.إ',
  GHS: '₵',
  NGN: '₦',
  USD: '$',
  GBP: '£',
  INR: '₹',
  CNY: '¥',
  CAD: 'C$',
  EUR: '€',
  JPY: '¥',
  ZAR: 'R',
  KES: 'KSh',
  AUD: 'A$',
  BRL: 'R$',
  MXN: 'Mex$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  TRY: '₺',
  RUB: '₽',
  SAR: 'SAR',
  QAR: 'QAR',
  KWD: 'KWD',
  BHD: 'BHD',
  ILS: '₪',
  SGD: 'S$',
  HKD: 'HK$',
  MYR: 'RM',
  THB: '฿',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  KRW: '₩',
  NZD: 'NZ$',
  EGP: 'E£',
  MAD: 'د.م.',
  TZS: 'TSh',
  UGX: 'USh',
  XOF: 'CFA',
  XAF: 'FCFA',
  ARS: 'AR$',
  CLP: 'CLP$',
  COP: 'COL$',
  PEN: 'S/',
  OMR: 'ر.ع.',
  BGN: 'лв',
  UAH: '₴',
};

const WEB_TRANSLATIONS = {
  en: {
    home: 'Home',
    feed: 'Feed',
    shop: 'Shop',
    foodhub: 'FoodHub',
    profile: 'Profile',
    addToCart: 'Add to Cart',
    shopNow: 'Shop Now',
    bookNow: 'Book Now',
    cart: 'Cart',
    checkout: 'Checkout',
    search: 'Search',
    settings: 'Settings',
    logout: 'Log out',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    orders: 'Orders',
    wallet: 'Wallet',
    loading: 'Loading...',
    noProductsFound: 'No products found',
  },
  fr: {
    home: 'Accueil',
    feed: 'Fil',
    shop: 'Boutique',
    foodhub: 'Cuisine',
    profile: 'Profil',
    addToCart: 'Ajouter au panier',
    shopNow: 'Acheter maintenant',
    bookNow: 'Réserver',
    cart: 'Panier',
    checkout: 'Paiement',
    search: 'Rechercher',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    signIn: 'Se connecter',
    signUp: "S'inscrire",
    orders: 'Commandes',
    wallet: 'Portefeuille',
    loading: 'Chargement...',
    noProductsFound: 'Aucun produit trouvé',
  },
  es: {
    home: 'Inicio',
    feed: 'Feed',
    shop: 'Tienda',
    foodhub: 'Comida',
    profile: 'Perfil',
    addToCart: 'Agregar al carrito',
    shopNow: 'Comprar ahora',
    bookNow: 'Reservar',
    cart: 'Carrito',
    checkout: 'Pagar',
    search: 'Buscar',
    settings: 'Ajustes',
    logout: 'Cerrar sesión',
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    orders: 'Pedidos',
    wallet: 'Billetera',
    loading: 'Cargando...',
    noProductsFound: 'No se encontraron productos',
  },
  ar: {
    home: 'الرئيسية',
    feed: 'الخلاصة',
    shop: 'تسوق',
    foodhub: 'طعام',
    profile: 'الملف',
    addToCart: 'أضف إلى السلة',
    shopNow: 'تسوق الآن',
    bookNow: 'احجز الآن',
    cart: 'السلة',
    checkout: 'الدفع',
    search: 'بحث',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    signIn: 'تسجيل الدخول',
    signUp: 'التسجيل',
    orders: 'الطلبات',
    wallet: 'المحفظة',
    loading: 'جاري التحميل...',
    noProductsFound: 'لم يتم العثور على منتجات',
  },
};

// Module-scope date formatter — avoids hydration-unsafe Date construction in render
function formatDateString(date) {
  const ts = typeof date === 'number' ? date : Date.parse(date);
  if (Number.isNaN(ts)) return '';
  // en-GB locale renders as dd/mm/yyyy, matching the previous format
  return new Intl.DateTimeFormat('en-GB').format(ts);
}

export function useLocalization() {
  const [currency, setCurrencyState] = useState('GHS');
  const [currencySymbol, setCurrencySymbol] = useState('₵');
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    // Load from localStorage on client side
    if (typeof window !== 'undefined') {
      const syncFromStorage = () => {
        try {
          // Use same key as CurrencyPrice component for consistency
          const savedCurrency = localStorage.getItem('currency');
          if (savedCurrency) {
            setCurrencyState(savedCurrency);
            setCurrencySymbol(CURRENCY_SYMBOLS[savedCurrency] || savedCurrency);
          }

          const savedLang = localStorage.getItem('language');
          if (savedLang) setLanguageState(savedLang);
        } catch (e) {
          // use defaults
        }
      };

      syncFromStorage();

      // React instantly to same-tab changes (dispatched by settings pages)
      window.addEventListener('currency-changed', syncFromStorage);
      window.addEventListener('language-changed', syncFromStorage);
      // React to changes from other tabs
      window.addEventListener('storage', syncFromStorage);

      return () => {
        window.removeEventListener('currency-changed', syncFromStorage);
        window.removeEventListener('language-changed', syncFromStorage);
        window.removeEventListener('storage', syncFromStorage);
      };
    }
  }, []);

  // Setters that persist + broadcast so every mounted component updates instantly
  const setLanguage = (lang) => {
    try {
      localStorage.setItem('language', lang);
    } catch (e) {
      // storage unavailable — still update in-memory state
    }
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('language-changed'));
    }
  };

  const setCurrency = (code) => {
    try {
      localStorage.setItem('currency', code);
    } catch (e) {
      // storage unavailable — still update in-memory state
    }
    setCurrencyState(code);
    setCurrencySymbol(CURRENCY_SYMBOLS[code] || code);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('currency-changed'));
    }
  };

  const formatCurrency = (amount, overrideCurrency) => {
    const code = overrideCurrency || currency;
    const symbol = CURRENCY_SYMBOLS[code] || code;
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'RWF', 'XOF', 'XAF', 'IDR'];
    const formatted = noDecimalCurrencies.includes(code)
      ? Math.round(num).toLocaleString()
      : num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    return `${symbol}${formatted}`;
  };

  const formatDate = (date) => formatDateString(date);

  const t = (key, params) => {
    let text = WEB_TRANSLATIONS[language]?.[key] || WEB_TRANSLATIONS.en[key] || key;
    if (params && typeof text === 'string') {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return text;
  };

  return {
    formatCurrency,
    formatDate,
    t,
    currency,
    currencySymbol,
    language,
    setLanguage,
    setCurrency,
  };
}

export default useLocalization;
