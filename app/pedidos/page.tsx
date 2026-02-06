'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Pedidos() {
  const [abaAtiva, setAbaAtiva] = useState<'novo' | 'historico'>('novo');

  // Dados Gerais
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  
  // Venda Nova
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [qtd, setQtd] = useState(1);

  // Histórico
  const [historicoPedidos, setHistoricoPedidos] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("Todos"); // Novo Filtro

  // Cancelamento
  const [modalCancelAberto, setModalCancelAberto] = useState(false);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<any>(null);
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    carregarDadosAuxiliares();
    verificarPedidosExpirados(); // O Auditor roda ao abrir a tela
  }, []);

  useEffect(() => {
    if (abaAtiva === 'historico') carregarHistorico();
  }, [abaAtiva, filtroStatus]); // Recarrega se mudar o filtro

  async function carregarDadosAuxiliares() {
    const { data: cli } = await supabase.from('Cliente').select('*').order('razao_social');
    const { data: prod } = await supabase.from('produtos').select('*').order('nome');
    setClientes(cli || []);
    setProdutos(prod || []);
  }

  async function carregarHistorico() {
    let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    
    if (filtroStatus !== "Todos") {
        query = query.eq('status', filtroStatus);
    }

    const { data } = await query;
    setHistoricoPedidos(data || []);
  }

  // --- O AUDITOR AUTOMÁTICO (4 DIAS) ---
  async function verificarPedidosExpirados() {
    // Calcula data de 4 dias atrás
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 4);

    // Busca pedidos PENDENTES velhos
    const { data: expirados } = await supabase
        .from('pedidos')
        .select('*')
        .eq('status', 'Pendente')
        .lt('created_at', dataLimite.toISOString());

    if (expirados && expirados.length > 0) {
        console.log(`Auditor: Encontrados ${expirados.length} pedidos expirados.`);
        
        for (const pedido of expirados) {
            // Cancela e devolve estoque automaticamente
            await processarCancelamento(pedido, "Cancelamento Automático (Expirou prazo de 4 dias)");
        }
        alert(`⚠️ Atenção: ${expirados.length} pedidos antigos foram cancelados automaticamente e o estoque foi estornado.`);
    }
  }

  // --- FUNÇÃO DE GERAR ID ÚNICO ---
  function gerarNumeroPedido(codCliente: string) {
    // Garante que tenha código, senão usa '00'
    const prefixo = codCliente || "00"; 
    // Gera 10 digitos aleatórios
    const aleatorio = Math.floor(1000000000 + Math.random() * 9000000000);
    return `${prefixo}-${aleatorio}`;
  }

  // --- VENDA ---
  function adicionarAoCarrinho() {
    if (!produtoSelecionadoId) return alert("Selecione um produto!");
    if (qtd < 1) return alert("Qtd inválida!");

    const prod = produtos.find(p => p.id === Number(produtoSelecionadoId));
    if (!prod) return;

    // Verifica estoque virtualmente antes de adicionar
    if (prod.estoque < qtd) return alert(`Estoque insuficiente! Só temos ${prod.estoque}.`);

    setCarrinho([...carrinho, { ...prod, qtd, subtotal: prod.preco * qtd }]);
    setProdutoSelecionadoId(""); setQtd(1);
  }

  function removerDoCarrinho(index: number) {
    const novo = [...carrinho]; novo.splice(index, 1); setCarrinho(novo);
  }

  async function finalizarPedido() {
    if (!clienteSelecionado) return alert("Selecione Cliente!");
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    const total = carrinho.reduce((acc, i) => acc + i.subtotal, 0);
    const resumo = carrinho.map(i => `${i.qtd}x ${i.nome}`).join(', ');
    const numPedido = gerarNumeroPedido(clienteSelecionado.codigo_cliente);

    // 1. Salvar Pedido
    const { error } = await supabase.from('pedidos').insert({
        cliente: clienteSelecionado.razao_social,
        produto: resumo,
        itens_json: carrinho, // SALVANDO O JSON PARA ESTORNO FUTURO
        valor_total: total,
        quantidade: carrinho.length,
        status: "Pendente",
        numero_pedido: numPedido
    });

    if (error) return alert("Erro ao salvar: " + error.message);

    // 2. Baixar Estoque
    for (const item of carrinho) {
        const novoEstoque = item.estoque - item.qtd;
        await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
    }

    alert(`✅ Pedido ${numPedido} realizado com sucesso!`);
    setCarrinho([]); setClienteSelecionado(null); setBuscaCliente("");
    carregarDadosAuxiliares(); // Atualiza estoque local
  }

  // --- CANCELAMENTO E ESTORNO ---
  function abrirModalCancelamento(pedido: any) {
    setPedidoParaCancelar(pedido);
    setJustificativa("");
    setModalCancelAberto(true);
  }

  async function confirmarCancelamentoManual() {
    if (justificativa.length < 5) return alert("A justificativa deve ter pelo menos 5 caracteres.");
    await processarCancelamento(pedidoParaCancelar, justificativa);
    setModalCancelAberto(false);
    carregarHistorico();
  }

  // Função central que devolve o estoque
  async function processarCancelamento(pedido: any, motivo: string) {
    // 1. Atualizar status do pedido
    await supabase.from('pedidos').update({
        status: 'Cancelado',
        justificativa: motivo
    }).eq('id', pedido.id);

    // 2. Devolver Estoque (Ler o JSON salvo)
    if (pedido.itens_json && Array.isArray(pedido.itens_json)) {
        for (const item of pedido.itens_json) {
            // Busca estoque atual do banco para somar (segurança)
            const { data: prodAtual } = await supabase.from('produtos').select('estoque').eq('id', item.id).single();
            
            if (prodAtual) {
                const estoqueRestaurado = prodAtual.estoque + item.qtd;
                await supabase.from('produtos').update({ estoque: estoqueRestaurado }).eq('id', item.id);
            }
        }
    } else {
        console.warn("Pedido antigo sem JSON de itens. Estoque não estornado automaticamente.");
    }
  }

  // Filtros Visuais
  const clientesFiltrados = clientes.filter(c => c.razao_social?.toLowerCase().includes(buscaCliente.toLowerCase()));
  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.subtotal, 0);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Central de Pedidos</h1>
            <div className="flex bg-white p-1 rounded-lg shadow-sm border">
                <button onClick={() => setAbaAtiva('novo')} className={`px-6 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'novo' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>+ Novo Pedido</button>
                <button onClick={() => setAbaAtiva('historico')} className={`px-6 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'historico' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>📜 Gerenciar Pedidos</button>
            </div>
        </div>

        {/* ABA NOVO PEDIDO */}
        {abaAtiva === 'novo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Cliente */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="font-bold text-gray-700 mb-4 text-sm uppercase">1. Cliente</h2>
                        {!clienteSelecionado ? (
                            <div className="relative">
                                <input type="text" placeholder="Buscar cliente..." value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} className="w-full border p-3 rounded-lg outline-blue-500" />
                                {buscaCliente.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-xl mt-1 max-h-48 overflow-auto">
                                        {clientesFiltrados.map(c => (
                                            <div key={c.id} onClick={() => { setClienteSelecionado(c); setBuscaCliente(""); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b">
                                                <div className="font-bold">{c.razao_social}</div>
                                                <div className="text-xs text-gray-500">Cód: {c.codigo_cliente}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div><div className="font-bold text-blue-900">{clienteSelecionado.razao_social}</div><div className="text-xs">Cód: {clienteSelecionado.codigo_cliente}</div></div>
                                <button onClick={() => setClienteSelecionado(null)} className="text-red-500 text-sm hover:underline">Trocar</button>
                            </div>
                        )}
                    </div>

                    {/* Produtos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="font-bold text-gray-700 mb-4 text-sm uppercase">2. Itens</h2>
                        <div className="flex gap-4">
                            <select value={produtoSelecionadoId} onChange={e => setProdutoSelecionadoId(e.target.value)} className="flex-1 border p-3 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoque})</option>)}
                            </select>
                            <input type="number" value={qtd} min={1} onChange={e => setQtd(Number(e.target.value))} className="w-20 border p-3 rounded-lg text-center" />
                            <button onClick={adicionarAoCarrinho} className="bg-blue-600 text-white font-bold px-6 rounded-lg hover:bg-blue-700">ADD</button>
                        </div>
                    </div>
                </div>

                {/* Resumo */}
                <div className="bg-white p-6 rounded-xl shadow-lg border h-fit">
                    <h2 className="font-bold text-gray-800 mb-6 border-b pb-4">Carrinho</h2>
                    <div className="space-y-4 mb-8">
                        {carrinho.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                                <div><div className="font-medium">{item.nome}</div><div className="text-xs text-gray-500">{item.qtd}x R$ {item.preco}</div></div>
                                <div className="flex items-center gap-2"><span className="font-bold">R$ {item.subtotal.toFixed(2)}</span><button onClick={() => removerDoCarrinho(index)} className="text-red-400">×</button></div>
                            </div>
                        ))}
                        {carrinho.length === 0 && <p className="text-center text-gray-400">Vazio.</p>}
                    </div>
                    <div className="border-t pt-4">
                        <div className="flex justify-between mb-6"><span className="text-gray-500">Total</span><span className="text-2xl font-bold text-blue-600">R$ {totalCarrinho.toFixed(2)}</span></div>
                        <button onClick={finalizarPedido} disabled={carrinho.length === 0 || !clienteSelecionado} className="w-full py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300">FINALIZAR PEDIDO</button>
                    </div>
                </div>
            </div>
        )}

        {/* ABA HISTÓRICO */}
        {abaAtiva === 'historico' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
                    <span className="font-bold text-gray-700">Filtrar Pedidos:</span>
                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border p-2 rounded-lg bg-gray-50">
                        <option value="Todos">Todos os Status</option>
                        <option value="Pendente">🟡 Pendentes</option>
                        <option value="Pago">🟢 Pagos</option>
                        <option value="Cancelado">🔴 Cancelados</option>
                    </select>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                            <tr><th className="p-4">Nº Pedido</th><th className="p-4">Data</th><th className="p-4">Cliente</th><th className="p-4">Valor</th><th className="p-4">Status</th><th className="p-4 text-center">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {historicoPedidos.map(p => (
                                <tr key={p.id} className="hover:bg-blue-50">
                                    <td className="p-4 font-mono text-xs font-bold text-blue-600">{p.numero_pedido || "---"}</td>
                                    <td className="p-4 text-gray-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-4 font-bold text-gray-800">{p.cliente}</td>
                                    <td className="p-4 font-bold">R$ {(p.valor_total || 0).toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${p.status === 'Pago' ? 'bg-green-100 text-green-700' : 
                                              p.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {p.status === 'Pendente' && (
                                            <button onClick={() => abrirModalCancelamento(p)} className="text-xs font-bold text-red-500 border border-red-200 px-3 py-1 rounded hover:bg-red-50">
                                                Cancelar
                                            </button>
                                        )}
                                        {p.status === 'Cancelado' && (
                                            <span className="text-xs text-gray-400 italic" title={p.justificativa}>Ver Motivo</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL DE JUSTIFICATIVA */}
        {modalCancelAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
                    <h2 className="text-lg font-bold mb-4 text-red-600">Cancelar Pedido</h2>
                    <p className="text-sm text-gray-600 mb-4">O estoque será devolvido automaticamente.</p>
                    
                    <textarea 
                        className="w-full border p-3 rounded-lg mb-4 h-24 text-sm"
                        placeholder="Motivo do cancelamento (mínimo 5 letras)..."
                        value={justificativa}
                        onChange={e => setJustificativa(e.target.value)}
                    />
                    
                    <div className="flex gap-2">
                        <button onClick={() => setModalCancelAberto(false)} className="flex-1 py-2 bg-gray-200 rounded font-bold text-gray-700">Voltar</button>
                        <button onClick={confirmarCancelamentoManual} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Confirmar Cancelamento</button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}