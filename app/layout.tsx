import type { Metadata } from "next"
import localFont from "next/font/local"

import { cn } from "@/lib/utils"

import "./globals.css"
import "./editor-fonts.css"
import { Providers } from "./providers"

const poppins = localFont({
  src: "../public/fonts/editor/poppins.woff2",
  variable: "--font-sans",
  weight: "400",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "PlumIA",
    template: "%s | PlumIA",
  },
  description: "PlumIA writing workspace",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", poppins.variable, "font-sans")}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
