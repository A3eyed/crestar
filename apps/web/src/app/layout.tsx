import './global.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import CurrencyRateRefresher from '@/components/CurrencyRateRefresher';
import PostStatusToast from '@/components/PostStatusToast';

const SITE_URL = 'https://crestarhq.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Crestar — Shop, Create, Earn Together | Social Commerce',
    template: '%s | Crestar',
  },
  description:
    'Crestar (crestarhq.com) is the social commerce platform for Ghana and Africa. Buy and sell products through short videos and live shopping, connect with verified sellers, order food, pay with mobile money, and earn from your content with affiliate commissions.',
  keywords: [
    'Crestar',
    'Crestar HQ',
    'crestarhq',
    'crestarhq.com',
    'Crestar Ghana',
    'Crestar app',
    'Crestar marketplace',
    'Crestar social commerce',
    'social commerce Ghana',
    'social commerce Africa',
    'live shopping Ghana',
    'video shopping',
    'sell online Ghana',
    'buy online Ghana',
    'online marketplace Ghana',
    'mobile money shopping',
    'MoMo shopping',
    'food delivery Ghana',
    'creator earnings',
    'affiliate commission',
    'live commerce',
    'shop through video',
  ],
  applicationName: 'Crestar',
  authors: [{ name: 'Crestar', url: SITE_URL }],
  creator: 'Crestar',
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
    title: 'Crestar — Shop, Create, Earn Together',
    description:
      'Crestar is social commerce for Ghana and Africa. Buy and sell through live video, connect with verified sellers, and earn from your content.',
    url: SITE_URL,
    locale: 'en_GH',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Crestar — Shop, Create, Earn Together',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crestar — Shop, Create, Earn Together',
    description:
      'Buy and sell through live video, connect with sellers, and earn from your content on Crestar.',
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
    // Add Google Search Console verification token here when available:
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
      alternateName: ['Crestar HQ', 'crestarhq'],
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
      description:
        'Crestar is the social commerce platform built for Ghana and Africa — buy and sell through short videos and live shopping, order food, pay with mobile money, and earn from your content.',
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
      alternateName: 'Crestar — Shop, Create, Earn Together',
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
        'Social commerce app to shop through video, sell products, go live, and earn affiliate commissions in Ghana and across Africa.',
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
