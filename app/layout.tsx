import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/layout/SideBar"; // Assure-toi que c'est bien SideBar ou Sidebar selon ce que tu avais corrigé
import GlobalHeader from "./components/layout/GlobalHeader"; // <-- Importation

export const metadata: Metadata = {
  title: "PitCrew P1 - SaaS",
  description: "Advanced Pit Wall Strategy Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-[#0B0C10] text-white flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Remplacement par notre nouveau Header Dynamique */}
          <GlobalHeader />

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}