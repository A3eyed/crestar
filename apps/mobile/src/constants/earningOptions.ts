// @ts-nocheck
import { Store, Bike, ChefHat, Video } from 'lucide-react-native';
import { PLATFORM_FEE_PERCENT, EARNER_PERCENT } from '@/utils/platformFee';

/**
 * Every Crestar program pays the SAME flat platform fee — 3%. There are no
 * per-program rates, tiers or exceptions.
 */
const FLAT_FEE_BENEFIT = `Flat ${PLATFORM_FEE_PERCENT}% Crestar fee — you keep ${EARNER_PERCENT}%`;

export const EARNING_OPTIONS = [
  {
    id: 'seller',
    title: 'Become a Seller',
    subtitle: 'Sell physical goods & products',
    icon: Store,
    color: '#D4AF37',
    dashboardRoute: '/seller/dashboard',
    dashboardTitle: 'Seller Center',
    centerType: 'seller',
    benefits: [
      FLAT_FEE_BENEFIT,
      'Trusted deliverer network',
      'Bulk product uploads',
      'Built-in payment processing',
    ],
  },
  {
    id: 'foodhub',
    title: 'Sell Food & Drinks',
    subtitle: 'Start your food business',
    icon: ChefHat,
    color: '#D4AF37',
    dashboardRoute: '/seller/dashboard',
    dashboardTitle: 'FoodHub Dashboard',
    centerType: 'foodhub',
    benefits: [
      FLAT_FEE_BENEFIT,
      'Live order management',
      'Prep-time tracking',
      'Menu customization',
    ],
  },
  {
    id: 'creator',
    title: 'Become a Creator',
    subtitle: 'Earn by promoting products in videos',
    icon: Video,
    color: '#D4AF37',
    dashboardRoute: '/affiliate/dashboard',
    dashboardTitle: 'Creator Dashboard',
    centerType: 'creator',
    benefits: [
      FLAT_FEE_BENEFIT,
      'Commission on every sale your video drives (5% by default)',
      "Tag any seller's products in videos",
      'Earn while you grow your audience',
    ],
  },
  {
    id: 'deliverer',
    title: 'Become a Deliverer',
    subtitle: 'Deliver orders and earn',
    icon: Bike,
    color: '#F59E0B',
    dashboardRoute: '/deliverer/dashboard',
    dashboardTitle: 'Deliverer Dashboard',
    centerType: 'deliverer',
    benefits: [
      FLAT_FEE_BENEFIT,
      'Flexible working hours',
      'Online/offline toggle',
      'PIN confirmations',
    ],
  },
];
