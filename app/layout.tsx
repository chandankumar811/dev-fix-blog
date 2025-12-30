import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "DevFixPro – Fix Real Backend & Frontend Errors",
    template: "%s | DevFixPro",
  },
  description:
    "Fix real NestJS, Node.js, React, Next.js, MongoDB errors with production-ready solutions.",
  verification: {
    google: "XtdqrTFUvoeF70ev72xJRYt6zspcZ3MY1MIlRMiLeQg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
