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
  metadataBase: new URL("https://circle.optiminastic.com"),
  alternates: { canonical: "/" },
  title: BRAND.product,
  description:
    'Enterprise-grade HR Operating System and Applicant Tracking System for the complete employee lifecycle.',
  authors: [{ name: 'Optiminastic Team', url: 'https://optiminastic.com' }],
  other: {
    'author': 'Optiminastic Team',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://circle.optiminastic.com/#organization",
                "name": "Optiminastic",
                "url": "https://circle.optiminastic.com/",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://circle.optiminastic.com/optiminastic-logo.png"
                }
              },
              {
                "@type": "WebSite",
                "@id": "https://circle.optiminastic.com/#website",
                "name": "Optiminastic",
                "url": "https://circle.optiminastic.com/",
                "publisher": {
                  "@id": "https://circle.optiminastic.com/#organization"
                },
                "author": {
                  "@type": "Organization",
                  "name": "Optiminastic Team",
                  "url": "https://optiminastic.com"
                }
              },
              {
                "@type": "WebApplication",
                "@id": "https://circle.optiminastic.com/#webapp",
                "name": "Circle",
                "url": "https://circle.optiminastic.com/",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "description": "Enterprise-grade HR Operating System and Applicant Tracking System for the complete employee lifecycle.",
                "author": {
                  "@type": "Organization",
                  "name": "Optiminastic Team",
                  "url": "https://optiminastic.com"
                },
                "provider": {
                  "@id": "https://circle.optiminastic.com/#organization"
                }
              }
            ]
          }) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
