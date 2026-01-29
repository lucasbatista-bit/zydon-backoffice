'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Home() {
  // Variáveis para guardar os números do painel
  const [saldo, setSaldo] = useState(0);
  const [qtdPedidos, setQtdPedidos] = useState(0);
  const [qtdProdutos, setQtdProdutos] = useState(0);
  const [status, setStatus] = useState("🟡 Calculando indicadores...");

  useEffect(() => {
    async function carregarDashboard() {
      try {
        // 1. Busca Saldo (Cálculo igual ao da página Financeiro)
        const { data: financeiro } = await supabase.from('financeiro').select('*');
        if (financeiro) {
          const total = financeiro.reduce((acc, item) => {
            return item.tipo === 'entrada' ? acc + item.valor : acc - item.valor;
          }, 0);
          setSaldo(total);
        }

        // 2. Busca Quantidade de Pedidos
        const { count: totalPedidos } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
        setQtdPedidos(totalPedidos || 0);

        // 3. Busca Quantidade de Produtos
        const { count: totalProdutos } = await supabase.from('produtos').select('*', { count: 'exact', head: true });
        setQtdProdutos(totalProdutos || 0);

        setStatus("🟢 Dados atualizados em tempo real.");
      } catch (error) {
        setStatus("🔴 Erro ao carregar dados.");
      }
    }

    carregarDashboard();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Visão Geral</h1>
          <p className="text-gray-500 text-sm mt-1">{status}</p>
        </header>

        {/* --- OS CARDS (INDICADORES) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Card Financeiro */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase">Saldo em Caixa</h3>
            <p className={`text-3xl font-bold mt-2 ${saldo >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
              R$ {saldo.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-2">Atualizado agora</p>
          </div>

          {/* Card Pedidos */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase">Vendas Realizadas</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{qtdPedidos}</p>
            <p className="text-xs text-gray-400 mt-2">Pedidos totais no sistema</p>
          </div>

          {/* Card Estoque */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase">Produtos Ativos</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{qtdProdutos}</p>
            <p className="text-xs text-gray-400 mt-2">Itens no catálogo</p>
          </div>

        </div>

        {/* Área de Atalhos Rápidos */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/pedidos" className="block p-6 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition">
                <span className="text-2xl">🛒</span>
                <span className="ml-3 font-bold text-blue-800">Nova Venda</span>
                <p className="text-sm text-blue-600 mt-1 ml-9">Registrar saída de mercadoria</p>
            </a>
            <a href="/estoque" className="block p-6 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition">
                <span className="text-2xl">📦</span>
                <span className="ml-3 font-bold text-green-800">Cadastrar Produto</span>
                <p className="text-sm text-green-600 mt-1 ml-9">Adicionar item ao estoque</p>
            </a>
        </div>

      </main>
    </div>
  );
}