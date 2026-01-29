import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white h-screen p-4 fixed left-0 top-0">
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
        
        {/* --- NOVO BOTÃO AQUI --- */}
        <Link href="/importar" className="p-3 hover:bg-slate-800 rounded transition-colors block text-yellow-400">
          📥 Importar XML/CSV
        </Link>

      </nav>
    </aside>
  );
}