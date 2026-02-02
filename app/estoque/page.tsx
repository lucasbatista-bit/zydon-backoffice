'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import ImportarNfe from "@/components/ImportarNfe";

export default function Estoque() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [idEdicao, setIdEdicao] = useState<any>(null); // Guarda o ID se estivermos editando
  
  // Estados do formulário (incluindo os novos)
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");
  const [novoEan, setNovoEan] = useState("");
  const [novoSku, setNovoSku] = useState("");
  const [novoNcm, setNovoNcm] = useState("");

  // Função chamada pelo Leitor de XML
  function preencherComDadosDaNota(dados: any) {
    setNovoNome(dados.nome);
    setNovoPreco(dados.preco);
    setNovoEan(dados.ean === "SEM GTIN" ? "" : dados.ean); // Limpa se vier "SEM GTIN"
    setNovoNcm(dados.ncm);
    setNovoSku(dados.sku);
    document.getElementById("input-nome")?.focus();
  }

  // Buscar produtos do banco
  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
    setProdutos(data || []);
  }

  // --- FUNÇÃO SALVAR (Serve para CRIAR e EDITAR) ---
  async function salvarProduto() {
    if (!novoNome || !novoPreco) return alert("Preencha pelo menos nome e preço!");

    const dadosDoProduto = {
      nome: novoNome,
      preco: parseFloat(novoPreco.toString().replace(',', '.')),
      estoque: parseInt(novoEstoque) || 0,
      ean: novoEan,
      sku: novoSku,
      ncm: novoNcm
    };

    if (idEdicao) {
        // MODO EDIÇÃO: Atualiza o existente
        const { error } = await supabase.from('produtos').update(dadosDoProduto).eq('id', idEdicao);
        if (error) alert("Erro ao atualizar: " + error.message);
        else alert("Produto atualizado com sucesso!");
    } else {
        // MODO CRIAÇÃO: Cria um novo
        const { error } = await supabase.from('produtos').insert(dadosDoProduto);
        if (error) alert("Erro ao salvar: " + error.message);
        else alert("Produto cadastrado!");
    }

    limparFormulario();
    carregarProdutos();
  }

  // Prepara o formulário para edição
  function iniciarEdicao(produto: any) {
    setIdEdicao(produto.id);
    setNovoNome(produto.nome);
    setNovoPreco(produto.preco);
    setNovoEstoque(produto.estoque);
    setNovoEan(produto.ean || "");
    setNovoSku(produto.sku || "");
    setNovoNcm(produto.ncm || "");
    
    // Rola a tela para o topo do formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function excluirProduto(id: number) {
    if (confirm("Tem certeza que deseja excluir?")) {
        supabase.from('produtos').delete().eq('id', id).then(() => carregarProdutos());
    }
  }

  function limparFormulario() {
    setNovoNome("");
    setNovoPreco("");
    setNovoEstoque("");
    setNovoEan("");
    setNovoSku("");
    setNovoNcm("");
    setIdEdicao(null);
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const produtosFiltrados = produtos.filter(produto => 
    produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (produto.ean && produto.ean.includes(busca)) || // Busca também por EAN
    (produto.sku && produto.sku.includes(busca))    // Busca também por SKU
  );

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Controle de Estoque</h1>

        {/* --- ÁREA DE CADASTRO / EDIÇÃO --- */}
        <div className={`p-6 rounded-xl shadow-sm mb-8 border transition-all ${idEdicao ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          
          <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold uppercase tracking-wide ${idEdicao ? 'text-yellow-700' : 'text-gray-500'}`}>
                {idEdicao ? '✏️ Editando Produto' : '✨ Novo Produto'}
              </h2>
              {idEdicao && (
                  <button onClick={limparFormulario} className="text-sm text-red-600 hover:underline">
                      Cancelar Edição
                  </button>
              )}
          </div>

          <div className="flex flex-col xl:flex-row gap-8">
            {/* Leitor XML (Esquerda) */}
            {!idEdicao && (
                <div className="xl:w-1/4">
                    <ImportarNfe aoLerNota={preencherComDadosDaNota} />
                </div>
            )}

            {/* Formulário (Direita) */}
            <div className={idEdicao ? "w-full" : "xl:w-3/4"}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome do Produto</label>
                        <input id="input-nome" type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Monitor 24pol" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Preço (R$)</label>
                        <input type="text" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Estoque</label>
                        <input type="number" value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                    </div>
                </div>

                {/* Novos Campos */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">EAN (Cód. Barras)</label>
                        <input type="text" value={novoEan} onChange={e => setNovoEan(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="789..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">SKU (Cód. Interno)</label>
                        <input type="text" value={novoSku} onChange={e => setNovoSku(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="COD-001" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">NCM (Fiscal)</label>
                        <input type="text" value={novoNcm} onChange={e => setNovoNcm(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0000.00.00" />
                    </div>
                    <div>
                        <button 
                            onClick={salvarProduto} 
                            className={`w-full text-white font-bold py-2 px-4 rounded shadow-md transition transform active:scale-95 ${idEdicao ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {idEdicao ? '💾 SALVAR ALTERAÇÕES' : '+ CADASTRAR'}
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* --- LISTAGEM --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Lista de Produtos</h3>
                <input type="text" placeholder="🔍 Buscar por nome, EAN ou SKU..." value={busca} onChange={e => setBusca(e.target.value)} className="border p-2 pl-4 rounded-full text-sm w-72 focus:outline-blue-500" />
            </div>
            
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                    <tr>
                        <th className="p-4">Produto</th>
                        <th className="p-4">SKU / EAN</th>
                        <th className="p-4">Preço</th>
                        <th className="p-4 text-center">Estoque</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {produtosFiltrados.map(p => (
                        <tr key={p.id} className={`hover:bg-blue-50 transition ${p.estoque <= 0 ? 'bg-red-50' : ''}`}>
                            <td className="p-4 font-medium text-gray-800">
                                {p.nome}
                                <div className="text-xs text-gray-400 mt-1">NCM: {p.ncm || '-'}</div>
                            </td>
                            <td className="p-4 text-gray-500">
                                <div className="font-mono text-xs">SKU: {p.sku || '-'}</div>
                                <div className="font-mono text-xs text-gray-400">EAN: {p.ean || '-'}</div>
                            </td>
                            <td className="p-4 text-blue-700 font-bold">R$ {p.preco}</td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${p.estoque > 5 ? 'bg-green-100 text-green-700' : p.estoque > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    {p.estoque} un
                                </span>
                            </td>
                            <td className="p-4 text-right space-x-3">
                                <button onClick={() => iniciarEdicao(p)} className="text-blue-600 hover:text-blue-800 font-semibold hover:underline">Editar</button>
                                <button onClick={() => excluirProduto(p.id)} className="text-red-400 hover:text-red-600 hover:underline">Excluir</button>
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