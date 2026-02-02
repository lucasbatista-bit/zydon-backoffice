'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import ImportarNfe from "@/components/ImportarNfe";
// REMOVEMOS A IMPORTAÇÃO DOS ÍCONES QUE ESTAVA DANDO ERRO

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState(""); 
  
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");

  function preencherComDadosDaNota(dados) {
    console.log("Recebi da nota:", dados); 
    setNovoNome(dados.nome);
    setNovoPreco(dados.preco);
    document.getElementById("input-estoque")?.focus();
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Controle de Estoque</h1>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-4 py-1 rounded-full">
            Total: {produtos.length} produtos
          </span>
        </div>

        {/* --- CARD 1: CADASTRAR / IMPORTAR --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 border-r border-gray-100 pr-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Agilizar Cadastro
                </h2>
                <ImportarNfe aoLerNota={preencherComDadosDaNota} />
            </div>

            <div className="md:w-2/3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Dados do Produto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                        <input 
                            type="text" 
                            value={novoNome}
                            onChange={(e) => setNovoNome(e.target.value)}
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="Ex: Teclado Mecânico"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                        <input 
                            type="text" 
                            value={novoPreco}
                            onChange={(e) => setNovoPreco(e.target.value)}
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="0.00"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qtd.</label>
                        <input 
                            id="input-estoque"
                            type="number" 
                            value={novoEstoque}
                            onChange={(e) => setNovoEstoque(e.target.value)}
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="0"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <button 
                            onClick={salvarProduto}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg flex items-center justify-center transition shadow-md font-bold text-xl"
                            title="Salvar Produto"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* --- CARD 2: LISTA DE PRODUTOS --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">Seus Produtos</h2>
            <div className="relative">
                {/* Usamos emoji de lupa aqui */}
                <span className="absolute left-3 top-2 text-gray-400">🔍</span>
                <input 
                    type="text"
                    placeholder="Buscar produto..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="border border-gray-300 rounded-lg pl-10 pr-4 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-500"
                />
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Produto</th>
                <th className="p-4 font-semibold">Preço Unit.</th>
                <th className="p-4 font-semibold text-center">Status Estoque</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produtosFiltrados.length > 0 ? (
                  produtosFiltrados.map((produto) => (
                    <tr key={produto.id} className="hover:bg-blue-50 transition duration-150">
                      <td className="p-4 text-gray-800 font-medium">{produto.nome}</td>
                      <td className="p-4 text-gray-600">
                        R$ {parseFloat(produto.preco).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            produto.estoque > 5 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : produto.estoque > 0 
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {produto.estoque} un
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-400 text-sm">
                        <button className="hover:text-blue-600 mr-3">Editar</button>
                        <button className="hover:text-red-600">Excluir</button>
                      </td>
                    </tr>
                  ))
              ) : (
                  <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                          Nenhum produto encontrado.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}