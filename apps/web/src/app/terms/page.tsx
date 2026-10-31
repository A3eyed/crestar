// @ts-nocheck
'use client';
import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'October 31, 2026';

const SUPPORT_EMAIL = 'support@crestarhq.com';
const DMCA_EMAIL = 'dmca@crestarhq.com';

const SECTIONS = [
  {
    title: '1. Welcome to Crestar',
    body: `These Terms of Service ("Terms") are a legal agreement between you and Crestar ("Crestar", "we", "us", or "our") governing your use of the Crestar mobile application, website, and related services (together, the "Platform").\n\nCrestar is a social commerce platform that combines short-form video with a marketplace: you can watch and post videos, buy products, sell products or food, offer delivery services, and earn commissions as a creator — on your phone or in your browser.\n\nBy creating an account or using the Platform, you agree to these Terms. If you do not agree, please do not use Crestar.`,
  },
  {
    title: '2. Who Can Use Crestar',
    body: `You must be at least 18 years old (or the age of majority where you live) to use Crestar, including to buy, sell, deliver, create monetized content, or receive payouts. You must confirm your age when creating an account.\n\nYou are responsible for your account and everything that happens under it. Keep your password safe, and tell us immediately if you believe your account has been compromised. You may not sell, transfer, or lend your account to anyone else.`,
  },
  {
    title: '3. User Roles',
    body: `Crestar supports four user roles, and one person may hold several:\n\n• Buyers — purchase products, food, and services\n• Sellers — list and sell physical goods or food & beverages after onboarding and approval in the Monetization Center\n• Creators — post videos, tag products, and earn affiliate commissions\n• Deliverers — deliver orders and earn delivery fees after onboarding and approval\n\nSeller, creator, and deliverer features unlock only after completing the relevant onboarding — available in the Monetization Center on both the mobile app and the website.`,
  },
  {
    title: '4. Your Content',
    body: `You own the videos, photos, captions, comments, and other content you post ("Your Content"). By posting on Crestar, you grant us a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, and distribute Your Content on the Platform for the purpose of operating and promoting the service — for example, showing your videos in the Feed and your products in Shop.\n\nYou can record videos with your device camera (in the app or in your browser) or upload existing videos. Drafts you save before posting are stored only on your own device.\n\nYou promise that Your Content does not infringe anyone else's rights (including copyright, trademark, and privacy rights) and complies with these Terms and local laws.\n\nYou can delete Your Content at any time. Deleting content removes it from public view; residual copies may persist in backups for a limited period.`,
  },
  {
    title: '5. Community Rules',
    body: `Crestar is a marketplace and a community. You agree NOT to:\n\n• Post content that is illegal, hateful, harassing, sexually explicit, violent, or misleading\n• Impersonate any person or brand, or misrepresent your affiliation\n• Post spam, scams, pyramid schemes, or deceptive promotions\n• Upload viruses or attempt to hack, overload, or reverse-engineer the Platform\n• Collect other users' data without consent\n• Use bots or artificial engagement to inflate likes, views, followers, or sales\n\nWe may remove content, restrict features, suspend, or terminate accounts that violate these rules — with or without notice, depending on severity.`,
  },
  {
    title: '6. Buying on Crestar',
    body: `When you place an order, you make an offer to purchase from the seller — not from Crestar. We facilitate the transaction but are not the seller of the products.\n\n• Payment is required before an order becomes active. Unpaid orders are never sent to sellers, and your items remain in your cart so you can complete the purchase whenever you're ready.\n• All payments are processed securely by Paystack. We never store your full card or mobile money details.\n• Buyer Protection: your payment is held in escrow and only released to the seller after you confirm delivery (via your delivery PIN, QR code, or manual confirmation).\n• Prices are set by sellers in the seller's currency, with automatic conversion estimates shown in yours. You can change your display currency and language any time in Settings — changes apply instantly.\n• The delivery details you provide at checkout (name, phone, address, landmark, notes) are shared with the seller — and any assigned deliverer — solely to fulfill your order.\n• If something goes wrong with an order, contact the seller first through chat. If you can't resolve it, open a dispute through Support and we will review it. Refunds are handled case by case.`,
  },
  {
    title: '7. Selling on Crestar',
    body: `To sell products, food, or services you must complete onboarding in the Monetization Center and be approved.\n\nAs a seller you agree to:\n• List only items you actually have and can legally sell — accurately described, with real photos\n• Honor your listed prices, delivery zones, and preparation times\n• Fulfill paid orders promptly and package items appropriately\n• Comply with all laws that apply to your products (including food safety rules for FoodHub sellers)\n\nProhibited items include: illegal goods, weapons, drugs, counterfeit products, stolen goods, hazardous materials, and anything requiring a license you do not hold.\n\nFees — one flat rate, stated plainly:\n\n• Crestar charges a flat 5% platform fee on the item subtotal of every sale. You keep 95%, less payment processing costs charged by Paystack.\n• The same flat 5% applies whether the sale is direct (a buyer finds you in Shop, FoodHub, or on your profile) or creator-promoted. There are no other platform fees, tiers, or exceptions.\n• On creator-promoted sales, the creator also earns the commission rate you set for that product (5% by default). The flat 5% is deducted from each party's share — yours and the creator's — and nothing else is taken.\n\nDelivery fees are separate and are paid to the deliverer, less the same flat 5%. Earnings from completed orders are released from escrow to your wallet net of the fee, and you can withdraw to your configured payout method.`,
  },
  {
    title: '8. Creators & Affiliate Earnings',
    body: `Creators can tag sellers' products in videos and earn a commission on sales driven by their content — for products sellers have opened to creator promotion, at the commission rate each seller sets per product (default 5%).\n\nHow a creator-attributed sale is split on the item subtotal (delivery fees excluded):\n• Creator — the seller's chosen commission rate, 5% by default, less the flat 5% Crestar fee\n• Seller — the remainder, less the same flat 5% Crestar fee\n• Crestar — a flat 5% of the item subtotal, and nothing more\n\nThe flat 5% is the only fee Crestar charges, on every program and every sale.\n\n• Commissions are calculated on the product subtotal (not delivery fees) and paid after the order completes.\n• You must not use misleading claims, fake discounts, or artificial engagement to drive sales.\n• Crestar may withhold or reverse commissions on fraudulent, refunded, or cancelled orders.`,
  },
  {
    title: '9. Deliverers',
    body: `Approved deliverers can accept delivery assignments, pick up orders, and confirm deliveries using the buyer's PIN or QR code. Deliverers keep 95% of every delivery fee — the same flat 5% Crestar fee applies, and nothing else is deducted.\n\nAs a deliverer you agree to: maintain valid vehicle documentation, handle packages with care, deliver to the stated address, only confirm delivery after actually handing over the package, and comply with local transport laws. Delivery fees are credited to your wallet, net of the flat 5%, after confirmed delivery.\n\nNever ask a buyer for their PIN before they have inspected their package. Fraudulent confirmations lead to permanent removal.`,
  },
  {
    title: '10. Payments, Wallets & Withdrawals',
    body: `Crestar wallets track your earnings and balances. Payments in and out of the Platform are processed by Paystack and its partner banks and mobile money providers. By transacting, you also agree to Paystack's terms of service.\n\n• You can set up a payout method (mobile money or bank account) in your Wallet on the app or website.\n• Withdrawal requests are sent to your configured payout method and may take 1–3 business days.\n• We may hold funds, delay withdrawals, or reverse transactions where we reasonably suspect fraud, money laundering, or violation of these Terms.\n• You are responsible for any taxes that apply to your earnings.`,
  },
  {
    title: '11. Notifications & Communications',
    body: `Crestar sends you service notifications — in-app, by email, and (where enabled) by push — about activity on your account: new orders and payments, escrow releases, likes, comments, new followers, and direct messages.\n\nWe do not send marketing or promotional push notifications by default. Marketing email, if any, is optional: you can unsubscribe at any time using the link in those messages without losing essential order and delivery alerts.\n\nSellers automatically receive alerts when a new paid order comes in, including access to the buyer's delivery details for fulfillment.\n\nYou can manage notification preferences in Settings, and control who can message or comment on your content in Settings → Privacy Settings. Service messages essential to your transactions (such as payment confirmations) cannot be switched off while you have active orders.`,
  },
  {
    title: '12. Intellectual Property',
    body: `The Crestar name, logo, app design, and software are owned by Crestar and protected by law. You may not copy, modify, or create derivative works from them without our written permission.\n\nIf you believe content on Crestar infringes your copyright, use the DMCA process in Section 13.`,
  },
  {
    title: '13. Copyright Complaints (DMCA)',
    body: `Crestar respects intellectual property rights and responds to notices of alleged copyright infringement under the U.S. Digital Millennium Copyright Act (17 U.S.C. § 512) and similar laws.\n\nDesignated DMCA Agent\n• Name / Title: Copyright Agent, Crestar\n• Email: ${DMCA_EMAIL}\n• Alternate: ${SUPPORT_EMAIL} with subject line "DMCA Notice"\n• Mail: Crestar — DMCA Agent, Accra, Ghana (update with your full registered business street address)\n\nA complete DMCA notice must include:\n1. Identification of the copyrighted work claimed to be infringed\n2. Identification of the material that is claimed to be infringing, with enough detail for us to locate it (URL or user and post description)\n3. Your contact information (name, address, telephone, email)\n4. A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law\n5. A statement that the information in the notice is accurate, and under penalty of perjury, that you are the owner or authorized to act on behalf of the owner\n6. Your physical or electronic signature\n\nUpon a valid notice we may remove or disable access to the material and notify the user who posted it. Repeat infringers may have their accounts terminated.\n\nIf your content was removed in error, you may send a counter-notice to the same agent with the information required by 17 U.S.C. § 512(g).`,
  },
  {
    title: '14. Disclaimers & Limitation of Liability',
    body: `Crestar is provided "as is" and "as available". While we work hard to keep the Platform safe and reliable, we cannot guarantee it will always be uninterrupted or error-free.\n\nTo the maximum extent permitted by law:\n• We are not responsible for the quality, safety, or legality of items sold by sellers, the accuracy of listings, disputes between buyers and sellers, or items lost or damaged during delivery.\n• We are not liable for indirect, incidental, special, or consequential damages, or for loss of profits, data, or goodwill.\n• Our total liability for any claim relating to the Platform is limited to the fees you paid to Crestar in the 12 months before the claim.\n\nNothing in these Terms excludes liability that cannot be excluded by law.`,
  },
  {
    title: '15. Suspension & Termination',
    body: `You may stop using Crestar and delete your account at any time in Settings. Account deletion is blocked while you have wallet balance or unresolved orders — withdraw funds and complete or cancel orders first.\n\nWe may suspend or terminate your access if you breach these Terms, create risk or legal exposure for us or other users, or if required by law. Where reasonable, we will notify you first.`,
  },
  {
    title: '16. Changes to These Terms',
    body: `We may update these Terms as Crestar evolves. If we make material changes, we will notify you in the app or on the website before they take effect. Continuing to use the Platform after changes take effect means you accept the updated Terms.`,
  },
  {
    title: '17. Governing Law & Contact',
    body: `These Terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law rules, unless mandatory consumer protection law in your country of residence provides otherwise.\n\nQuestions about these Terms? Reach us any time:\n• Email: ${SUPPORT_EMAIL}\n• DMCA: ${DMCA_EMAIL}\n• Support form: crestarhq.com/support\n• In-app: Settings → Support & About → Report a problem\n\nMost issues can be resolved quickly and amicably.`,
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-white">
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
