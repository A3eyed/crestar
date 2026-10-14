// @ts-nocheck
import {
  ArrowUpRight,
  TrendingUp,
  Package,
  DollarSign,
  Truck,
  AlertTriangle,
  ArrowDownLeft,
  ShoppingBag,
  Clock,
  RotateCcw,
} from "lucide-react-native";

export const MOMO_PROVIDERS = [
  { code: "MTN", name: "MTN Mobile Money", color: "#FFCC00" },
  { code: "VOD", name: "Vodafone Cash", color: "#E60000" },
  { code: "ATL", name: "AirtelTigo Money", color: "#E40521" },
  { code: "TGO", name: "T-Go (G-Money)", color: "#00A9CE" },
];

const INCOMING = [
  "order_payout",
  "delivery_fee",
  "creator_commission",
  "escrow_release",
  "deposit",
  "refund",
];

export const getTransactionIcon = (type) => {
  const icons = {
    order_payout: Package,
    delivery_fee: Truck,
    creator_commission: TrendingUp,
    creator_commission_hold: Clock,
    escrow_release: ArrowDownLeft,
    escrow_hold: Clock,
    deposit: ArrowDownLeft,
    refund: RotateCcw,
    withdrawal: ArrowUpRight,
    platform_fee: AlertTriangle,
    purchase: ShoppingBag,
    order_payment: ShoppingBag,
  };
  return icons[type] || DollarSign;
};

export const getTransactionColor = (type) => {
  if (
    type === "purchase" ||
    type === "order_payment" ||
    type === "withdrawal" ||
    type === "platform_fee"
  )
    return "#FF3B30";
  if (type === "escrow_hold" || type === "creator_commission_hold")
    return "#FF9F0A";
  return INCOMING.includes(type) ? "#34C759" : "#D4AF37";
};

export const getTransactionLabel = (tx) => {
  const labels = {
    order_payout: "Order earning, after 5% fee",
    delivery_fee: "Delivery earning, after 5% fee",
    creator_commission: "Creator commission, after 5% fee",
    creator_commission_hold: "Commission waiting on delivery PIN",
    escrow_release: "Earning released",
    escrow_hold: "Sale waiting on delivery PIN",
    deposit: "Deposit",
    refund: "Refund",
    withdrawal: "Cash out",
    platform_fee: "Crestar 5% fee",
    purchase: "Order payment",
    order_payment: "Order payment",
  };
  return labels[tx.transaction_type] || tx.description || tx.transaction_type;
};

export const isIncomingTransaction = (type) => INCOMING.includes(type);
