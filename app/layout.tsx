import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { BRAND } from '@/lib/brand';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

// Plus Jakarta Sans gives headings (font-display) a more modern, geometric
// personality while Inter stays the workhorse for body/UI text.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: BRAND.product,
  description:
    'Enterprise-grade HR Operating System and Applicant Tracking System for the complete employee lifecycle.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: '{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://signalor.ai/#organization","name":"Signalor","url":"https://signalor.ai/"},{"@type":"WebSite","@id":"https://signalor.ai/#website","name":"Signalor","url":"https://signalor.ai/","publisher":{"@id":"https://signalor.ai/#organization"}}]}' }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
