import './global.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import CurrencyRateRefresher from '@/components/CurrencyRateRefresher';
import PostStatusToast from '@/components/PostStatusToast';

const SITE_URL = 'https://crestarhq.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      'Crestar — Online Shopping in Ghana & Africa | Buy, Sell & Shop Online',
    template: '%s | Crestar',
  },
  description:
    'Crestar is an online shopping and social commerce platform for Ghana and Africa. Shop online, buy and sell products, live shopping, video commerce, food delivery, and mobile money payments. Founded by Abdallah Fuseini. Discover Crestar HQ (crestarhq.com) — the marketplace to buy online and sell online across Africa.',
  keywords: [
    // Brand
    'Crestar',
    'Crestar HQ',
    'crestarhq',
    'crestarhq.com',
    'Crestar Ghana',
    'Crestar Africa',
    'Crestar app',
    'Crestar marketplace',
    'Crestar shopping',
    'Crestar online shopping',
    'Crestar social commerce',
    // Founder
    'Abdallah Fuseini',
    'Abdallah Fuseini Crestar',
    'Crestar founder',
    // Core shopping intent
    'shopping',
    'shop online',
    'online shopping',
    'buy online',
    'sell online',
    'online store',
    'online marketplace',
    'ecommerce',
    'e-commerce',
    'online shop',
    'digital marketplace',
    'marketplace app',
    // Ghana / Africa
    'shopping Ghana',
    'online shopping Ghana',
    'shop online Ghana',
    'buy online Ghana',
    'sell online Ghana',
    'Ghana marketplace',
    'Ghana online store',
    'Ghana ecommerce',
    'Africa shopping',
    'online shopping Africa',
    'shop online Africa',
    'buy online Africa',
    'sell online Africa',
    'Africa marketplace',
    'African ecommerce',
    'West Africa shopping',
    'Accra online shopping',
    // Platform types searchers use
    'shopping platforms',
    'Ghana shopping platforms',
    'Africa shopping platforms',
    'online shopping platforms',
    'best online shopping Ghana',
    'best marketplace Ghana',
    'shopping apps Ghana',
    'shopping apps Africa',
    // Social / live commerce
    'social commerce',
    'social commerce Ghana',
    'social commerce Africa',
    'live shopping',
    'live shopping Ghana',
    'video shopping',
    'shop through video',
    'live commerce',
    'live selling',
    // Payments & local
    'mobile money shopping',
    'MoMo shopping',
    'pay with mobile money',
    'MTN MoMo shopping',
    // Categories people shop for
    'food delivery Ghana',
    'buy food online Ghana',
    'fashion online Ghana',
    'electronics online Ghana',
    'products for sale Ghana',
    // Creator / seller side
    'sell products online',
    'start selling online Ghana',
    'creator earnings',
    'affiliate commission',
    'earn from content',
    'become a seller',
  ],
  applicationName: 'Crestar',
  authors: [
    { name: 'Crestar', url: SITE_URL },
    { name: 'Abdallah Fuseini' },
  ],
  creator: 'Abdallah Fuseini',
  publisher: 'Crestar',
  category: 'shopping',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Crestar',
    title: 'Crestar — Online Shopping in Ghana & Africa | Buy & Sell Online',
    description:
      'Shop online on Crestar — Ghana and Africa’s social commerce marketplace. Buy online, sell online, live shopping, and mobile money. Built by Abdallah Fuseini.',
    url: SITE_URL,
    locale: 'en_GH',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Crestar — Shop online in Ghana and Africa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crestar — Online Shopping in Ghana & Africa',
    description:
      'Buy online, sell online, and shop through live video on Crestar. The shopping platform for Ghana and Africa.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    // Add Google Search Console token when available:
    // google: 'your-google-site-verification-token',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Crestar',
      alternateName: ['Crestar HQ', 'crestarhq', 'Crestar Ghana'],
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
      description:
        'Crestar is an online shopping and social commerce platform for Ghana and Africa. Buy online, sell online, live shopping, video commerce, and mobile money payments.',
      founder: {
        '@type': 'Person',
        name: 'Abdallah Fuseini',
      },
      foundingLocation: {
        '@type': 'Place',
        name: 'Ghana',
      },
      areaServed: [
        { '@type': 'Country', name: 'Ghana' },
        { '@type': 'Continent', name: 'Africa' },
      ],
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: ['English'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Crestar',
      alternateName: [
        'Crestar — Online Shopping Ghana',
        'Crestar Marketplace',
        'Crestar HQ',
      ],
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-GH',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Crestar',
      applicationCategory: 'ShoppingApplication',
      operatingSystem: 'Web, iOS, Android',
      url: SITE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GHS',
      },
      description:
        'Online shopping app for Ghana and Africa. Buy online, sell online, live shopping, and earn with affiliate commissions on Crestar.',
    },
    {
      '@type': 'Person',
      name: 'Abdallah Fuseini',
      jobTitle: 'Founder',
      worksFor: { '@id': `${SITE_URL}/#organization` },
      description:
        'Abdallah Fuseini is the founder of Crestar, the social commerce and online shopping platform for Ghana and Africa.',
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={SITE_URL} />
      </head>
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>
          <CurrencyRateRefresher />
          {children}
          <PostStatusToast />
        </Providers>
      </body>
    </html>
  );
}
