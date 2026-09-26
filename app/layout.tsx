import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Riznex Digital Solutions | Restaurant Digital Management & Reporting',
  description: 'Professional restaurant analytics and digital management platform for UK restaurants.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden w-full max-w-full bg-[#07080B]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
