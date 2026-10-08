// @ts-nocheck
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../utils/theme';

const LAST_UPDATED = 'September 18, 2026';

const SUPPORT_EMAIL = 'support@crestar.app';
const PRIVACY_EMAIL = 'privacy@crestar.app';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `This Privacy Policy explains how Crestar ("Crestar", "we", "us") collects, uses, shares, and protects your personal information when you use our app, website, and services (the "Platform").

We built Crestar to be a place where you can watch, create, buy, sell, and deliver — and we take the responsibility of handling your data seriously. This policy is written to be read, not to hide things: if anything is unclear, contact us through Support and we'll explain.`,
  },
  {
    title: '2. Information We Collect',
    body: `Information you give us:
• Account details — email address, password (stored encrypted), name, username, profile photo, and bio
• Seller / deliverer onboarding — business name, phone number, mobile money number, location (country, region, city), vehicle type, and verification photos where required (including Ghana Card for identity verification)
• Content — videos, captions, comments, likes, follows, product listings, photos, and messages you send
• Video drafts — drafts you save before posting are stored ONLY on your device, not on our servers, until you post them
• Orders & delivery — delivery address, recipient name, phone number, and optional location coordinates
• Payouts — mobile money number and/or bank account details (encrypted, used only to process withdrawals)
• Support — anything you send us when reporting a problem

Information collected automatically:
• Usage data — videos watched, products viewed, searches, likes, follows, purchases, and session length
• Device data — device model, operating system, app/browser version, language, time zone, IP address (used for region detection), and app instance identifiers for analytics
• On the web — we use essential cookies and browser storage to keep you signed in, remember your cart, your chosen FoodHub location, and your currency/language preferences. We do not use advertising or cross-site tracking cookies.
• Crash and performance reports so we can fix problems

Information from others:
• Payment confirmations from Paystack (we never receive or store your full card number or mobile money PIN)
• Delivery status updates from deliverers handling your orders`,
  },
  {
    title: '3. Camera, Microphone, Photos & Location',
    body: `Camera & microphone — used to record videos for content creation and live streaming, in the mobile app and in your web browser on crestarhq.com. We only access them when you explicitly start recording; never in the background. On the web, your browser will ask for permission first and shows an indicator while the camera is active.

Photo library / file uploads — accessed only when you choose to upload photos or videos for your profile, listings, or posts.

Location — precise location is used only while the app is open and only when you ask for it: when you tap "Use Current Location" for a delivery address, when you let FoodHub find restaurants near you, when a seller sets up delivery zones, or when a deliverer views an active delivery. Crestar does not collect your location in the background and does not track you when the app is closed or not in use.

You can revoke any of these permissions in your device or browser settings at any time. Revoking permissions may limit the related features but the rest of the app keeps working.`,
  },
  {
    title: '4. How We Use Your Information',
    body: `We use your information to:
• Operate the Platform — show your feed, process orders, coordinate deliveries, pay out earnings
• Verify identity for sellers and deliverers (Ghana Card verification data is used only for verification and compliance, and is never shared with other users)
• Personalize your experience — recommend videos, products, and sellers you're likely to enjoy
• Keep Crestar safe — detect fraud, enforce our Terms, protect buyers with escrow
• Communicate with you — order updates, delivery PINs, payout confirmations, and service announcements
• Improve the product — analytics on which features work and what needs fixing
• Meet legal obligations — including tax, accounting, and lawful requests from authorities

We do NOT sell your personal information, share it with data brokers, or track you across other companies' apps and websites for advertising.`,
  },
  {
    title: '5. How We Share Information',
    body: `We share information only where needed to run the service:

• With other users — your public profile (username, name, photo, bio, videos, products) is visible to everyone; buyers and sellers see each other's names and chat messages for their orders
• With deliverers — pickup and delivery addresses and contact numbers for their assigned orders only
• With payment processors — Paystack receives the details needed to process payments and payouts (transaction amount, payment method details, device information)
• With service providers — hosting, storage, and analytics providers who process data on our behalf under contract
• For legal reasons — when required by law, court order, or to protect the rights and safety of users and the public
• In a business transfer — if Crestar is acquired or merged, your data may transfer with the business under this same policy

Delivery addresses are shared only with the seller and assigned deliverer for your order — never publicly.`,
  },
  {
    title: '6. Push Notifications',
    body: `We only send service (transactional) notifications:
• Order & delivery updates — order confirmations, delivery status, delivery PINs, and payment receipts
• Messages — chat messages from buyers, sellers, deliverers, and Crestar Support
• Account activity — new followers, likes on your content, payout confirmations, and security alerts

We do not send marketing or promotional push notifications. If we ever introduce them, they will be strictly opt-in: we will ask for your explicit consent first, and you will be able to turn them off at any time in the app without affecting your order and delivery alerts.

You'll be asked for notification permission when you first need it, and you can turn notifications off any time in your device settings. Delivery/open metrics are used only to improve our messaging and are not shared with third parties.`,
  },
  {
    title: '7. Your Choices & Rights',
    body: `You are in control of your data:

• Edit — change your name, username, bio, and photo any time in Manage account
• Delete content — remove your videos, comments, and listings whenever you want
• Delete your account — Settings → Delete Account removes your profile and personal data (complete or cancel open orders and withdraw wallet funds first)
• Permissions — control camera, microphone, photos, location, and notifications in device settings

Depending on where you live, you may also have legal rights to access, correct, port, or erase your data, and to object to or restrict certain processing. Contact us via Support to exercise any of these — we respond to all verified requests within 30 days.`,
  },
  {
    title: '8. Data Retention',
    body: `We keep your data only as long as needed:

• Account data — for as long as your account exists; profile data is deleted within 30 days of account deletion
• Orders & transactions — retained after account deletion where required for tax, accounting, fraud prevention, and dispute resolution (up to 7 years for financial records)
• Location history — deleted after 90 days
• Messages — until either participant deletes their account, subject to the financial-record exception above
• Deleted content — removed from public view immediately; residual backup copies are purged on a rolling basis (up to 90 days)`,
  },
  {
    title: '9. Security',
    body: `We protect your data with:
• Encryption in transit (HTTPS/TLS) for all connections
• Encrypted password storage — we never see or store your plain-text password
• Secure on-device token storage (iOS Keychain / Android Keystore)
• Escrow-protected payments processed by PCI-DSS-compliant Paystack
• Access controls limiting which systems and staff can access personal data

No system is 100% secure. If we ever discover a breach affecting your personal data, we will notify you and the relevant authorities as required by law.`,
  },
  {
    title: '10. Children',
    body: `Crestar is not intended for users under 18, and we do not knowingly collect personal information from children. If you believe a child is using Crestar, report it via Support and we will investigate and remove the account where appropriate.`,
  },
  {
    title: '11. International Transfers',
    body: `Crestar serves users across Africa and beyond. Your information may be processed on servers located outside your country. Wherever your data goes, it stays protected under this policy and appropriate safeguards.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this policy as Crestar grows or as laws change. For material changes, we'll notify you in the app before they take effect. The "Last updated" date at the top always tells you when the policy was last revised.`,
  },
  {
    title: '13. Contact Us',
    body: `For privacy questions, data requests, or concerns, reach a real person:

• Email (privacy & data requests): ${PRIVACY_EMAIL}
• Email (general support): ${SUPPORT_EMAIL}
• In-app: Settings → Support & About → Report a problem
• The support chat in your profile

We reply to every verified request within 30 days.

Your trust is what makes Crestar work. Thank you for it.`,
  },
];

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Privacy Policy</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 14, marginBottom: 24 }}>
          Last updated: {LAST_UPDATED}
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 12,
              }}
            >
              {section.title}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                lineHeight: 24,
              }}
            >
              {section.body}
            </Text>
          </View>
        ))}

        <View
          style={{
            backgroundColor: colors.cardBackground,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            For privacy-related questions or to exercise your rights, email us or use the in-app
            support chat.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${PRIVACY_EMAIL}`)}
            style={{ marginTop: 10 }}
          >
            <Text
              style={{
                color: '#D4AF37',
                fontSize: 15,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {PRIVACY_EMAIL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            style={{ marginTop: 6 }}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {SUPPORT_EMAIL}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
