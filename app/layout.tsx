import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "TrackTheMoney - Solana Transaction Tracker",
  description: "Track Solana wallet transactions and visualize money flow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-1" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
