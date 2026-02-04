'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import ImportarNfe from "@/components/ImportarNfe";

export default function Estoque() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [idEdicao, setIdEdicao] = useState<any>(null);
  
  // Dados do Produto
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");
  const [novoEan, setNovoEan] = useState("");
  const [novoSku, setNovoSku] = useState("");
  const [novoNcm, setNovoNcm] = useState("");

  // Dados Financeiros da Nota (Para lançamento automático)
  const [lancarFinanceiro, setLancarFinanceiro] = useState(false);
  const [dadosFinanceiros, setDadosFinanceiros] = useState({
    valorTotal: 0,
    dataEmissao: "",
    numeroNota: ""
  });

  // Função chamada pelo Leitor de XML
  function preencherComDadosDaNota(dados: any) {
    setNovoNome(dados.nome);
    setNovoPreco(dados.preco);
    setNovoEan(dados.ean);
    setNovoNcm(dados.ncm);
    setNovoSku(dados.sku);
    
    // Sugere a quantidade da nota no campo de estoque
    setNovoEstoque(dados.quantidade.toString());

    // Prepara o financeiro
    setDadosFinanceiros({
        valorTotal: dados.valorTotalNota,
        dataEmissao: dados.dataEmissao,
        numeroNota: dados.numeroNota
    });
    setLancarFinanceiro(true); // Marca a caixinha automaticamente

    document.getElementById("input-nome")?.focus();
  }

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
    setProdutos(data || []);
  }

  async function salvarProduto() {
    if (!novoNome || !novoPreco) return alert("Preencha nome e preço!");

    const dadosDoProduto = {
      nome: novoNome,
      preco: parseFloat(novoPreco.toString().replace(',', '.')),
      estoque: parseInt(novoEstoque) || 0,
      ean: novoEan,
      sku: novoSku,
      ncm: novoNcm
    };

    // 1. SALVAR/ATUALIZAR PRODUTO
    if (idEdicao) {
        // Modo Edição: Atualiza
        const { error } = await supabase.from('produtos').update(dadosDoProduto).eq('id', idEdicao);
        if (error) alert("Erro produto: " + error.message);
        else alert("Produto atualizado!");
    } else {
        // Modo Criação: Novo
        const { error } = await supabase.from('produtos').insert(dadosDoProduto);
        if (error) alert("Erro produto: " + error.message);
        else alert("Produto cadastrado!");
    }

    // 2. LANÇAR NO FINANCEIRO (Se a caixinha estiver marcada)
    if (lancarFinanceiro && dadosFinanceiros.valorTotal > 0) {
        const descricaoFin = `Compra NF ${dadosFinanceiros.numeroNota} - ${novoNome}`; 
        
        // Define as datas
        // Data Entrada = Data da Emissão da Nota (ou Hoje se não tiver)
        // Data Vencimento = Igual à Entrada (Padrão "À vista", ajustável manualmente depois)
        const dataLancamento = dadosFinanceiros.dataEmissao || new Date().toISOString();

        const { error: erroFin } = await supabase.from('financeiro').insert({
            descricao: descricaoFin,
            valor: dadosFinanceiros.valorTotal,
            tipo: 'saida', // Despesa
            status: 'Pendente', // Novo campo: Status inicial
            categoria: 'Compra de Estoque', // Novo campo: Categoria fixa
            data_entrada: dataLancamento, // Novo campo: Data da Nota
            data_vencimento: dataLancamento // Novo campo: Vencimento (mesmo dia por padrão)
        });

        if (erroFin) {
            console.error(erroFin);
            alert("Atenção: Produto salvo, mas erro ao lançar financeiro: " + erroFin.message);
        } else {
            alert(`💰 Despesa de R$ ${dadosFinanceiros.valorTotal} lançada no Financeiro (Pendente)!`);
        }
    }

    limparFormulario();
    carregarProdutos();
  }

  function iniciarEdicao(produto: any) {
    setIdEdicao(produto.id);
    setNovoNome(produto.nome);
    setNovoPreco(produto.preco);
    setNovoEstoque(produto.estoque);
    setNovoEan(produto.ean || "");
    setNovoSku(produto.sku || "");
    setNovoNcm(produto.ncm || "");
    
    // Ao editar manual, desmarcamos financeiro pra evitar duplicidade
    setLancarFinanceiro(false);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function excluirProduto(id: number) {
    if (confirm("Excluir produto?")) {
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
    setLancarFinanceiro(false);
    setDadosFinanceiros({ valorTotal: 0, dataEmissao: "", numeroNota: "" });
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.ean && p.ean.includes(busca)) || 
    (p.sku && p.sku.includes(busca))
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
                {idEdicao ? '✏️ Editando Produto' : '✨ Entrada de Produto'}
              </h2>
              {idEdicao && <button onClick={limparFormulario} className="text-sm text-red-600 hover:underline">Cancelar</button>}
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
                {/* Linha 1 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome do Produto</label>
                        <input id="input-nome" type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Preço Venda (R$)</label>
                        <input type="text" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Estoque (Qtd)</label>
                        <input type="number" value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600" />
                    </div>
                </div>

                {/* Linha 2 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">EAN</label>
                        <input type="text" value={novoEan} onChange={e => setNovoEan(e.target.value)} className="w-full border p-2 rounded outline-none" placeholder="789..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">SKU</label>
                        <input type="text" value={novoSku} onChange={e => setNovoSku(e.target.value)} className="w-full border p-2 rounded outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">NCM</label>
                        <input type="text" value={novoNcm} onChange={e => setNovoNcm(e.target.value)} className="w-full border p-2 rounded outline-none" />
                    </div>
                </div>

                {/* Linha Financeira (NOVA) */}
                {lancarFinanceiro && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="chk-fin" 
                            checked={lancarFinanceiro} 
                            onChange={e => setLancarFinanceiro(e.target.checked)}
                            className="w-5 h-5 text-red-600 cursor-pointer"
                        />
                        <label htmlFor="chk-fin" className="text-sm text-red-800 cursor-pointer">
                            <span className="font-bold">Lançar Compra no Financeiro?</span> 
                            <span className="block text-xs text-red-600">
                                Valor da Nota: <b>R$ {dadosFinanceiros.valorTotal.toFixed(2)}</b> | Emissão: {dadosFinanceiros.dataEmissao}
                            </span>
                        </label>
                    </div>
                )}

                {/* Botão Salvar */}
                <div>
                    <button 
                        onClick={salvarProduto} 
                        className={`w-full text-white font-bold py-3 px-4 rounded shadow-md transition transform active:scale-95 ${idEdicao ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {idEdicao ? '💾 SALVAR ALTERAÇÕES' : (lancarFinanceiro ? '💾 CADASTRAR + LANÇAR DESPESA' : '💾 CADASTRAR PRODUTO')}
                    </button>
                </div>

            </div>
          </div>
        </div>

        {/* --- LISTAGEM --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Produtos Cadastrados</h3>
                <input type="text" placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="border p-2 pl-4 rounded-full text-sm w-72 focus:outline-blue-500" />
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
                            <td className="p-4 font-medium text-gray-800">{p.nome}</td>
                            <td className="p-4 text-gray-500 text-xs">SKU: {p.sku}<br/>EAN: {p.ean}</td>
                            <td className="p-4 text-blue-700 font-bold">R$ {p.preco}</td>
                            <td className="p-4 text-center"><span className="bg-gray-200 px-2 py-1 rounded font-bold">{p.estoque}</span></td>
                            <td className="p-4 text-right space-x-3">
                                <button onClick={() => iniciarEdicao(p)} className="text-blue-600 hover:underline">Editar</button>
                                <button onClick={() => excluirProduto(p.id)} className="text-red-400 hover:underline">Excluir</button>
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