'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Dashboard() {
  // Estados para os Indicadores (KPIs)
  const [totalVendas, setTotalVendas] = useState(0);
  const [qtdPedidos, setQtdPedidos] = useState(0);
  const [qtdClientes, setQtdClientes] = useState(0);
  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState<any[]>([]);
  const [ultimosPedidos, setUltimosPedidos] = useState<any[]>([]);

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  async function carregarDadosDashboard() {
    // 1. Buscando Totais de Vendas e Pedidos
    const { data: pedidos } = await supabase.from('pedidos').select('valor_total');
    if (pedidos) {
        setQtdPedidos(pedidos.length);
        // Soma o total de vendas
        const total = pedidos.reduce((acc, pedido) => acc + (pedido.valor_total || 0), 0);
        setTotalVendas(total);
    }

    // 2. Buscando Quantidade de Clientes
    // 'count' retorna o número de linhas sem precisar baixar os dados todos
    const { count } = await supabase.from('Cliente').select('*', { count: 'exact', head: true });
    setQtdClientes(count || 0);

    // 3. Buscando Produtos com Estoque Crítico (Menor que 5 itens)
    const { data: produtosCriticos } = await supabase
        .from('produtos')
        .select('*')
        .lt('estoque', 5) // lt = less than (menor que)
        .limit(5); // Pega só os 5 primeiros para não lotar a tela
    setProdutosBaixoEstoque(produtosCriticos || []);

    // 4. Buscando os 5 Últimos Pedidos
    const { data: ultimos } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    setUltimosPedidos(ultimos || []);
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Visão Geral</h1>
        <p className="text-gray-500 mb-8">Bem-vindo ao painel de controle da Zydon.</p>

        {/* --- 1. CARTÕES DE INDICADORES (KPIs) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            
            {/* Faturamento Total */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-green-500">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Faturamento Total</div>
                <div className="text-2xl font-bold text-green-700">
                    R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
            </div>

            {/* Total de Pedidos */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-blue-500">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Vendas Realizadas</div>
                <div className="text-2xl font-bold text-gray-800">{qtdPedidos}</div>
            </div>

            {/* Total de Clientes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-purple-500">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Base de Clientes</div>
                <div className="text-2xl font-bold text-gray-800">{qtdClientes}</div>
            </div>

            {/* Alerta de Estoque */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-red-500">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Estoque Crítico</div>
                <div className="text-2xl font-bold text-red-600">
                    {produtosBaixoEstoque.length} <span className="text-sm text-gray-400 font-normal">produtos</span>
                </div>
            </div>
        </div>

        {/* --- 2. ÁREA DE DETALHES (Duas Colunas) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Últimas Vendas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    🛒 Últimas Vendas
                </h3>
                <div className="space-y-4">
                    {ultimosPedidos.length === 0 ? (
                        <p className="text-gray-400 text-sm">Nenhuma venda recente.</p>
                    ) : (
                        ultimosPedidos.map(pedido => (
                            <div key={pedido.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                                <div>
                                    <div className="font-bold text-sm text-gray-700">{pedido.cliente}</div>
                                    <div className="text-xs text-gray-500">{new Date(pedido.created_at).toLocaleDateString('pt-BR')}</div>
                                </div>
                                <div className="font-bold text-green-600 text-sm">
                                    R$ {(pedido.valor_total || 0).toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <a href="/pedidos" className="block mt-4 text-center text-blue-600 text-sm hover:underline">Ver histórico completo →</a>
            </div>

            {/* Alerta de Estoque Baixo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    ⚠️ Reposição Necessária
                </h3>
                <div className="space-y-4">
                    {produtosBaixoEstoque.length === 0 ? (
                        <p className="text-green-600 text-sm font-medium">✅ Todo o estoque está saudável!</p>
                    ) : (
                        produtosBaixoEstoque.map(prod => (
                            <div key={prod.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                                <div className="font-medium text-red-800 text-sm">{prod.nome}</div>
                                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-red-600 shadow-sm">
                                    Restam: {prod.estoque}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <a href="/estoque" className="block mt-4 text-center text-blue-600 text-sm hover:underline">Gerenciar estoque →</a>
            </div>

        </div>
      </main>
    </div>
  );
}