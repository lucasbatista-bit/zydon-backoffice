import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zydon Backoffice",
  description: "Sistema de Gestão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${inter.className} flex`}>
        
        {/* === MENU LATERAL (SIDEBAR) === */}
        <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0 overflow-y-auto">
          <div className="mb-8 p-2">
            <h1 className="text-2xl font-bold text-blue-400">Zydon ERP</h1>
            <p className="text-xs text-slate-400">Backoffice do Gestor</p>
          </div>

          <nav className="flex-1 space-y-2">
            <Link href="/" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 transition">
              📊 <span>Dashboard</span>
            </Link>
            <Link href="/estoque" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 transition">
              📦 <span>Estoque</span>
            </Link>
            <Link href="/pedidos" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 transition">
              🛒 <span>Pedidos</span>
            </Link>
          </nav>

          <div className="mt-auto border-t border-slate-700 pt-4">
            <p className="text-sm">Lucas Admin</p>
            <p className="text-xs text-green-400">● Online</p>
          </div>
        </aside>

        {/* === CONTEÚDO DA PÁGINA === */}
        {/* Adicionei 'ml-64' para o conteúdo não ficar escondido atrás do menu */}
        <div className="flex-1 ml-64 bg-gray-50 min-h-screen">
          {children}
        </div>

      </body>
    </html>
  );
}