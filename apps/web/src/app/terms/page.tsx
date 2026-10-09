// @ts-nocheck
'use client';
import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'September 24, 2026';

const SUPPORT_EMAIL = 'support@crestarhq.com';

const SECTIONS = [
  {
    title: '1. Welcome to Crestar',
    body: `These Terms of Service ("Terms") are a legal agreement between you and Crestar ("Crestar", "we", "us", or "our") governing your use of the Crestar mobile application, website, and related services (together, the "Platform").

Crestar is a social commerce platform that combines short-form video with a marketplace: you can watch and post videos, buy products, sell products or food, offer delivery services, and earn commissions as a creator — on your phone or in your browser.

By creating an account or using the Platform, you agree to these Terms. If you do not agree, please do not use Crestar.`,
  },
  {
    title: '2. Who Can Use Crestar',
    body: `You must be at least 18 years old (or the age of majority where you live) to use Crestar, including to buy, sell, deliver, create monetized content, or receive payouts.

You are responsible for your account and everything that happens under it. Keep your password safe, and tell us immediately if you believe your account has been compromised. You may not sell, transfer, or lend your account to anyone else.`,
  },
  {
    title: '3. User Roles',
    body: `Crestar supports four user roles, and one person may hold several:

• Buyers — purchase products, food, and services
• Sellers — list and sell physical goods or food & beverages after onboarding and approval in the Monetization Center
• Creators — post videos, tag products, and earn affiliate commissions
• Deliverers — deliver orders and earn delivery fees after onboarding and approval

Seller, creator, and deliverer features unlock only after completing the relevant onboarding — available in the Monetization Center on both the mobile app and the website.`,
  },
  {
    title: '4. Your Content',
    body: `You own the videos, photos, captions, comments, and other content you post ("Your Content"). By posting on Crestar, you grant us a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, and distribute Your Content on the Platform for the purpose of operating and promoting the service — for example, showing your videos in the Feed and your products in Shop.

You can record videos with your device camera (in the app or in your browser) or upload existing videos. Drafts you save before posting are stored only on your own device.

You promise that Your Content does not infringe anyone else's rights (including copyright, trademark, and privacy rights) and complies with these Terms and local laws.

You can delete Your Content at any time. Deleting content removes it from public view; residual copies may persist in backups for a limited period.`,
  },
  {
    title: '5. Community Rules',
    body: `Crestar is a marketplace and a community. You agree NOT to:

• Post content that is illegal, hateful, harassing, sexually explicit, violent, or misleading
• Impersonate any person or brand, or misrepresent your affiliation
• Post spam, scams, pyramid schemes, or deceptive promotions
• Upload viruses or attempt to hack, overload, or reverse-engineer the Platform
• Collect other users' data without consent
• Use bots or artificial engagement to inflate likes, views, followers, or sales

We may remove content, restrict features, suspend, or terminate accounts that violate these rules — with or without notice, depending on severity.`,
  },
  {
    title: '6. Buying on Crestar',
    body: `When you place an order, you make an offer to purchase from the seller — not from Crestar. We facilitate the transaction but are not the seller of the products.

• Payment is required before an order becomes active. Unpaid orders are never sent to sellers, and your items remain in your cart so you can complete the purchase whenever you're ready.
• All payments are processed securely by Paystack. We never store your full card or mobile money details.
• Buyer Protection: your payment is held in escrow and only released to the seller after you confirm delivery (via your delivery PIN, QR code, or manual confirmation).
• Prices are set by sellers in the seller's currency, with automatic conversion estimates shown in yours. You can change your display currency and language any time in Settings — changes apply instantly.
• The delivery details you provide at checkout (name, phone, address, landmark, notes) are shared with the seller — and any assigned deliverer — solely to fulfill your order.
• If something goes wrong with an order, contact the seller first through chat. If you can't resolve it, open a dispute through Support and we will review it. Refunds are handled case by case.`,
  },
  {
    title: '7. Selling on Crestar',
    body: `To sell products, food, or services you must complete onboarding in the Monetization Center and be approved.

As a seller you agree to:
• List only items you actually have and can legally sell — accurately described, with real photos
• Honor your listed prices, delivery zones, and preparation times
• Fulfill paid orders promptly and package items appropriately
• Comply with all laws that apply to your products (including food safety rules for FoodHub sellers)

Prohibited items include: illegal goods, weapons, drugs, counterfeit products, stolen goods, hazardous materials, and anything requiring a license you do not hold.

Fees — one flat rate, stated plainly:

• Crestar charges a flat 3% platform fee on the item subtotal of every sale. You keep 97%, less payment processing costs charged by Paystack.
• The same flat 3% applies whether the sale is direct (a buyer finds you in Shop, FoodHub, or on your profile) or creator-promoted. There are no other platform fees, tiers, or exceptions.
• On creator-promoted sales, the creator also earns the commission rate you set for that product (5% by default). The flat 3% is deducted from each party's share — yours and the creator's — and nothing else is taken.

Delivery fees are separate and are paid to the deliverer, less the same flat 3%. Earnings from completed orders are released from escrow to your wallet net of the fee, and you can withdraw to your configured payout method.`,
  },
  {
    title: '8. Creators & Affiliate Earnings',
    body: `Creators can tag sellers' products in videos and earn a commission on sales driven by their content — for products sellers have opened to creator promotion, at the commission rate each seller sets per product (default 5%).

How a creator-attributed sale is split on the item subtotal (delivery fees excluded):
• Creator — the seller's chosen commission rate, 5% by default, less the flat 3% Crestar fee
• Seller — the remainder, less the same flat 3% Crestar fee
• Crestar — a flat 3% of the item subtotal, and nothing more

The flat 3% is the only fee Crestar charges, on every program and every sale.

• Commissions are calculated on the product subtotal (not delivery fees) and paid after the order completes.
• You must not use misleading claims, fake discounts, or artificial engagement to drive sales.
• Crestar may withhold or reverse commissions on fraudulent, refunded, or cancelled orders.`,
  },
  {
    title: '9. Deliverers',
    body: `Approved deliverers can accept delivery assignments, pick up orders, and confirm deliveries using the buyer's PIN or QR code. Deliverers keep 97% of every delivery fee — the same flat 3% Crestar fee applies, and nothing else is deducted.

As a deliverer you agree to: maintain valid vehicle documentation, handle packages with care, deliver to the stated address, only confirm delivery after actually handing over the package, and comply with local transport laws. Delivery fees are credited to your wallet, net of the flat 3%, after confirmed delivery.

Never ask a buyer for their PIN before they have inspected their package. Fraudulent confirmations lead to permanent removal.`,
  },
  {
    title: '10. Payments, Wallets & Withdrawals',
    body: `Crestar wallets track your earnings and balances. Payments in and out of the Platform are processed by Paystack and its partner banks and mobile money providers. By transacting, you also agree to Paystack's terms of service.

• You can set up a payout method (mobile money or bank account) in your Wallet on the app or website.
• Withdrawal requests are sent to your configured payout method and may take 1–3 business days.
• We may hold funds, delay withdrawals, or reverse transactions where we reasonably suspect fraud, money laundering, or violation of these Terms.
• You are responsible for any taxes that apply to your earnings.`,
  },
  {
    title: '11. Notifications & Communications',
    body: `Crestar sends you service notifications — in-app, by email, and (where enabled) by push — about activity on your account: new orders and payments, escrow releases, likes, comments, new followers, and direct messages.

We do not send marketing or promotional push notifications. If we ever introduce them, they will be opt-in only: we will ask for your explicit consent first and you will be able to withdraw it at any time without losing your order and delivery alerts.

Sellers automatically receive alerts when a new paid order comes in, including access to the buyer's delivery details for fulfillment.

You can manage notification preferences in Settings, and control who can message or comment on your content in Settings → Privacy Settings. Service messages essential to your transactions (such as payment confirmations) cannot be switched off while you have active orders.`,
  },
  {
    title: '12. Intellectual Property',
    body: `The Crestar name, logo, app design, and software are owned by Crestar and protected by law. You may not copy, modify, or create derivative works from them without our written permission.

If you believe content on Crestar infringes your copyright, report it via Support with details of the work and the infringing content. We review and act on valid notices, and repeat infringers lose their accounts.`,
  },
  {
    title: '13. Disclaimers & Limitation of Liability',
    body: `Crestar is provided "as is" and "as available". While we work hard to keep the Platform safe and reliable, we cannot guarantee it will always be uninterrupted or error-free.

To the maximum extent permitted by law:
• We are not responsible for the quality, safety, or legality of items sold by sellers, the accuracy of listings, disputes between buyers and sellers, or items lost or damaged during delivery.
• We are not liable for indirect, incidental, special, or consequential damages, or for loss of profits, data, or goodwill.
• Our total liability for any claim relating to the Platform is limited to the fees you paid to Crestar in the 12 months before the claim.

Nothing in these Terms excludes liability that cannot be excluded by law.`,
  },
  {
    title: '14. Suspension & Termination',
    body: `You may stop using Crestar and delete your account at any time in Settings. Account deletion is blocked while you have wallet balance or unresolved orders — withdraw funds and complete or cancel orders first.

We may suspend or terminate your access if you breach these Terms, create risk or legal exposure for us or other users, or if required by law. Where reasonable, we will notify you first.`,
  },
  {
    title: '15. Changes to These Terms',
    body: `We may update these Terms as Crestar evolves. If we make material changes, we will notify you in the app or on the website before they take effect. Continuing to use the Platform after changes take effect means you accept the updated Terms.`,
  },
  {
    title: '16. Governing Law & Contact',
    body: `These Terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law rules, unless mandatory consumer protection law in your country of residence provides otherwise.

Questions about these Terms? Reach us any time:
• Email: ${SUPPORT_EMAIL}
• Support form: crestarhq.com/support
• In-app: Settings → Support & About → Report a problem

Most issues can be resolved quickly and amicably.`,
  },
];

const ACCOUNT_AGREEMENT = 'Creating an account requires agreement to these Terms and the Privacy Policy. You may only post content you own or have permission to use. Repeat copyright infringement can close an account.';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 className="text-white text-xl font-bold">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-5 pb-24">
        <p className="text-white/60 text-sm mb-6">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-white text-lg font-bold mb-3">{section.title}</h2>
              <p className="text-white/80 text-base leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}

          <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-8">
            <p className="text-white/80 text-sm text-center leading-relaxed">
              We're glad you're here. Build, sell, create — and be good to each other.
            </p>
            <p className="text-center mt-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[#D4AF37] text-sm font-semibold underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
