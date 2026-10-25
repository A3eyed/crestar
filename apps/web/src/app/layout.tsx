import './global.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import CurrencyRateRefresher from '@/components/CurrencyRateRefresher';
import PostStatusToast from '@/components/PostStatusToast';

const SITE_URL = 'https://crestarhq.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Brand-first: "Crestar" alone should surface the product without needing Ghana/Africa
    default: 'Crestar | Shop Sell and Live Commerce',
    template: '%s | Crestar',
  },
  description:
    'Crestar is the social commerce platform to shop, sell, and go live. Discover products, video shopping, FoodHub, and seller tools at crestarhq.com. Crestar HQ marketplace app for buyers and sellers worldwide.',
  keywords: [
    'Crestar',
    'Crestar HQ',
    'crestarhq',
    'crestarhq.com',
    'Crestar app',
    'Crestar marketplace',
    'Crestar shopping',
    'Crestar online shopping',
    'Crestar social commerce',
    'Crestar live',
    'Crestar FoodHub',
    'Abdallah Fuseini',
    'Abdallah Fuseini Crestar',
    'Crestar founder',
    'shop online',
    'online shopping',
    'buy online',
    'sell online',
    'online marketplace',
    'ecommerce',
    'social commerce',
    'live shopping',
    'video shopping',
    'live commerce',
    'shopping app',
    'marketplace app',
    'Crestar Ghana',
    'Crestar Africa',
    'online shopping Ghana',
    'shop online Ghana',
    'Africa marketplace',
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
    title: 'Crestar | Shop Sell and Live Commerce',
    description:
      'Shop, sell, and go live on Crestar. Social commerce marketplace at crestarhq.com.',
    url: SITE_URL,
    locale: 'en_US',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Crestar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crestar',
    description: 'Shop, sell, and live commerce on Crestar.',
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
      alternateName: ['Crestar HQ', 'crestarhq', 'Crestar App', 'Crestar Marketplace'],
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
      description:
        'Crestar is a social commerce platform for shopping, selling, live video, and FoodHub. Official site: crestarhq.com.',
      founder: {
        '@type': 'Person',
        name: 'Abdallah Fuseini',
      },
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
      alternateName: ['Crestar HQ', 'Crestar Marketplace', 'crestarhq.com'],
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
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
      alternateName: ['Crestar HQ', 'Crestar App'],
      applicationCategory: 'ShoppingApplication',
      operatingSystem: 'Web, iOS, Android',
      url: SITE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Crestar app for shopping, selling, and live commerce. Official website crestarhq.com.',
    },
    {
      '@type': 'Person',
      name: 'Abdallah Fuseini',
      jobTitle: 'Founder',
      worksFor: { '@id': `${SITE_URL}/#organization` },
      description: 'Abdallah Fuseini is the founder of Crestar.',
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
