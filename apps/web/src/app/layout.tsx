import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../index.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'LearnSystem',
  description: 'Canonical LearnSystem frontend',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
