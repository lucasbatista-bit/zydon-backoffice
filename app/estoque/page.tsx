'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import ImportarNfe, { DadosNotaFiscal } from "@/components/ImportarNfe";

export default function Estoque() {
  const [abaAtiva, setAbaAtiva] = useState<'manual' | 'xml'>('manual');
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  
  // --- ESTADOS DO CADASTRO MANUAL ---
  const [idEdicao, setIdEdicao] = useState<any>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoEstoque, setNovoEstoque] = useState("");
  const [novoEan, setNovoEan] = useState("");
  const [novoSku, setNovoSku] = useState("");
  const [novoNcm, setNovoNcm] = useState("");

  // --- ESTADOS DA IMPORTAÇÃO XML ---
  const [notaImportada, setNotaImportada] = useState<DadosNotaFiscal | null>(null);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [progresso, setProgresso] = useState(""); // Feedback visual

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
    setProdutos(data || []);
  }

  // --- LÓGICA MANUAL (Mantida) ---
  function iniciarEdicao(produto: any) {
    setAbaAtiva('manual');
    setIdEdicao(produto.id);
    setNovoNome(produto.nome);
    setNovoPreco(produto.preco);
    setNovoEstoque(produto.estoque);
    setNovoEan(produto.ean || "");
    setNovoSku(produto.sku || "");
    setNovoNcm(produto.ncm || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function limparFormularioManual() {
    setNovoNome(""); setNovoPreco(""); setNovoEstoque(""); 
    setNovoEan(""); setNovoSku(""); setNovoNcm("");
    setIdEdicao(null);
  }

  async function salvarProdutoManual() {
    if (!novoNome || !novoPreco) return alert("Preencha nome e preço!");
    const dados = {
      nome: novoNome,
      preco: parseFloat(novoPreco.replace(',', '.')),
      estoque: parseInt(novoEstoque) || 0,
      ean: novoEan, sku: novoSku, ncm: novoNcm
    };

    if (idEdicao) {
        await supabase.from('produtos').update(dados).eq('id', idEdicao);
        alert("Atualizado!");
    } else {
        await supabase.from('produtos').insert(dados);
        alert("Cadastrado!");
    }
    limparFormularioManual();
    carregarProdutos();
  }

  async function excluirProduto(id: number) {
    if (confirm("Excluir?")) {
        await supabase.from('produtos').delete().eq('id', id);
        carregarProdutos();
    }
  }

  // --- LÓGICA IMPORTAÇÃO XML (ATUALIZADA) ---
  function receberDadosXML(dados: DadosNotaFiscal) {
    setNotaImportada(dados);
    setTimeout(() => {
        document.getElementById('area-conferencia')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function confirmarImportacao() {
    if (!notaImportada) return;
    setSalvandoLote(true);
    setProgresso("Iniciando...");

    try {
        let novosCadastrados = 0;
        let estoqueAtualizado = 0;

        // 1. Processar Item por Item (Verificar se existe)
        for (const [index, item] of notaImportada.itens.entries()) {
            setProgresso(`Processando item ${index + 1} de ${notaImportada.itens.length}...`);

            // Busca produto pelo SKU (Código do Fornecedor)
            // Se o SKU for vazio ou genérico, tenta pelo EAN
            let query = supabase.from('produtos').select('*').eq('sku', item.codigo);
            if (!item.codigo && item.ean) {
                query = supabase.from('produtos').select('*').eq('ean', item.ean);
            }

            const { data: existentes } = await query;
            const produtoExistente = existentes && existentes.length > 0 ? existentes[0] : null;

            if (produtoExistente) {
                // ATUALIZAR (Soma Estoque + Atualiza Custo)
                const novaQuantidade = (produtoExistente.estoque || 0) + item.quantidade;
                
                await supabase.from('produtos').update({
                    estoque: novaQuantidade,
                    custo: item.valorUnitario, // Atualiza custo para o da última nota
                    fornecedor: notaImportada.emitente,
                    unidade: item.unidade
                }).eq('id', produtoExistente.id);
                
                estoqueAtualizado++;
            } else {
                // CRIAR NOVO
                await supabase.from('produtos').insert({
                    nome: item.descricao,
                    sku: item.codigo,
                    ean: item.ean,
                    ncm: item.ncm,
                    unidade: item.unidade,
                    fornecedor: notaImportada.emitente,
                    estoque: item.quantidade,
                    custo: item.valorUnitario,
                    preco: item.valorUnitario * 1.5, // Margem sugerida 50%
                    created_at: new Date().toISOString()
                });
                novosCadastrados++;
            }
        }

        setProgresso("Lançando Financeiro...");

        // 2. Lançar no Financeiro
        const { error: errFin } = await supabase.from('financeiro').insert({
            descricao: `Compra NF ${notaImportada.numero} - ${notaImportada.emitente}`,
            valor: notaImportada.valorTotalNota,
            tipo: 'saida',
            status: 'Pendente',
            categoria: 'Compra de Estoque',
            data_entrada: notaImportada.dataEmissao, // Data da Nota
            data_vencimento: notaImportada.dataEmissao // Padrão
        });

        if (errFin) throw new Error("Erro Financeiro: " + errFin.message);

        alert(`✅ Importação Concluída!\n\n🆕 Produtos Novos: ${novosCadastrados}\n📦 Estoques Atualizados: ${estoqueAtualizado}\n💰 Despesa Financeira Lançada.`);
        
        setNotaImportada(null);
        setAbaAtiva('manual');
        carregarProdutos();

    } catch (error: any) {
        alert("Erro no processo: " + error.message);
    } finally {
        setSalvandoLote(false);
        setProgresso("");
    }
  }

  const produtosFiltrados = produtos.filter(p => 
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    (p.ean && p.ean.includes(busca))
  );

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Controle de Estoque</h1>

        {/* --- ABAS --- */}
        <div className="flex gap-4 mb-6 border-b border-gray-300 pb-1">
            <button onClick={() => setAbaAtiva('manual')} className={`pb-2 px-4 font-bold text-sm transition ${abaAtiva === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>🖐️ Cadastro Manual</button>
            <button onClick={() => setAbaAtiva('xml')} className={`pb-2 px-4 font-bold text-sm transition ${abaAtiva === 'xml' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>📄 Importar XML (Lote)</button>
        </div>

        {/* CONTEÚDO MANUAL (Ocultado para brevidade, igual anterior) */}
        {abaAtiva === 'manual' && (
             <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-200">
                <h2 className="font-bold text-gray-700 mb-4 uppercase text-sm">{idEdicao ? 'Editar Produto' : 'Novo Produto'}</h2>
                {/* ... Campos Manuais iguais ao anterior ... */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500">Nome</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full border p-2 rounded outline-blue-500" /></div>
                    <div><label className="text-xs font-bold text-gray-500">Preço Venda</label><input type="text" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} className="w-full border p-2 rounded outline-blue-500" /></div>
                    <div><label className="text-xs font-bold text-gray-500">Estoque</label><input type="number" value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} className="w-full border p-2 rounded outline-blue-500" /></div>
                    <div><label className="text-xs font-bold text-gray-500">EAN</label><input type="text" value={novoEan} onChange={e => setNovoEan(e.target.value)} className="w-full border p-2 rounded outline-blue-500" /></div>
                    <div><label className="text-xs font-bold text-gray-500">SKU</label><input type="text" value={novoSku} onChange={e => setNovoSku(e.target.value)} className="w-full border p-2 rounded outline-blue-500" /></div>
                    <div><label className="text-xs font-bold text-gray-500">NCM</label><input type="text" value={novoNcm} onChange={e => setNovoNcm(e.target.value)} className="w-full border p-2 rounded outline-blue-500" /></div>
                    <div className="flex items-end"><button onClick={salvarProdutoManual} className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">{idEdicao ? 'Salvar' : 'Cadastrar'}</button></div>
                    {idEdicao && <div className="flex items-end"><button onClick={limparFormularioManual} className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded hover:bg-gray-300">Cancelar</button></div>}
                </div>
             </div>
        )}

        {/* CONTEÚDO XML */}
        {abaAtiva === 'xml' && (
            <div className="space-y-6 animate-in fade-in">
                {!notaImportada && <div className="h-64"><ImportarNfe aoLerNota={receberDadosXML} /></div>}

                {notaImportada && (
                    <div id="area-conferencia" className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
                        <div className="bg-blue-50 p-6 border-b border-blue-100 flex justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-blue-900 mb-1">Nota Fiscal: {notaImportada.numero}</h2>
                                <p className="text-blue-700 font-medium">{notaImportada.emitente}</p>
                                <p className="text-xs text-blue-500">CNPJ: {notaImportada.cnpjEmitente}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-blue-500 uppercase font-bold">Total Nota</div>
                                <div className="text-2xl font-bold text-green-600">R$ {notaImportada.valorTotalNota.toFixed(2)}</div>
                                <div className="text-xs text-gray-400 mt-1">Data: {notaImportada.dataEmissao}</div>
                            </div>
                        </div>

                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
                                    <tr><th className="p-3">Cód.</th><th className="p-3">Produto</th><th className="p-3 text-center">Qtd.</th><th className="p-3 text-right">Custo Unit.</th><th className="p-3 text-right">Total</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {notaImportada.itens.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50">
                                            <td className="p-3 font-mono text-gray-500">{item.codigo}</td>
                                            <td className="p-3 font-bold text-gray-800">{item.descricao}</td>
                                            <td className="p-3 text-center font-bold bg-gray-50">{item.quantidade}</td>
                                            <td className="p-3 text-right text-blue-600 font-medium">R$ {item.valorUnitario.toFixed(2)}</td>
                                            <td className="p-3 text-right font-bold text-gray-800">R$ {item.valorTotalItem.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                            <div className="text-blue-600 font-bold animate-pulse">{progresso}</div>
                            <div className="flex gap-4">
                                <button onClick={() => setNotaImportada(null)} className="px-6 py-3 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition" disabled={salvandoLote}>Cancelar</button>
                                <button onClick={confirmarImportacao} disabled={salvandoLote} className="px-8 py-3 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition">
                                    {salvandoLote ? 'Processando...' : '✅ CONFIRMAR E UNIFICAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* LISTAGEM */}
        <div className="mt-12">
            <h3 className="font-bold text-gray-700 mb-4 text-lg border-b pb-2">📦 Estoque Atual</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                        <tr><th className="p-4">Produto</th><th className="p-4">Fornecedor / Custo</th><th className="p-4">Preço Venda</th><th className="p-4 text-center">Estoque</th><th className="p-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {produtosFiltrados.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50">
                                <td className="p-4"><div className="font-medium text-gray-800">{p.nome}</div><div className="text-xs text-gray-400">SKU: {p.sku}</div></td>
                                <td className="p-4 text-gray-500 text-xs">{p.fornecedor || '-'}<div className="text-green-600 font-bold mt-1">Custo: R$ {p.custo}</div></td>
                                <td className="p-4 text-blue-700 font-bold">R$ {p.preco}</td>
                                <td className="p-4 text-center"><span className="bg-gray-100 px-2 py-1 rounded font-bold text-gray-700">{p.estoque} {p.unidade}</span></td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => iniciarEdicao(p)} className="text-blue-600 text-xs font-bold border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">Editar</button>
                                    <button onClick={() => excluirProduto(p.id)} className="text-red-500 text-xs font-bold border border-red-200 px-2 py-1 rounded hover:bg-red-50">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </div>
  );
}