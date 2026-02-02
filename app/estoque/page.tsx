'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import ImportarNfe from "@/components/ImportarNfe";

export default function Estoque() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");

  function preencherComDadosDaNota(dados: any) {
    setNovoNome(dados.nome);
    setNovoPreco(dados.preco);
  }

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
    setProdutos(data || []);
  }

  async function salvarProduto() {
    if (!novoNome || !novoPreco) return alert("Preencha nome e preço!");

    const { error } = await supabase.from('produtos').insert({
      nome: novoNome,
      preco: parseFloat(novoPreco.toString().replace(',', '.')),
      estoque: parseInt(novoEstoque) || 0
    });

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setNovoNome("");
      setNovoPreco("");
      setNovoEstoque("");
      carregarProdutos();
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const produtosFiltrados = produtos.filter(produto => 
    produto.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Controle de Estoque</h1>

        {/* ÁREA DE CADASTRO */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8 flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 border-r border-gray-100 pr-6">
                <ImportarNfe aoLerNota={preencherComDadosDaNota} />
            </div>
            <div className="md:w-2/3 grid gap-4">
                <input type="text" placeholder="Nome do Produto" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="border p-2 rounded" />
                <div className="flex gap-4">
                    <input type="text" placeholder="Preço" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} className="border p-2 rounded w-1/2" />
                    <input type="number" placeholder="Qtd" value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} className="border p-2 rounded w-1/2" />
                    <button onClick={salvarProduto} className="bg-blue-600 text-white px-6 rounded font-bold">+</button>
                </div>
            </div>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="mb-4 relative">
                <span className="absolute left-3 top-2">🔍</span>
                <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="border pl-10 p-2 rounded w-full" />
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                    <tr><th className="p-4">Produto</th><th className="p-4">Preço</th><th className="p-4">Estoque</th></tr>
                </thead>
                <tbody>
                    {produtosFiltrados.map(p => (
                        <tr key={p.id} className="border-b">
                            <td className="p-4">{p.nome}</td>
                            <td className="p-4 text-blue-600">R$ {p.preco}</td>
                            <td className="p-4">{p.estoque} un</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </main>
    </div>
  );
}