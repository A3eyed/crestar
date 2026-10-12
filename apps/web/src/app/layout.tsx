import './global.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import CurrencyRateRefresher from '@/components/CurrencyRateRefresher';

const SITE_URL = 'https://crestarhq.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Crestar — Shop, Create, Earn Together',
    template: '%s | Crestar',
  },
  description:
    'Crestar is the social commerce platform built for Africa and beyond. Buy and sell products through short videos and live shopping, connect with verified sellers, order food, and earn from your content with affiliate commissions.',
  keywords: [
    'Crestar',
    'social commerce',
    'live shopping',
    'video shopping',
    'sell online Ghana',
    'buy online Africa',
    'food delivery',
    'creator earnings',
    'affiliate commission',
    'online marketplace',
    'mobile money shopping',
  ],
  applicationName: 'Crestar',
  authors: [{ name: 'Crestar' }],
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
      'The social commerce platform built for Africa and beyond. Buy and sell products through live video, connect with sellers, and earn from your content.',
    url: '/',
    locale: 'en_US',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Crestar logo',
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
    canonical: '/',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Crestar',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        'Crestar is the social commerce platform built for Africa and beyond — buy and sell through short videos and live shopping, order food, and earn from your content.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Crestar',
      alternateName: 'Crestar — Shop, Create, Earn Together',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>
          <CurrencyRateRefresher />
          {children}
        </Providers>
      </body>
    </html>
  );
}
