import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { BRAND } from '@/lib/brand';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * General Sans (Fontshare) — the geometric grotesque used for headings and the
 * small uppercase eyebrow/label text. Self-hosted rather than pulled from
 * Fontshare's CDN: offer letters are rasterised by html2canvas-pro straight
 * from painted DOM, and a CDN font can lose that race and bake a fallback face
 * into a generated PDF.
 *
 * Only 500/600/700 exist — the family has no 800. Anything asking for heavier
 * resolves to 700 rather than a synthesised faux-bold.
 */
const generalSans = localFont({
  src: [
    { path: './fonts/GeneralSans-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/GeneralSans-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/GeneralSans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-general-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL("https://circle.optiminastic.com"),
  alternates: { canonical: "/" },
  title: BRAND.product,
  description:
    'Enterprise-grade HR Operating System and Applicant Tracking System for the complete employee lifecycle.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${generalSans.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {/* Applies the saved color palette before first paint (next-themes does
            the equivalent for dark/light on its own) — avoids a flash back to
            the default "raspberry" palette on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var p=localStorage.getItem('curcle-palette');if(p)document.documentElement.setAttribute('data-palette',p);}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: '{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://circle.optiminastic.com/#organization","name":"Optiminastic","url":"https://circle.optiminastic.com/"},{"@type":"WebSite","@id":"https://circle.optiminastic.com/#website","name":"Optiminastic","url":"https://circle.optiminastic.com/","publisher":{"@id":"https://circle.optiminastic.com/#organization"}}]}' }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
