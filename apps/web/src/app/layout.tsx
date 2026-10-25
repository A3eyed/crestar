import './global.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import CurrencyRateRefresher from '@/components/CurrencyRateRefresher';
import PostStatusToast from '@/components/PostStatusToast';

const SITE_URL = 'https://crestarhq.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Crestar | Shop Sell Create Earn',
    template: '%s | Crestar',
  },
  description:
    'Crestar is the platform to shop, sell, create, and earn. Products, video shopping, FoodHub, and seller tools at crestarhq.com.',
  keywords: [
    'Crestar',
    'crestarhq',
    'crestarhq.com',
    'Crestar app',
    'Shop Sell Create Earn',
    'Crestar shopping',
    'Crestar marketplace',
    'Crestar social commerce',
    'Abdallah Fuseini',
    'shop online',
    'sell online',
    'create and earn',
    'live shopping',
    'video shopping',
    'social commerce',
    'marketplace app',
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
    title: 'Crestar | Shop Sell Create Earn',
    description:
      'Shop, sell, create, and earn on Crestar. Official site crestarhq.com.',
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
    description: 'Shop, sell, create, and earn on Crestar.',
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
      alternateName: ['Shop', 'Sell', 'Create', 'Earn'],
      slogan: 'Shop. Sell. Create. Earn.',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
      description:
        'Crestar is the platform to shop, sell, create, and earn. Official site: crestarhq.com.',
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
      alternateName: ['Shop', 'Sell', 'Create', 'Earn'],
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
      alternateName: ['Shop', 'Sell', 'Create', 'Earn'],
      applicationCategory: 'ShoppingApplication',
      operatingSystem: 'Web, iOS, Android',
      url: SITE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Crestar is the app to shop, sell, create, and earn. Official website crestarhq.com.',
      featureList: [
        'Shop products',
        'Sell online',
        'Create content',
        'Earn from sales and commissions',
        'Shoppable live',
        'FoodHub',
      ],
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
