// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';

const CURRENCY_SYMBOLS = {
  AED: 'د.إ', GHS: '₵', NGN: '₦', USD: '$', GBP: '£', INR: '₹', CNY: '¥', CAD: 'C$',
  EUR: '€', JPY: '¥', ZAR: 'R', KES: 'KSh', AUD: 'A$', BRL: 'R$', MXN: 'Mex$', CHF: 'CHF',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', RON: 'lei', TRY: '₺',
  RUB: '₽', SAR: 'SAR', QAR: 'QAR', KWD: 'KWD', BHD: 'BHD', ILS: '₪', SGD: 'S$', HKD: 'HK$',
  MYR: 'RM', THB: '฿', IDR: 'Rp', PHP: '₱', VND: '₫', KRW: '₩', NZD: 'NZ$', EGP: 'E£',
  MAD: 'د.م.', TZS: 'TSh', UGX: 'USh', XOF: 'CFA', XAF: 'FCFA', ARS: 'AR$', CLP: 'CLP$',
  COP: 'COL$', PEN: 'S/', OMR: 'ر.ع.', BGN: 'лв', UAH: '₴',
};

const WEB_TRANSLATIONS = {
  en: {
    home: 'Home', feed: 'Feed', shop: 'Shop', foodhub: 'FoodHub', profile: 'Profile',
    create: 'Create', addToCart: 'Add to Cart', shopNow: 'Shop Now', bookNow: 'Book Now',
    cart: 'Cart', checkout: 'Checkout', search: 'Search', settings: 'Settings',
    logout: 'Log out', signOut: 'Sign out', signIn: 'Sign In', signUp: 'Sign Up',
    orders: 'Orders', wallet: 'Wallet', loading: 'Loading...', noProductsFound: 'No products found',
    editProfile: 'Edit profile', notifications: 'Notifications', language: 'Language',
    currency: 'Currency', privacy: 'Privacy & safety',
    languageHint: 'Your language changes instantly across the app — no reload needed.',
    currencyHint: 'All prices convert to your preferred currency. Sellers keep their original currency.',
    current: 'Current', signingOut: 'Signing out…',
    forYou: 'For You', live: 'LIVE', share: 'Share', retry: 'Retry',
    loadingFeed: 'Loading your feed...', feedError: 'Could not load the feed. Please try again.',
    noVideos: 'No videos yet. Follow creators or check back soon.', findPeople: 'Find people',
    soldOut: 'Sold out', searchProducts: 'Search products...', searchFood: 'Search food...',
    searchDrinks: 'Search drinks...', video: 'Video', addedToCart: 'added to cart!',
    fashion: 'Fashion', beauty: 'Beauty', tech: 'Tech', homeCategory: 'Home',
    food: 'Food', drinks: 'Drinks', all: 'All', nearMe: 'Near Me',
    setLocation: 'Set your location', change: 'Change', yourLocation: 'Your Location',
    useCurrentLocation: 'Use Current Location', detectingLocation: 'Detecting your location...',
    autoDetectCity: 'Automatically detect your city', typeCity: 'Type your city name...',
    noItemsFound: 'No items found', setLocationToSeeNearby: 'Set your location to see items near you',
    region: 'Region', by: 'by', availableToCashOut: 'Available to Cash Out',
    pendingEarnings: 'Pending Earnings', cashOut: 'Cash Out', payoutMethod: 'Payout method',
    ordersAndPurchases: 'Orders & Purchases',
    confirmDeliveries: 'Confirm deliveries with your PIN to release payments',
    recentTransactions: 'Recent Transactions', noTransactions: 'No transactions yet',
    searchCurrencies: 'Search currencies...', popular: 'Popular', africa: 'Africa',
    americas: 'Americas', europe: 'Europe', middleEast: 'Middle East', asia: 'Asia', oceania: 'Oceania',
    african: 'African', chinese: 'Chinese', pizza: 'Pizza', burgers: 'Burgers', healthy: 'Healthy',
    allDrinks: 'All Drinks', coffee: 'Coffee', juice: 'Juice', smoothie: 'Smoothie', tea: 'Tea',
    following: 'Following', followers: 'Followers', posts: 'Posts', shareProfile: 'Share profile',
    addBio: '+ Add bio', inbox: 'Inbox', support: 'Support', settingsPrivacy: 'Settings & Privacy',
    monetizationCenter: 'Monetization Center', sellerCenter: 'Seller Center',
    creatorProgram: 'Creator Program', deliveryCenter: 'Delivery Center',
    noPostsYet: 'No posts yet', noPostsSubtitle: 'Videos you create will show up here',
    noProductsYet: 'No products yet', noProductsSubtitle: 'Add products so buyers can shop from your profile',
    addProduct: 'Add product', manageShop: 'Manage shop',
    noPrivateVideos: 'No private videos', noPrivateSubtitle: 'Drafts and private videos only you can see will appear here',
    noLikedVideos: 'No liked videos yet', noLikedSubtitle: 'Videos you like will appear here',
    noSavedVideos: 'No saved videos yet', noSavedSubtitle: 'Videos you save will appear here',
    signInToCrestar: 'Sign in to Crestar', createAccount: 'Create account', admin: 'Admin',
  },
  fr: {
    home: 'Accueil', feed: 'Fil', shop: 'Boutique', foodhub: 'Cuisine', profile: 'Profil',
    create: 'Créer', addToCart: 'Ajouter au panier', shopNow: 'Acheter maintenant', bookNow: 'Réserver',
    cart: 'Panier', checkout: 'Paiement', search: 'Rechercher', settings: 'Paramètres',
    logout: 'Déconnexion', signOut: 'Se déconnecter', signIn: 'Se connecter', signUp: "S'inscrire",
    orders: 'Commandes', wallet: 'Portefeuille', loading: 'Chargement...', noProductsFound: 'Aucun produit trouvé',
    editProfile: 'Modifier le profil', notifications: 'Notifications', language: 'Langue',
    currency: 'Devise', privacy: 'Confidentialité et sécurité',
    languageHint: "Votre langue change instantanément dans l'application — aucun rechargement.",
    currencyHint: 'Tous les prix se convertissent dans votre devise. Les vendeurs gardent la leur.',
    current: 'Actuel', signingOut: 'Déconnexion…',
    forYou: 'Pour toi', live: 'DIRECT', share: 'Partager', retry: 'Réessayer',
    loadingFeed: 'Chargement du fil...', feedError: 'Impossible de charger le fil. Réessayez.',
    noVideos: 'Pas encore de vidéos. Suivez des créateurs.', findPeople: 'Trouver des personnes',
    soldOut: 'Épuisé', searchProducts: 'Rechercher des produits...', searchFood: 'Rechercher de la nourriture...',
    searchDrinks: 'Rechercher des boissons...', video: 'Vidéo', addedToCart: 'ajouté au panier !',
    fashion: 'Mode', beauty: 'Beauté', tech: 'Tech', homeCategory: 'Maison',
    food: 'Nourriture', drinks: 'Boissons', all: 'Tout', nearMe: 'Près de moi',
    setLocation: 'Définir votre position', change: 'Changer', yourLocation: 'Votre position',
    useCurrentLocation: 'Utiliser la position actuelle', detectingLocation: 'Détection de la position...',
    autoDetectCity: 'Détecter automatiquement votre ville', typeCity: 'Tapez le nom de votre ville...',
    noItemsFound: 'Aucun article trouvé', setLocationToSeeNearby: 'Définissez votre position pour voir les articles près de vous',
    region: 'Région', by: 'par', availableToCashOut: 'Disponible pour retrait',
    pendingEarnings: 'Gains en attente', cashOut: 'Retirer', payoutMethod: 'Mode de paiement',
    ordersAndPurchases: 'Commandes et achats',
    confirmDeliveries: 'Confirmez les livraisons avec votre PIN pour libérer les paiements',
    recentTransactions: 'Transactions récentes', noTransactions: 'Aucune transaction',
    searchCurrencies: 'Rechercher des devises...', popular: 'Populaire', africa: 'Afrique',
    americas: 'Amériques', europe: 'Europe', middleEast: 'Moyen-Orient', asia: 'Asie', oceania: 'Océanie',
    african: 'Africain', chinese: 'Chinois', pizza: 'Pizza', burgers: 'Burgers', healthy: 'Sain',
    allDrinks: 'Toutes les boissons', coffee: 'Café', juice: 'Jus', smoothie: 'Smoothie', tea: 'Thé',
    following: 'Abonnements', followers: 'Abonnés', posts: 'Publications', shareProfile: 'Partager le profil',
    addBio: '+ Ajouter une bio', inbox: 'Boîte de réception', support: 'Assistance', settingsPrivacy: 'Paramètres et confidentialité',
    monetizationCenter: 'Centre de monétisation', sellerCenter: 'Espace vendeur',
    creatorProgram: 'Programme créateur', deliveryCenter: 'Centre de livraison',
    noPostsYet: 'Pas encore de publications', noPostsSubtitle: 'Les vidéos que vous créez apparaîtront ici',
    noProductsYet: 'Pas encore de produits', noProductsSubtitle: 'Ajoutez des produits pour que les acheteurs puissent acheter',
    addProduct: 'Ajouter un produit', manageShop: 'Gérer la boutique',
    noPrivateVideos: 'Pas de vidéos privées', noPrivateSubtitle: 'Brouillons et vidéos privées ici',
    noLikedVideos: 'Pas encore de vidéos aimées', noLikedSubtitle: 'Les vidéos que vous aimez apparaîtront ici',
    noSavedVideos: 'Pas encore de vidéos enregistrées', noSavedSubtitle: 'Les vidéos enregistrées apparaîtront ici',
    signInToCrestar: 'Connectez-vous à Crestar', createAccount: 'Créer un compte', admin: 'Admin',
  },
  es: {
    home: 'Inicio', feed: 'Feed', shop: 'Tienda', foodhub: 'Comida', profile: 'Perfil',
    create: 'Crear', addToCart: 'Agregar al carrito', shopNow: 'Comprar ahora', bookNow: 'Reservar',
    cart: 'Carrito', checkout: 'Pagar', search: 'Buscar', settings: 'Ajustes',
    logout: 'Cerrar sesión', signOut: 'Cerrar sesión', signIn: 'Iniciar sesión', signUp: 'Registrarse',
    orders: 'Pedidos', wallet: 'Billetera', loading: 'Cargando...', noProductsFound: 'No se encontraron productos',
    editProfile: 'Editar perfil', notifications: 'Notificaciones', language: 'Idioma',
    currency: 'Moneda', privacy: 'Privacidad y seguridad',
    languageHint: 'Tu idioma cambia al instante en la app — sin recargar.',
    currencyHint: 'Todos los precios se convierten a tu moneda. Los vendedores mantienen la suya.',
    current: 'Actual', signingOut: 'Cerrando sesión…',
    forYou: 'Para ti', live: 'EN VIVO', share: 'Compartir', retry: 'Reintentar',
    loadingFeed: 'Cargando tu feed...', feedError: 'No se pudo cargar el feed. Inténtalo de nuevo.',
    noVideos: 'Aún no hay videos. Sigue a creadores.', findPeople: 'Buscar personas',
    soldOut: 'Agotado', searchProducts: 'Buscar productos...', searchFood: 'Buscar comida...',
    searchDrinks: 'Buscar bebidas...', video: 'Video', addedToCart: 'añadido al carrito!',
    fashion: 'Moda', beauty: 'Belleza', tech: 'Tech', homeCategory: 'Hogar',
    food: 'Comida', drinks: 'Bebidas', all: 'Todo', nearMe: 'Cerca de mí',
    setLocation: 'Establece tu ubicación', change: 'Cambiar', yourLocation: 'Tu ubicación',
    useCurrentLocation: 'Usar ubicación actual', detectingLocation: 'Detectando ubicación...',
    autoDetectCity: 'Detectar tu ciudad automáticamente', typeCity: 'Escribe el nombre de tu ciudad...',
    noItemsFound: 'No se encontraron artículos', setLocationToSeeNearby: 'Establece tu ubicación para ver artículos cerca',
    region: 'Región', by: 'por', availableToCashOut: 'Disponible para retirar',
    pendingEarnings: 'Ganancias pendientes', cashOut: 'Retirar', payoutMethod: 'Método de pago',
    ordersAndPurchases: 'Pedidos y compras',
    confirmDeliveries: 'Confirma entregas con tu PIN para liberar pagos',
    recentTransactions: 'Transacciones recientes', noTransactions: 'Sin transacciones',
    searchCurrencies: 'Buscar monedas...', popular: 'Popular', africa: 'África',
    americas: 'Américas', europe: 'Europa', middleEast: 'Medio Oriente', asia: 'Asia', oceania: 'Oceanía',
    african: 'Africano', chinese: 'Chino', pizza: 'Pizza', burgers: 'Hamburguesas', healthy: 'Saludable',
    allDrinks: 'Todas las bebidas', coffee: 'Café', juice: 'Jugo', smoothie: 'Batido', tea: 'Té',
    following: 'Siguiendo', followers: 'Seguidores', posts: 'Publicaciones', shareProfile: 'Compartir perfil',
    addBio: '+ Añadir bio', inbox: 'Bandeja', support: 'Soporte', settingsPrivacy: 'Ajustes y privacidad',
    monetizationCenter: 'Centro de monetización', sellerCenter: 'Centro de vendedor',
    creatorProgram: 'Programa de creadores', deliveryCenter: 'Centro de entrega',
    noPostsYet: 'Aún no hay publicaciones', noPostsSubtitle: 'Los videos que crees aparecerán aquí',
    noProductsYet: 'Aún no hay productos', noProductsSubtitle: 'Añade productos para que compren en tu perfil',
    addProduct: 'Añadir producto', manageShop: 'Gestionar tienda',
    noPrivateVideos: 'No hay videos privados', noPrivateSubtitle: 'Borradores y videos privados aquí',
    noLikedVideos: 'Aún no hay videos con me gusta', noLikedSubtitle: 'Los videos que te gusten aparecerán aquí',
    noSavedVideos: 'Aún no hay videos guardados', noSavedSubtitle: 'Los videos que guardes aparecerán aquí',
    signInToCrestar: 'Inicia sesión en Crestar', createAccount: 'Crear cuenta', admin: 'Admin',
  },
  ar: {
    home: 'الرئيسية', feed: 'الخلاصة', shop: 'تسوق', foodhub: 'طعام', profile: 'الملف',
    create: 'إنشاء', addToCart: 'أضف إلى السلة', shopNow: 'تسوق الآن', bookNow: 'احجز الآن',
    cart: 'السلة', checkout: 'الدفع', search: 'بحث', settings: 'الإعدادات',
    logout: 'تسجيل الخروج', signOut: 'تسجيل الخروج', signIn: 'تسجيل الدخول', signUp: 'التسجيل',
    orders: 'الطلبات', wallet: 'المحفظة', loading: 'جاري التحميل...', noProductsFound: 'لم يتم العثور على منتجات',
    editProfile: 'تعديل الملف', notifications: 'الإشعارات', language: 'اللغة',
    currency: 'العملة', privacy: 'الخصوصية والأمان',
    languageHint: 'تتغير اللغة فوراً في التطبيق — دون إعادة تحميل.',
    currencyHint: 'تُحوَّل كل الأسعار إلى عملتك المفضلة. يحتفظ البائعون بعملتهم.',
    current: 'الحالي', signingOut: 'جاري تسجيل الخروج…',
    forYou: 'لك', live: 'مباشر', share: 'مشاركة', retry: 'إعادة المحاولة',
    loadingFeed: 'جاري تحميل الخلاصة...', feedError: 'تعذر تحميل الخلاصة. حاول مرة أخرى.',
    noVideos: 'لا توجد فيديوهات بعد. تابع المبدعين.', findPeople: 'ابحث عن أشخاص',
    soldOut: 'نفد', searchProducts: 'ابحث عن منتجات...', searchFood: 'ابحث عن طعام...',
    searchDrinks: 'ابحث عن مشروبات...', video: 'فيديو', addedToCart: 'أُضيف إلى السلة!',
    fashion: 'أزياء', beauty: 'جمال', tech: 'تقنية', homeCategory: 'منزل',
    food: 'طعام', drinks: 'مشروبات', all: 'الكل', nearMe: 'بالقرب مني',
    setLocation: 'حدد موقعك', change: 'تغيير', yourLocation: 'موقعك',
    useCurrentLocation: 'استخدم الموقع الحالي', detectingLocation: 'جاري تحديد الموقع...',
    autoDetectCity: 'اكتشف مدينتك تلقائياً', typeCity: 'اكتب اسم مدينتك...',
    noItemsFound: 'لم يتم العثور على عناصر', setLocationToSeeNearby: 'حدد موقعك لرؤية العناصر القريبة',
    region: 'المنطقة', by: 'بواسطة', availableToCashOut: 'متاح للسحب',
    pendingEarnings: 'أرباح معلقة', cashOut: 'سحب', payoutMethod: 'طريقة الدفع',
    ordersAndPurchases: 'الطلبات والمشتريات',
    confirmDeliveries: 'أكد التسليم برمز PIN لتحرير المدفوعات',
    recentTransactions: 'المعاملات الأخيرة', noTransactions: 'لا توجد معاملات',
    searchCurrencies: 'ابحث عن عملات...', popular: 'شائع', africa: 'أفريقيا',
    americas: 'الأمريكتان', europe: 'أوروبا', middleEast: 'الشرق الأوسط', asia: 'آسيا', oceania: 'أوقيانوسيا',
    african: 'أفريقي', chinese: 'صيني', pizza: 'بيتزا', burgers: 'برغر', healthy: 'صحي',
    allDrinks: 'كل المشروبات', coffee: 'قهوة', juice: 'عصير', smoothie: 'سموثي', tea: 'شاي',
    following: 'يتابع', followers: 'المتابعون', posts: 'المنشورات', shareProfile: 'مشاركة الملف',
    addBio: '+ أضف نبذة', inbox: 'الوارد', support: 'الدعم', settingsPrivacy: 'الإعدادات والخصوصية',
    monetizationCenter: 'مركز الربح', sellerCenter: 'مركز البائع',
    creatorProgram: 'برنامج المبدعين', deliveryCenter: 'مركز التوصيل',
    noPostsYet: 'لا منشورات بعد', noPostsSubtitle: 'ستظهر هنا الفيديوهات التي تنشئها',
    noProductsYet: 'لا منتجات بعد', noProductsSubtitle: 'أضف منتجات ليتمكن المشترون من الشراء',
    addProduct: 'أضف منتجاً', manageShop: 'إدارة المتجر',
    noPrivateVideos: 'لا فيديوهات خاصة', noPrivateSubtitle: 'المسودات والفيديوهات الخاصة هنا',
    noLikedVideos: 'لا فيديوهات معجبة بعد', noLikedSubtitle: 'ستظهر هنا الفيديوهات التي تعجبك',
    noSavedVideos: 'لا فيديوهات محفوظة بعد', noSavedSubtitle: 'ستظهر هنا الفيديوهات التي تحفظها',
    signInToCrestar: 'سجّل الدخول إلى Crestar', createAccount: 'إنشاء حساب', admin: 'المشرف',
  },
};

