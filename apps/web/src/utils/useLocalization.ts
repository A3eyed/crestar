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
    signInToViewWallet: 'Sign in to view your wallet',
    loadingWallet: 'Loading wallet...',
    setUpPayoutMethod: 'Set up payout method',
    addMobileMoneyOrBank: 'Add mobile money or a bank account to cash out',
    lockedForSecurity: 'Locked for your security — contact support to change it',
    locked: 'Locked',
    myPurchases: 'My purchases',
    mySales: 'My sales',
    noOrdersHere: 'No orders here',
    browseShop: 'Browse shop',
    details: 'Details',
    confirmPin: 'Confirm PIN',
    iVerifiedReceived: 'I verified and received my order',
    deliveryConfirmed: 'Delivery confirmed — payment released to the seller!',
    cancelOrder: 'Cancel order',
    cancelling: 'Cancelling…',
    startEarning: 'Start Earning',
    chooseHowToEarn: 'Choose how you want to earn on Crestar',
    flatFeeBanner: 'A single 5% platform fee applies to all programs. No additional or hidden charges.',
    flatFeeKeep95: '5% platform fee · you keep 95%',
    becomeSeller: 'Become a Seller',
    sellPhysical: 'Sell physical goods & products',
    sellFoodDrinks: 'Sell Food & Drinks',
    startFoodBusiness: 'Start your food business',
    becomeCreator: 'Become a Creator',
    earnPromoting: 'Earn by promoting products in videos',
    becomeDeliverer: 'Become a Deliverer',
    deliverOrdersEarn: 'Deliver orders and earn',
    approvedActive: 'Approved & Active',
    pendingReview: 'Pending Review',
    applicationUnderReview: 'Your application is being reviewed. You will be able to start earning as soon as it is approved.',
    youreIn: 'You are in!',
    goToProfile: 'Go to Profile',
    completeOnboarding: 'Complete Onboarding',
    submitting: 'Submitting...',
    termsOfService: 'Terms of Service',
    processing: 'Processing...',
    confirmCashOut: 'Confirm Cash Out',
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
    signInToViewWallet: 'Connectez-vous pour voir votre portefeuille',
    loadingWallet: 'Chargement du portefeuille...',
    setUpPayoutMethod: 'Configurer le mode de paiement',
    addMobileMoneyOrBank: 'Ajoutez mobile money ou un compte bancaire pour retirer',
    lockedForSecurity: 'Verrouillé pour votre sécurité — contactez le support pour le changer',
    locked: 'Verrouillé',
    myPurchases: 'Mes achats',
    mySales: 'Mes ventes',
    noOrdersHere: 'Aucune commande ici',
    browseShop: 'Parcourir la boutique',
    details: 'Détails',
    confirmPin: 'Confirmer le PIN',
    iVerifiedReceived: "J'ai vérifié et reçu ma commande",
    deliveryConfirmed: 'Livraison confirmée — paiement libéré au vendeur !',
    cancelOrder: 'Annuler la commande',
    cancelling: 'Annulation…',
    startEarning: 'Commencer à gagner',
    chooseHowToEarn: 'Choisissez comment gagner sur Crestar',
    flatFeeBanner: 'Frais de plateforme unique de 5 % sur tous les programmes. Aucun frais supplémentaire.',
    flatFeeKeep95: 'Frais de plateforme 5 % · vous gardez 95 %',
    becomeSeller: 'Devenir vendeur',
    sellPhysical: 'Vendre des biens et produits physiques',
    sellFoodDrinks: 'Vendre nourriture et boissons',
    startFoodBusiness: 'Lancez votre activité alimentaire',
    becomeCreator: 'Devenir créateur',
    earnPromoting: 'Gagnez en promouvant des produits dans vos vidéos',
    becomeDeliverer: 'Devenir livreur',
    deliverOrdersEarn: 'Livrez des commandes et gagnez',
    approvedActive: 'Approuvé et actif',
    pendingReview: "En attente d'examen",
    applicationUnderReview: "Votre candidature est en cours d'examen. Vous pourrez commencer à gagner dès qu'elle sera approuvée.",
    youreIn: 'Vous y êtes !',
    goToProfile: 'Aller au profil',
    completeOnboarding: "Terminer l'inscription",
    submitting: 'Envoi...',
    termsOfService: "Conditions d'utilisation",
    processing: 'Traitement...',
    confirmCashOut: 'Confirmer le retrait',
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
    signInToViewWallet: 'Inicia sesión para ver tu billetera',
    loadingWallet: 'Cargando billetera...',
    setUpPayoutMethod: 'Configurar método de pago',
    addMobileMoneyOrBank: 'Añade dinero móvil o una cuenta bancaria para retirar',
    lockedForSecurity: 'Bloqueado por seguridad — contacta soporte para cambiarlo',
    locked: 'Bloqueado',
    myPurchases: 'Mis compras',
    mySales: 'Mis ventas',
    noOrdersHere: 'No hay pedidos aquí',
    browseShop: 'Explorar tienda',
    details: 'Detalles',
    confirmPin: 'Confirmar PIN',
    iVerifiedReceived: 'Verifiqué y recibí mi pedido',
    deliveryConfirmed: 'Entrega confirmada — pago liberado al vendedor!',
    cancelOrder: 'Cancelar pedido',
    cancelling: 'Cancelando…',
    startEarning: 'Empieza a ganar',
    chooseHowToEarn: 'Elige cómo quieres ganar en Crestar',
    flatFeeBanner: 'Una tarifa de plataforma del 5% en todos los programas. Sin cargos adicionales ni ocultos.',
    flatFeeKeep95: 'Tarifa de plataforma 5% · te quedas con el 95%',
    becomeSeller: 'Conviértete en vendedor',
    sellPhysical: 'Vende bienes y productos físicos',
    sellFoodDrinks: 'Vende comida y bebidas',
    startFoodBusiness: 'Inicia tu negocio de comida',
    becomeCreator: 'Conviértete en creador',
    earnPromoting: 'Gana promocionando productos en videos',
    becomeDeliverer: 'Conviértete en repartidor',
    deliverOrdersEarn: 'Entrega pedidos y gana',
    approvedActive: 'Aprobado y activo',
    pendingReview: 'Pendiente de revisión',
    applicationUnderReview: 'Tu solicitud está siendo revisada. Podrás empezar a ganar en cuanto sea aprobada.',
    youreIn: 'Estás dentro!',
    goToProfile: 'Ir al perfil',
    completeOnboarding: 'Completar registro',
    submitting: 'Enviando...',
    termsOfService: 'Términos de servicio',
    processing: 'Procesando...',
    confirmCashOut: 'Confirmar retiro',
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
    soldOut: 'نفدت الكمية', searchProducts: 'ابحث عن منتجات...', searchFood: 'ابحث عن طعام...',
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
    recentTransactions: 'المعاملات الأخيرة', noTransactions: 'لا توجد معاملات بعد',
    searchCurrencies: 'ابحث عن عملات...', popular: 'شائع', africa: 'أفريقيا',
    americas: 'الأمريكتان', europe: 'أوروبا', middleEast: 'الشرق الأوسط', asia: 'آسيا', oceania: 'أوقيانوسيا',
    african: 'أفريقي', chinese: 'صيني', pizza: 'بيتزا', burgers: 'برغر', healthy: 'صحي',
    allDrinks: 'كل المشروبات', coffee: 'قهوة', juice: 'عصير', smoothie: 'سموثي', tea: 'شاي',
    following: 'يتابع', followers: 'المتابعون', posts: 'المنشورات', shareProfile: 'مشاركة الملف',
    addBio: '+ أضف نبذة', inbox: 'الوارد', support: 'الدعم', settingsPrivacy: 'الإعدادات والخصوصية',
    monetizationCenter: 'مركز تحقيق الدخل', sellerCenter: 'مركز البائع',
    creatorProgram: 'برنامج المبدعين', deliveryCenter: 'مركز التوصيل',
    noPostsYet: 'لا منشورات بعد', noPostsSubtitle: 'ستظهر الفيديوهات التي تنشئها هنا',
    noProductsYet: 'لا منتجات بعد', noProductsSubtitle: 'أضف منتجات ليتمكن المشترون من الشراء من ملفك',
    addProduct: 'إضافة منتج', manageShop: 'إدارة المتجر',
    noPrivateVideos: 'لا فيديوهات خاصة', noPrivateSubtitle: 'المسودات والفيديوهات الخاصة هنا',
    noLikedVideos: 'لا فيديوهات معجبة بعد', noLikedSubtitle: 'ستظهر الفيديوهات التي تعجبك هنا',
    noSavedVideos: 'لا فيديوهات محفوظة بعد', noSavedSubtitle: 'ستظهر الفيديوهات التي تحفظها هنا',
    signInToCrestar: 'سجّل الدخول إلى Crestar', createAccount: 'إنشاء حساب', admin: 'المشرف',
    signInToViewWallet: 'سجّل الدخول لعرض محفظتك',
    loadingWallet: 'جاري تحميل المحفظة...',
    setUpPayoutMethod: 'إعداد طريقة الدفع',
    addMobileMoneyOrBank: 'أضف محفظة إلكترونية أو حساباً بنكياً للسحب',
    lockedForSecurity: 'مقفل لأمانك — تواصل مع الدعم لتغييره',
    locked: 'مقفل',
    myPurchases: 'مشترياتي',
    mySales: 'مبيعاتي',
    noOrdersHere: 'لا طلبات هنا',
    browseShop: 'تصفح المتجر',
    details: 'التفاصيل',
    confirmPin: 'تأكيد الرمز',
    iVerifiedReceived: 'تحققت واستلمت طلبي',
    deliveryConfirmed: 'تم تأكيد التسليم — حُرّر الدفع للبائع!',
    cancelOrder: 'إلغاء الطلب',
    cancelling: 'جاري الإلغاء…',
    startEarning: 'ابدأ الربح',
    chooseHowToEarn: 'اختر كيف تريد الربح على Crestar',
    flatFeeBanner: 'رسوم منصة موحدة بنسبة 5% على جميع البرامج. لا رسوم إضافية أو مخفية.',
    flatFeeKeep95: 'رسوم المنصة 5% · تحتفظ بـ95%',
    becomeSeller: 'كن بائعاً',
    sellPhysical: 'بع سلعاً ومنتجات مادية',
    sellFoodDrinks: 'بع الطعام والمشروبات',
    startFoodBusiness: 'ابدأ مشروعك الغذائي',
    becomeCreator: 'كن مبدعاً',
    earnPromoting: 'اربح من الترويج للمنتجات في الفيديوهات',
    becomeDeliverer: 'كن موصلّاً',
    deliverOrdersEarn: 'وصل الطلبات واربح',
    approvedActive: 'موافق عليه ونشط',
    pendingReview: 'قيد المراجعة',
    applicationUnderReview: 'طلبك قيد المراجعة. ستتمكن من البدء بالربح فور الموافقة.',
    youreIn: 'أنت داخل!',
    goToProfile: 'الذهاب إلى الملف',
    completeOnboarding: 'إكمال التسجيل',
    submitting: 'جاري الإرسال...',
    termsOfService: 'شروط الخدمة',
    processing: 'جاري المعالجة...',
    confirmCashOut: 'تأكيد السحب',
  },
};

function formatDateString(date) {
  if (!date) return '';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(date);
  }
}

export function useLocalization() {
  const [language, setLanguageState] = useState('en');
  const [currency, setCurrencyState] = useState('GHS');

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('crestar_language');
      const savedCur = localStorage.getItem('crestar_currency');
      if (savedLang && WEB_TRANSLATIONS[savedLang]) setLanguageState(savedLang);
      if (savedCur) setCurrencyState(savedCur);
    } catch {}
  }, []);

  const setLanguage = (lang) => {
    if (!WEB_TRANSLATIONS[lang]) return;
    setLanguageState(lang);
    try {
      localStorage.setItem('crestar_language', lang);
    } catch {}
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('language-changed'));
  };

  const setCurrency = (code) => {
    setCurrencyState(code);
    try {
      localStorage.setItem('crestar_currency', code);
    } catch {}
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

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  return { formatCurrency, formatDate, t, currency, currencySymbol, language, setLanguage, setCurrency };
}

export default useLocalization;
