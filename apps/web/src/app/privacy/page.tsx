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
        <p className="text-gray-500 text-sm mb-10">Last updated: September 9, 2026</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 text-[15px] leading-relaxed">
          {/* Intro */}
          <p>
            Crestar (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is Ghana&apos;s social
            commerce platform. This Privacy Policy explains how we collect, use, store, share, and
            protect your personal information when you use the Crestar mobile app or website. By
            using Crestar, you agree to the practices described in this policy.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800">Account Information</h3>
                <p>
                  Name, email address, phone number, username, profile photo, and Ghana Card
                  information (for sellers and deliverers).
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
                  Device model, operating system version, unique device identifiers (advertising ID,
                  app instance ID), IP address (collected via ipapi.co for region detection), mobile
                  carrier, and app version.
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
                <h3 className="font-semibold text-gray-800">Camera &amp; Media</h3>
                <p>
                  Photos and videos you capture or select from your photo library for profile
                  pictures, product listings, and content creation. You can record videos with your
                  device camera in the mobile app or directly in your web browser — your browser
                  asks for permission first and shows an indicator while the camera is active. We do
                  not access your camera or photo library without your explicit permission.
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
                <h3 className="font-semibold text-gray-800">
                  Deleted Videos (Trash &amp; Restore)
                </h3>
                <p>
                  When you delete a posted video, it moves to your private Trash where only you can
                  see it. Trashed videos are kept for up to 30 days so you can restore them, after
                  which they are permanently and automatically removed from our systems. You can
                  also permanently delete a trashed video yourself at any time.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Cookies &amp; Browser Storage (Web)</h3>
                <p>
                  On crestarhq.com we use essential cookies and browser storage to keep you signed
                  in, remember your cart, your chosen FoodHub location, and your currency and
                  language preferences. We do not use advertising or cross-site tracking cookies.
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

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process transactions and payments</li>
              <li>Verify identity for sellers and deliverers</li>
              <li>Facilitate deliveries and track orders in real time</li>
              <li>Improve our services and user experience through analytics</li>
              <li>Send push notifications about orders, messages, and updates</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Provide personalized content recommendations</li>
              <li>Detect and prevent abuse, spam, and policy violations</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Ghana Card Verification</h2>
            <p>
              We collect Ghana Card information (including photos of your ID card) from sellers and
              deliverers for identity verification. This information is stored securely and used
              only for verification and compliance. We do not share your Ghana Card details with
              other users.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Location Data</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800">Foreground Location</h3>
                <p>
                  We collect your precise GPS location when you actively use the app for delivery
                  address entry, restaurant discovery, and delivery zone setup.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Background Location (Deliverers Only)
                </h3>
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
                  deliveries. Location history is retained for 90 days for dispute resolution. You
                  can control location permissions in your device settings at any time.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payment Information</h2>
            <p>
              Payment transactions are processed through <strong>Paystack</strong>, our PCI-DSS
              compliant payment processor. When you make a payment, Paystack receives your payment
              card details, device information, IP address, and transaction amount. We do not store
              full payment card details on our servers.
            </p>
            <p className="mt-3">
              For payouts, we collect and store your Mobile Money number and/or bank account details
              (account number, bank name). This information is encrypted and used only to process
              withdrawals. Transaction history, amounts, and references are stored for accounting,
              tax compliance, and dispute resolution.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Information Sharing</h2>
            <p>
              We share information with sellers (buyer delivery info), deliverers (pickup and
              delivery addresses), and payment processors (Paystack receives transaction details and
              device identifiers). We share data with law enforcement when required by law.{' '}
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              7. Camera, Microphone &amp; Photo Library Access
            </h2>
            <p>
              We request access to your camera and microphone to enable video recording for content
              creation and live streaming. We request access to your photo library to allow you to
              select photos for your profile, product listings, and posts.
            </p>
            <p className="mt-3">
              We only access these features when you explicitly choose to use them (e.g., tapping
              the camera button). We do not access your camera, microphone, or photo library in the
              background.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Creator Content</h2>
            <p>
              Videos and content created on Crestar are public by default. By posting content, you
              grant Crestar a license to display, distribute, and promote your content on the
              platform. Content metadata (timestamps, device info) is stored with your videos. We
              may use automated systems to detect policy violations.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Notifications</h2>
            <p>
              We send you in-app notifications, emails, and (where enabled) push notifications about
              activity that concerns you — including new orders, payments and escrow releases,
              likes, comments, new followers, and direct messages. We collect your push notification
              token to deliver these, and we track whether you open or dismiss notifications to
              improve our messaging. You can disable push notifications in your device settings or
              in the app&apos;s notification preferences, and you can manage who can interact with
              you in <strong>Settings → Privacy Settings</strong>.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              10. Analytics &amp; Tracking Technologies
            </h2>
            <p>
              We use analytics to understand how Crestar is used, track app performance, and provide
              personalized recommendations. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Event tracking (screens viewed, buttons tapped, videos watched)</li>
              <li>App instance identifiers for analytics</li>
              <li>IP address for region detection</li>
              <li>Crash reporting and performance monitoring</li>
            </ul>
            <p className="mt-3">
              We do not sell your data, share it with data brokers, or track you across other
              companies' apps and websites for advertising.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Data Security</h2>
            <p>
              We use industry-standard encryption and security measures to protect your data.
              Authentication tokens are stored securely using encrypted storage (iOS Keychain /
              Android Keystore). All data is transmitted over HTTPS/TLS. However, no method of
              transmission over the internet is 100% secure.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              12. Wallet, Escrow &amp; Affiliate Earnings
            </h2>
            <p>
              When you buy or sell on Crestar, we maintain a wallet ledger of your transactions.
              Seller payouts and creator affiliate commissions are held in a pending (escrow)
              balance and released to the available balance when the buyer confirms delivery —
              either with a 4-digit delivery PIN or an in-app confirmation. We store these ledger
              entries, delivery confirmations, and payout method details (Mobile Money or bank
              account) to process withdrawals, prevent fraud, and resolve disputes.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              13. Delivery Details Shared with Sellers
            </h2>
            <p>
              When you place an order, the delivery details you provide (name, phone number,
              address, landmark, and delivery notes) are shared with the seller — and, where
              applicable, an assigned deliverer — strictly for fulfilling that order. Sellers and
              deliverers may not use this information for any other purpose.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              14. Currency &amp; Language Preferences
            </h2>
            <p>
              Your chosen display currency and language are stored on your device (browser storage
              on web, secure app storage on mobile) so prices and text appear the way you prefer.
              Currency conversions are estimates fetched from exchange-rate services; sellers are
              always paid in their own listing currency.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active. After
              account deletion:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Profile data is deleted within 30 days</li>
              <li>Transaction records are retained for 7 years (tax compliance)</li>
              <li>Location history is deleted after 90 days</li>
              <li>
                Public content (videos, posts) may remain visible unless you delete it before
                closing your account
              </li>
            </ul>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">16. Your Rights &amp; Controls</h2>
            <p>
              You have the right to access, update, or delete your personal information. You can
              request data deletion by contacting our support team. In{' '}
              <strong>Settings → Privacy Settings</strong> you can control account privacy, who can
              message and comment, activity status visibility, and whether your delivery location is
              shared with sellers on active orders. You can revoke camera, microphone, location, and
              photo library permissions at any time in your device settings. Revoking permissions
              may limit certain app features.
            </p>
          </section>

          {/* Section 17 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">17. Children&apos;s Privacy</h2>
            <p>
              Crestar is not intended for users under 18 years of age. We do not knowingly collect
              information from children. If you believe we have collected data from a child, please
              contact us immediately.
            </p>
          </section>

          {/* Section 18 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">18. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of significant
              changes through the app. Continued use after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="mb-1">
              For privacy-related questions or to exercise your rights, contact us:
            </p>
            <ul className="space-y-1 mt-2">
              <li>
                <span className="font-semibold">In-app:</span> Profile → Support Chat
              </li>
              <li>
                <span className="font-semibold">Email:</span>{' '}
                <a
                  href="mailto:privacy@crestarhq.com"
                  className="underline"
                  style={{ color: '#D4AF37' }}
                >
                  privacy@crestarhq.com
                </a>
              </li>
              <li>
                <span className="font-semibold">General support:</span>{' '}
                <a
                  href="mailto:support@crestarhq.com"
                  className="underline"
                  style={{ color: '#D4AF37' }}
                >
                  support@crestarhq.com
                </a>
              </li>
              <li>
                <span className="font-semibold">Company:</span> Crestar Inc., Ghana
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        <p>© 2026 Crestar Inc. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="/terms" className="hover:text-gray-600 transition-colors">
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="hover:text-gray-600 transition-colors"
            style={{ color: '#D4AF37' }}
          >
            Privacy Policy
          </a>
          <a href="/support" className="hover:text-gray-600 transition-colors">
            Support
          </a>
        </div>
      </div>
    </div>
  );
}
