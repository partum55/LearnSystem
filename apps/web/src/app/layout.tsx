import type { Metadata } from 'next';
import '../index.css';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'Learning Management System',
  description: 'Learning Management System frontend',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
