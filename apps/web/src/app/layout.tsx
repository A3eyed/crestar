import './global.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import CurrencyRateRefresher from '@/components/CurrencyRateRefresher';

export const metadata = {
  metadataBase: new URL('https://crestar.created.app'),
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
        url: '/favicon.png',
        width: 512,
        height: 512,
        alt: 'Crestar — social commerce platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crestar — Shop, Create, Earn Together',
    description:
      'Buy and sell through live video, connect with sellers, and earn from your content on Crestar.',
    images: ['/favicon.png'],
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

// JSON-LD structured data — helps search engines understand and rank Crestar
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://crestar.created.app/#organization',
      name: 'Crestar',
      url: 'https://crestar.created.app',
      logo: 'https://crestar.created.app/favicon.png',
      description:
        'Crestar is the social commerce platform built for Africa and beyond — buy and sell through short videos and live shopping, order food, and earn from your content.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://crestar.created.app/#website',
      name: 'Crestar',
      alternateName: 'Crestar — Shop, Create, Earn Together',
      url: 'https://crestar.created.app',
      publisher: { '@id': 'https://crestar.created.app/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://crestar.created.app/shop?q={search_term_string}',
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
