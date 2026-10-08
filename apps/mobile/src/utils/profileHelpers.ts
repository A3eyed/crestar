// @ts-nocheck
import {
  Grid3X3,
  Lock,
  Heart,
  Bookmark,
  ShoppingBag,
  MessageCircle,
  Wallet,
  DollarSign,
  Settings,
  ClipboardList,
  HelpCircle,
  Shield,
  Video,
  Trash2,
} from 'lucide-react-native';

export function buildProfileTabs(isSeller, user) {
  // Admin accounts don't show shop or seller-specific tabs
  if (user?.role === 'admin' || user?.role === 'owner') {
    return [
      { id: 'posts', icon: Grid3X3 },
      { id: 'private', icon: Lock },
      { id: 'likes', icon: Heart },
      { id: 'saved', icon: Bookmark },
    ];
  }

  const baseTabs = [{ id: 'posts', icon: Grid3X3 }];

  if (isSeller) {
    baseTabs.push({ id: 'shop', icon: ShoppingBag });
  }

  baseTabs.push(
    { id: 'private', icon: Lock },
    { id: 'likes', icon: Heart },
    { id: 'saved', icon: Bookmark }
  );

  return baseTabs;
}

export function buildDrawerItems(isSeller, isCreator, isDeliverer, user, router, closeDrawer, t) {
  // Provide a fallback if t is not provided
  const translate = t || ((key) => key);
  const items = [];

  // Add "Switch to Admin Mode" button for admin/owner users at the top
  const userRole = user?.role || 'user';
  if (userRole === 'admin' || userRole === 'owner') {
    items.push({
      id: 'admin',
      title: 'Admin',
      description: translate('sellerCenter'),
      icon: Shield,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/admin/dashboard'), 300);
      },
    });
  }

  // Regular drawer items for all users
  items.push(
    {
      id: 'inbox',
      title: translate('inbox'),
      description: translate('messages'),
      icon: MessageCircle,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/inbox'), 300);
      },
    },
    {
      id: 'orders',
      title: translate('orderHistory'),
      description: translate('orders'),
      icon: ClipboardList,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/order-history'), 300);
      },
    },
    {
      id: 'wallet',
      title: translate('wallet'),
      description: translate('balance'),
      icon: Wallet,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/wallet'), 300);
      },
    },
    {
      id: 'monetization',
      title: isSeller
        ? translate('sellerCenter')
        : isCreator
          ? translate('creatorProgram')
          : isDeliverer
            ? translate('deliveryCenter')
            : translate('monetizationCenter'),
      description: isSeller
        ? translate('myListings')
        : isCreator
          ? translate('analytics')
          : isDeliverer
            ? translate('deliveryCenter')
            : translate('earn'),
      icon: DollarSign,
      onPress: () => {
        closeDrawer();
        setTimeout(() => {
          if (isSeller) {
            router.push('/seller/dashboard');
          } else if (isCreator) {
            router.push('/affiliate/dashboard');
          } else if (isDeliverer) {
            router.push('/deliverer/dashboard');
          } else {
            router.push('/monetization-center');
          }
        }, 300);
      },
    },
    {
      id: 'support',
      title: translate('helpCenter'),
      description: translate('contactUs'),
      icon: HelpCircle,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/support-chat'), 300);
      },
    },
    {
      id: 'trash',
      title: 'Recently deleted',
      description: 'Restore videos within 30 days',
      icon: Trash2,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/trash'), 300);
      },
    },
    {
      id: 'settings',
      title: translate('settingsAndPrivacy'),
      description: translate('settings'),
      icon: Settings,
      onPress: () => {
        closeDrawer();
        setTimeout(() => router.push('/settings'), 300);
      },
    }
  );

  return items;
}

export function getUserStats(user, t) {
  const translate = t || ((key) => key);
  return [
    { label: translate('following'), value: '0' },
    { label: translate('followers'), value: '0' },
    { label: translate('likes'), value: '0' },
  ];
}

export function getUsername(user) {
  // Always require a user object
  if (!user) return 'unknown';

  // If username exists, use it
  if (user.username && user.username.trim() !== '') {
    return user.username;
  }

  // ── FALLBACK: Generate username from email if not set ──
  // This handles existing users who signed up before username was auto-generated
  if (user.email && user.email.includes('@')) {
    const emailPrefix = user.email.split('@')[0];
    // Clean it up: lowercase, only letters/numbers/underscore
    const cleaned = emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (cleaned && cleaned.length > 0) {
      return cleaned;
    }
  }

  // Last resort: use user ID to ensure uniqueness
  if (user.id) return `user${user.id}`;

  // Absolute fallback (should never happen)
  return 'unknown';
}

export function getDisplayName(user) {
  return user?.display_name || user?.name || '';
}
