'use client' // Importante para o botão funcionar
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut(); // Avisa o Supabase que saiu
    router.push('/login'); // Manda de volta pra tela de login
    router.refresh();
  }

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen p-4 fixed left-0 top-0 flex flex-col justify-between">
      {/* Parte de Cima: Logo e Menu */}
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-400">Zydon</h1>
          <p className="text-xs text-gray-400">Backoffice v1.0</p>
        </div>
        
        <nav className="flex flex-col gap-2">
          <Link href="/" className="p-3 hover:bg-slate-800 rounded transition-colors block">
            📊 Dashboard
          </Link>
          <Link href="/estoque" className="p-3 hover:bg-slate-800 rounded transition-colors block">
            📦 Estoque
          </Link>
          <Link href="/pedidos" className="p-3 hover:bg-slate-800 rounded transition-colors block">
            🛒 Pedidos
          </Link>
          <Link href="/financeiro" className="p-3 hover:bg-slate-800 rounded transition-colors block">
            💰 Financeiro
          </Link>
          <Link href="/clientes" className="p-3 hover:bg-slate-800 rounded transition-colors block border-l-4 border-transparent hover:border-purple-500">
           👥 Clientes
          </Link>
        </nav>
      </div>

      {/* Parte de Baixo: Botão Sair */}
      <button 
        onClick={handleLogout}
        className="p-3 bg-red-900/50 hover:bg-red-800 text-red-200 rounded transition-colors text-left w-full flex items-center gap-2"
      >
        🚪 Sair do Sistema
      </button>
    </aside>
  );
}