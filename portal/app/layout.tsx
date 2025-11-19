import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import dynamic from 'next/dynamic'

const Providers = dynamic(() => import('./providers').then((mod) => mod.Providers), {
  ssr: false,
})

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hedge Fund Portal',
  description: 'DeFi Hedge Fund Management Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
