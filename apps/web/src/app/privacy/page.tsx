// @ts-nocheck
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: '#D4AF37' }}>
              Crestar
            </span>
          </a>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Back to home
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: October 14, 2026</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 text-[15px] leading-relaxed">
          <p>
            Crestar ("we", "our", or "us") is an African social
            commerce platform. This Privacy Policy explains how we collect, use, store, share, and
            protect your personal information when you use the Crestar mobile app or website. By
            using Crestar, you agree to the practices described in this policy.
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800">Account Information</h3>
                <p>
                  Name, email address, phone number, username, and profile photo. Sellers, FoodHub
                  vendors, creators, and deliverers also provide business details, contact number,
                  and location (country, region, city) during monetization onboarding.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Location Data</h3>
                <p>
                  We collect precise GPS or browser location only in the foreground — while the app
                  or site is open and only when you ask for it (setting a delivery address, finding
                  restaurants near you in FoodHub, configuring seller delivery zones, or viewing an
                  active delivery as a deliverer). We do not collect your location in the background
                  or when the app is closed. Delivery addresses and order timestamps are stored for
                  order fulfillment and dispute resolution.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Device Information</h3>
                <p>
                  Device model, operating system version, unique device identifiers, IP address
                  (for region detection), mobile carrier, and app version.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Financial Information</h3>
                <p>
                  Transaction amounts, payment references, Mobile Money numbers (for payouts), bank
                  account details (account number, bank name for withdrawals), wallet balances, and
                  payout history.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Usage Data</h3>
                <p>
                  Pages viewed, videos watched, search queries, products browsed, time spent in app,
                  interaction events (likes, follows, purchases), and content creation activity.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Camera & Media</h3>
                <p>
                  Photos and videos you capture or select from your photo library for profile
                  pictures, product listings, and content creation. We do not access your camera or
                  photo library without your explicit permission.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Video Drafts</h3>
                <p>
                  Drafts you save before posting are stored only on your own device — not on our
                  servers — until you post them.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Deleted Videos (Trash & Restore)</h3>
                <p>
                  When you delete a posted video, it moves to your private Trash where only you can
                  see it. Trashed videos are kept for up to 30 days so you can restore them, after
                  which they are permanently removed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Cookies & Browser Storage (Web)</h3>
                <p>
                  On crestarhq.com we use essential cookies and browser storage to keep you signed
                  in, remember your cart, FoodHub location, and currency/language preferences. We do
                  not use advertising or cross-site tracking cookies.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Communications</h3>
                <p>
                  Messages sent through in-app chat, support inquiries, and notification
                  preferences.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process transactions and payments</li>
              <li>Review and approve monetization applications (sellers, FoodHub, creators, deliverers)</li>
              <li>Facilitate deliveries and track orders in real time</li>
              <li>Improve our services and user experience through analytics</li>
              <li>Send notifications about orders, messages, and updates</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Provide personalized content recommendations</li>
              <li>Detect and prevent abuse, spam, and policy violations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Location Data</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800">Foreground Location</h3>
                <p>
                  We collect your precise GPS location when you actively use the app for delivery
                  address entry, restaurant discovery, and delivery zone setup.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Background Location (Deliverers Only)</h3>
                <p>
                  If you are a deliverer and accept a delivery, we collect your location in the
                  background while the delivery is active to provide real-time tracking to buyers
                  and sellers. You can stop background location collection by completing or
                  canceling the delivery.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Location Sharing</h3>
                <p>
                  Your real-time location is shared with buyers and sellers only during active
                  deliveries. Location history is retained for 90 days for dispute resolution.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Payment Information</h2>
            <p>
              Payment transactions are processed through <strong>Paystack</strong>, our PCI-DSS
              compliant payment processor. We do not store full payment card details on our servers.
            </p>
            <p className="mt-3">
              For payouts, we collect and store your Mobile Money number and/or bank account details
              to process withdrawals. Transaction history is stored for accounting, tax compliance,
              and dispute resolution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Information Sharing</h2>
            <p>
              We share information with sellers (buyer delivery info), deliverers (pickup and
              delivery addresses), and payment processors (Paystack). We share data with law
              enforcement when required by law.{' '}
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              6. Camera, Microphone & Photo Library Access
            </h2>
            <p>
              We request access to your camera and microphone for video recording and live streaming,
              and to your photo library for profile photos, listings, and posts. We only access these
              when you explicitly use them — never in the background.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Creator Content</h2>
            <p>
              Videos and content created on Crestar are public by default. By posting content, you
              grant Crestar a license to display, distribute, and promote your content on the
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Notifications</h2>
            <p>
              We send in-app notifications, emails, and (where enabled) push notifications about
              orders, payments, likes, comments, new followers, and messages. You can manage
              notification preferences in Settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              9. Analytics & Tracking Technologies
            </h2>
            <p>
              We use analytics to understand how Crestar is used and improve the product. We do not
              sell your data or track you across other companies' apps for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Data Security</h2>
            <p>
              We use industry-standard encryption and security measures. All data is transmitted over
              HTTPS/TLS. No method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              11. Wallet, Escrow & Affiliate Earnings
            </h2>
            <p>
              Seller payouts and creator affiliate commissions are held in a pending (escrow) balance
              and released when the buyer confirms delivery. We store ledger entries and payout method
              details to process withdrawals and resolve disputes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              12. Delivery Details Shared with Sellers
            </h2>
            <p>
              When you place an order, delivery details you provide are shared with the seller and,
              where applicable, an assigned deliverer — only for fulfilling that order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              13. Currency & Language Preferences
            </h2>
            <p>
              Your chosen display currency and language are stored on your device. Sellers are always
              paid in their listing currency.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Profile data is deleted within 30 days of account deletion</li>
              <li>Transaction records are retained for 7 years (tax compliance)</li>
              <li>Location history is deleted after 90 days</li>
              <li>Public content may remain visible unless you delete it first</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Your Rights & Controls</h2>
            <p>
              You can access, update, or delete your personal information. Contact Support to exercise
              these rights. You can revoke camera, microphone, location, and photo library permissions
              in your device settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">16. Children's Privacy</h2>
            <p>
              Crestar is not intended for users under 18. We do not knowingly collect information from
              children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">17. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Significant changes will be
              announced in the app. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="mb-1">
              For privacy-related questions or to exercise your rights, contact us:
            </p>
            <ul className="space-y-1 mt-2">
              <li>
                Email:{' '}
                <a href="mailto:support@crestarhq.com" className="text-[#D4AF37] hover:underline">
                  support@crestarhq.com
                </a>
              </li>
              <li>
                In-app:{' '}
                <a href="/support" className="text-[#D4AF37] hover:underline">
                  Support
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
