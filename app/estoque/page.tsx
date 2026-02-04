'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import ImportarNfe from "@/components/ImportarNfe";

export default function Estoque() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [idEdicao, setIdEdicao] = useState<any>(null);
  
  // Estados do Produto
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");
  const [novoEan, setNovoEan] = useState("");
  const [novoSku, setNovoSku] = useState("");
  const [novoNcm, setNovoNcm] = useState("");

  // Estados do Financeiro (Lançamento Automático)
  const [lancarFinanceiro, setLancarFinanceiro] = useState(false);
  const [dadosFinanceiros, setDadosFinanceiros] = useState({
    valorTotal: 0,
    dataEmissao: "",
    numeroNota: ""
  });

  // Função chamada pelo Leitor de XML
  function preencherComDadosDaNota(dados: any) {
    // 1. Preenche visualmente os campos
    setNovoNome(dados.nome);
    setNovoPreco(dados.preco);
    setNovoEan(dados.ean);
    setNovoNcm(dados.ncm);
    setNovoSku(dados.sku);
    setNovoEstoque(dados.quantidade.toString());

    // 2. Guarda os dados para lançar no financeiro depois
    setDadosFinanceiros({
        valorTotal: Number(dados.valorTotalNota),
        dataEmissao: dados.dataEmissao,
        numeroNota: dados.numeroNota
    });
    setLancarFinanceiro(true); // Marca o checkbox

    // Aviso visual discreto
    alert(`Nota ${dados.numeroNota} lida!\nValor Total: R$ ${dados.valorTotalNota}\nClique em 'Cadastrar' para salvar no estoque e financeiro.`);
    
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

    let erroProduto = null;

    // --- 1. SALVAR PRODUTO ---
    if (idEdicao) {
        const { error } = await supabase.from('produtos').update(dadosDoProduto).eq('id', idEdicao);
        erroProduto = error;
    } else {
        const { error } = await supabase.from('produtos').insert(dadosDoProduto);
        erroProduto = error;
    }

    if (erroProduto) {
        return alert("Erro ao salvar produto: " + erroProduto.message);
    }

    // --- 2. LANÇAR NO FINANCEIRO ---
    // Só lança se: checkbox marcado + valor maior que 0 + não for edição
    if (lancarFinanceiro && dadosFinanceiros.valorTotal > 0 && !idEdicao) {
        
        const dataParaBanco = dadosFinanceiros.dataEmissao || new Date().toISOString().split('T')[0];
        
        const payloadFinanceiro = {
            descricao: `Compra NF ${dadosFinanceiros.numeroNota} - ${novoNome}`,
            valor: dadosFinanceiros.valorTotal,
            tipo: 'saida',
            status: 'Pendente',
            categoria: 'Compra de Estoque',
            data_entrada: dataParaBanco,
            data_vencimento: dataParaBanco
        };

        const { error: erroFin } = await supabase.from('financeiro').insert(payloadFinanceiro);

        if (erroFin) {
            console.error("Erro Financeiro:", erroFin);
            alert("Produto salvo, mas FALHA ao lançar no financeiro.\nVerifique se as colunas 'data_entrada' e 'data_vencimento' existem na tabela 'financeiro'.");
        } else {
            alert(`✅ Produto Cadastrado!\n💰 Despesa de R$ ${dadosFinanceiros.valorTotal} lançada no Financeiro.`);
        }
    } else {
        alert("Produto salvo com sucesso!");
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
    
    // Na edição, não lançamos financeiro novamente para evitar duplicidade
    setLancarFinanceiro(false);
    
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

        {/* --- ÁREA DE CADASTRO --- */}
        <div className={`p-6 rounded-xl shadow-sm mb-8 border transition-all ${idEdicao ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          
          <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold uppercase tracking-wide ${idEdicao ? 'text-yellow-700' : 'text-gray-500'}`}>
                {idEdicao ? '✏️ Editando Produto' : '✨ Entrada de Produto'}
              </h2>
              {idEdicao && <button onClick={limparFormulario} className="text-sm text-red-600 hover:underline">Cancelar</button>}
          </div>

          <div className="flex flex-col xl:flex-row gap-8">
            {/* Leitor XML */}
            {!idEdicao && (
                <div className="xl:w-1/4">
                    <ImportarNfe aoLerNota={preencherComDadosDaNota} />
                </div>
            )}

            {/* Formulário */}
            <div className={idEdicao ? "w-full" : "xl:w-3/4"}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome do Produto</label>
                        <input id="input-nome" type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Preço Venda (R$)</label>
                        <input type="text" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Estoque (Qtd)</label>
                        <input type="number" value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">EAN</label>
                        <input type="text" value={novoEan} onChange={e => setNovoEan(e.target.value)} className="w-full border p-2 rounded outline-none" />
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

                {/* Área do Financeiro */}
                {lancarFinanceiro && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4 flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="chk-fin" 
                            checked={lancarFinanceiro} 
                            onChange={e => setLancarFinanceiro(e.target.checked)}
                            className="w-5 h-5 text-green-600 cursor-pointer"
                        />
                        <label htmlFor="chk-fin" className="text-sm text-green-800 cursor-pointer flex-1">
                            <span className="font-bold block">Lançar Compra no Financeiro?</span> 
                            <span className="text-xs">
                                Nota: <b>{dadosFinanceiros.numeroNota}</b> | Valor: <b>R$ {dadosFinanceiros.valorTotal.toFixed(2)}</b> | Data: {dadosFinanceiros.dataEmissao}
                            </span>
                        </label>
                    </div>
                )}

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
                        <tr key={p.id} className="hover:bg-blue-50 transition">
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