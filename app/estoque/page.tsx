'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Estoque() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");

  // Função para buscar produtos (igual fizemos na Home)
  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
    setProdutos(data || []);
  }

  // Função para SALVAR um novo produto
  async function salvarProduto() {
    if (!novoNome || !novoPreco) return alert("Preencha nome e preço!");

    const { error } = await supabase.from('produtos').insert({
      nome: novoNome,
      preco: parseFloat(novoPreco.replace(',', '.')), // Troca vírgula por ponto
      estoque: parseInt(novoEstoque) || 0
    });

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Produto cadastrado!");
      setNovoNome(""); // Limpa os campos
      setNovoPreco("");
      setNovoEstoque("");
      carregarProdutos(); // Recarrega a lista para mostrar o novo item
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Controle de Estoque</h1>

        {/* --- FORMULÁRIO DE CADASTRO --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-700">Novo Produto</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600">Nome do Produto</label>
              <input 
                type="text" 
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full border p-2 rounded outline-blue-500" 
                placeholder="Ex: Mouse Sem Fio"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-600">Preço (R$)</label>
              <input 
                type="text" 
                value={novoPreco}
                onChange={(e) => setNovoPreco(e.target.value)}
                className="w-full border p-2 rounded outline-blue-500" 
                placeholder="0,00"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm text-gray-600">Estoque</label>
              <input 
                type="number" 
                value={novoEstoque}
                onChange={(e) => setNovoEstoque(e.target.value)}
                className="w-full border p-2 rounded outline-blue-500" 
                placeholder="0"
              />
            </div>
            <button 
              onClick={salvarProduto}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
            >
              SALVAR
            </button>
          </div>
        </div>

        {/* --- LISTAGEM DE PRODUTOS --- */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 text-gray-600">Produto</th>
                <th className="p-4 text-gray-600">Preço</th>
                <th className="p-4 text-gray-600">Estoque</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{produto.nome}</td>
                  <td className="p-4 text-blue-600 font-bold">R$ {produto.preco}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${produto.estoque > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {produto.estoque} un
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}