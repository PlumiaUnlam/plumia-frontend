import type { Metadata } from "next"
import localFont from "next/font/local"

import { cn } from "@/lib/utils"

import "./globals.css"
import { Providers } from "./providers"

const poppins = localFont({
  src: [
    { path: "../public/fonts/editor/poppins.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/editor/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/editor/poppins-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
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
