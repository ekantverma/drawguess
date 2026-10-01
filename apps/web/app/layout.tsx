import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'DrawGuess - draw it, guess it', template: '%s · DrawGuess' },
  description:
    'A free real-time multiplayer drawing and guessing game. Make a room, share the code, and start doodling with friends.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3a5bf0' };

// Runs before paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('drawguess:theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