function formatDateString(date) {
  const ts = typeof date === 'number' ? date : Date.parse(date);
  if (Number.isNaN(ts)) return '';
  return new Intl.DateTimeFormat('en-GB').format(ts);
}

function applyDocumentLanguage(lang) {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.lang = lang || 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  } catch (_e) {}
}

export function useLocalization() {
  const [currency, setCurrencyState] = useState('GHS');
  const [currencySymbol, setCurrencySymbol] = useState('₵');
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const syncFromStorage = () => {
        try {
          const savedCurrency = localStorage.getItem('currency');
          if (savedCurrency) {
            setCurrencyState(savedCurrency);
            setCurrencySymbol(CURRENCY_SYMBOLS[savedCurrency] || savedCurrency);
          }
          const savedLang = localStorage.getItem('language') || 'en';
          setLanguageState(savedLang);
          applyDocumentLanguage(savedLang);
        } catch (e) {}
      };
      syncFromStorage();
      window.addEventListener('currency-changed', syncFromStorage);
      window.addEventListener('language-changed', syncFromStorage);
      window.addEventListener('storage', syncFromStorage);
      return () => {
        window.removeEventListener('currency-changed', syncFromStorage);
        window.removeEventListener('language-changed', syncFromStorage);
        window.removeEventListener('storage', syncFromStorage);
      };
    }
  }, []);

  const setLanguage = (lang) => {
    try { localStorage.setItem('language', lang); } catch (e) {}
    setLanguageState(lang);
    applyDocumentLanguage(lang);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('language-changed'));
  };

  const setCurrency = (code) => {
    try { localStorage.setItem('currency', code); } catch (e) {}
    setCurrencyState(code);
    setCurrencySymbol(CURRENCY_SYMBOLS[code] || code);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('currency-changed'));
  };

  const formatCurrency = (amount, overrideCurrency) => {
    const code = overrideCurrency || currency;
    const symbol = CURRENCY_SYMBOLS[code] || code;
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'RWF', 'XOF', 'XAF', 'IDR'];
    const formatted = noDecimalCurrencies.includes(code)
      ? Math.round(num).toLocaleString()
      : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  return { formatCurrency, formatDate, t, currency, currencySymbol, language, setLanguage, setCurrency };
}

export default useLocalization;
