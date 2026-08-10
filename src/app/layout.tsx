import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/locale';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Carrier CRM · Freight Procurement',
  description: 'Browse, filter, and vet trucking carrier companies for freight procurement.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Read the persisted locale from a cookie (not localStorage) so the server renders the same
  // language the client will — otherwise the first client render disagrees with the server-
  // rendered HTML and React throws a hydration-mismatch error the moment locale != 'en'.
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const initialLocale: Locale = stored === 'cs' ? 'cs' : 'en';

  return (
    <html lang={initialLocale} className={inter.variable}>
      <body>
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
