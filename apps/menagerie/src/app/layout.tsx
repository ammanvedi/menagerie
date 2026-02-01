import type { Metadata } from "next"
import { Nunito_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Menagerie",
  description: "Agent dispatch and management platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={nunitoSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
