'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Pedidos() {
  // --- CONTROLE DE ABAS ---
  const [abaAtiva, setAbaAtiva] = useState<'novo' | 'historico'>('novo');

  // --- DADOS GERAIS ---
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  
  // --- ESTADOS DO NOVO PEDIDO ---
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [qtd, setQtd] = useState(1);

  // --- ESTADOS DO HISTÓRICO (NOVOS) ---
  const [historicoPedidos, setHistoricoPedidos] = useState<any[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");

  // Carregar dados iniciais
  useEffect(() => {
    carregarDadosAuxiliares();
    if (abaAtiva === 'historico') {
        carregarHistorico();
    }
  }, [abaAtiva]);

  async function carregarDadosAuxiliares() {
    const { data: listaClientes } = await supabase.from('Cliente').select('*').order('razao_social');
    const { data: listaProdutos } = await supabase.from('produtos').select('*').order('nome');
    setClientes(listaClientes || []);
    setProdutos(listaProdutos || []);
  }

  async function carregarHistorico() {
    const { data } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false }); // Mais recentes primeiro
    setHistoricoPedidos(data || []);
  }

  // --- FUNÇÕES DE VENDA ---
  function adicionarAoCarrinho() {
    if (!produtoSelecionadoId) return alert("Selecione um produto!");
    if (qtd < 1) return alert("Quantidade inválida!");

    const produtoOriginal = produtos.find(p => p.id === Number(produtoSelecionadoId));
    if (!produtoOriginal) return;

    const itemNovo = {
        id: produtoOriginal.id,
        nome: produtoOriginal.nome,
        preco: produtoOriginal.preco,
        qtd: Number(qtd),
        subtotal: produtoOriginal.preco * Number(qtd)
    };

    setCarrinho([...carrinho, itemNovo]);
    setProdutoSelecionadoId(""); 
    setQtd(1);
  }

  function removerDoCarrinho(index: number) {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(index, 1);
    setCarrinho(novoCarrinho);
  }

  async function finalizarPedido() {
    if (!clienteSelecionado) return alert("Selecione um Cliente!");
    if (carrinho.length === 0) return alert("O carrinho está vazio!");

    const totalPedido = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
    const qtdTotalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    const resumoDosItens = carrinho.map(i => `${i.qtd}x ${i.nome}`).join(', ');

    const { error } = await supabase.from('pedidos').insert({
        cliente: clienteSelecionado.razao_social, 
        produto: resumoDosItens,    
        valor_total: totalPedido,   
        quantidade: qtdTotalItens, 
        status: "Pendente",
    });

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("✅ Venda realizada!");
        setCarrinho([]);
        setClienteSelecionado(null);
        setBuscaCliente("");
        // Opcional: Já ir para o histórico
        setAbaAtiva('historico');
    }
  }

  // --- LÓGICA DE FILTROS DO HISTÓRICO ---
  const pedidosFiltrados = historicoPedidos.filter(pedido => {
    const matchCliente = pedido.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
    
    // Filtro de Data (Ignora hora, pega só YYYY-MM-DD)
    const dataPedido = pedido.created_at.split('T')[0];
    const matchDataInicio = filtroDataInicio ? dataPedido >= filtroDataInicio : true;
    const matchDataFim = filtroDataFim ? dataPedido <= filtroDataFim : true;

    // Filtro de Valor
    const valor = pedido.valor_total;
    const matchValorMin = filtroValorMin ? valor >= Number(filtroValorMin) : true;
    const matchValorMax = filtroValorMax ? valor <= Number(filtroValorMax) : true;

    return matchCliente && matchDataInicio && matchDataFim && matchValorMin && matchValorMax;
  });

  // Totais do Filtro
  const somaTotalFiltrada = pedidosFiltrados.reduce((acc, p) => acc + p.valor_total, 0);

  // Filtro do Autocomplete de Venda
  const clientesParaVenda = clientes.filter(c => 
    c.razao_social?.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Controle de Vendas</h1>
            
            {/* ABAS DE NAVEGAÇÃO */}
            <div className="bg-white p-1 rounded-lg shadow-sm border flex">
                <button 
                    onClick={() => setAbaAtiva('novo')}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'novo' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    + Novo Pedido
                </button>
                <button 
                    onClick={() => setAbaAtiva('historico')}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'historico' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📜 Histórico e Filtros
                </button>
            </div>
        </div>

        {/* ================= ABA: NOVO PEDIDO ================= */}
        {abaAtiva === 'novo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Selecionar Cliente */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="font-bold text-gray-700 mb-4 uppercase text-sm">1. Cliente</h2>
                        {!clienteSelecionado ? (
                            <div className="relative">
                                <input type="text" placeholder="Buscar cliente..." value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} className="w-full border p-3 rounded-lg outline-blue-500" />
                                {buscaCliente.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-xl mt-1 max-h-48 overflow-auto">
                                        {clientesParaVenda.map(c => (
                                            <div key={c.id} onClick={() => { setClienteSelecionado(c); setBuscaCliente(""); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b">
                                                <div className="font-bold text-gray-800">{c.razao_social}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="font-bold text-blue-900">{clienteSelecionado.razao_social}</div>
                                <button onClick={() => setClienteSelecionado(null)} className="text-sm text-red-500 hover:underline">Trocar</button>
                            </div>
                        )}
                    </div>

                    {/* Adicionar Produtos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="font-bold text-gray-700 mb-4 uppercase text-sm">2. Produtos</h2>
                        <div className="flex gap-4">
                            <select value={produtoSelecionadoId} onChange={e => setProdutoSelecionadoId(e.target.value)} className="flex-1 border p-3 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco}</option>)}
                            </select>
                            <input type="number" value={qtd} min={1} onChange={e => setQtd(Number(e.target.value))} className="w-20 border p-3 rounded-lg text-center" />
                            <button onClick={adicionarAoCarrinho} className="bg-blue-600 text-white font-bold px-6 rounded-lg hover:bg-blue-700">ADD</button>
                        </div>
                    </div>
                </div>

                {/* Resumo */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-fit">
                    <h2 className="font-bold text-gray-800 mb-6 text-lg border-b pb-4">Carrinho</h2>
                    <div className="space-y-4 mb-8">
                        {carrinho.map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <div><div className="font-medium">{item.nome}</div><div className="text-xs text-gray-500">{item.qtd}x R$ {item.preco}</div></div>
                                <div className="flex items-center gap-3"><span className="font-bold">R$ {item.subtotal.toFixed(2)}</span><button onClick={() => removerDoCarrinho(index)} className="text-red-400">×</button></div>
                            </div>
                        ))}
                        {carrinho.length === 0 && <p className="text-center text-gray-400">Vazio.</p>}
                    </div>
                    <div className="border-t pt-4 mt-auto">
                        <div className="flex justify-between items-center mb-6"><span className="text-gray-500">Total</span><span className="text-2xl font-bold text-blue-600">R$ {totalCarrinho.toFixed(2)}</span></div>
                        <button onClick={finalizarPedido} disabled={carrinho.length === 0 || !clienteSelecionado} className="w-full py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300">FINALIZAR</button>
                    </div>
                </div>
            </div>
        )}

        {/* ================= ABA: HISTÓRICO E FILTROS ================= */}
        {abaAtiva === 'historico' && (
            <div className="space-y-6">
                
                {/* BARRA DE FILTROS */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Filtrar Cliente</label>
                        <input type="text" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} placeholder="Nome da empresa..." className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Data Início</label>
                        <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Data Fim</label>
                        <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div className="flex gap-2">
                         <div className="w-1/2">
                            <label className="text-xs font-bold text-gray-500 uppercase">R$ Min</label>
                            <input type="number" value={filtroValorMin} onChange={e => setFiltroValorMin(e.target.value)} className="w-full border p-2 rounded text-sm" />
                        </div>
                        <div className="w-1/2">
                            <label className="text-xs font-bold text-gray-500 uppercase">R$ Máx</label>
                            <input type="number" value={filtroValorMax} onChange={e => setFiltroValorMax(e.target.value)} className="w-full border p-2 rounded text-sm" />
                        </div>
                    </div>
                </div>

                {/* TABELA DE RESULTADOS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <span className="font-bold text-gray-700">{pedidosFiltrados.length} Pedidos encontrados</span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">Total: R$ {somaTotalFiltrada.toFixed(2)}</span>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Resumo</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pedidosFiltrados.map(pedido => (
                                <tr key={pedido.id} className="hover:bg-blue-50">
                                    <td className="p-4 text-gray-500">
                                        {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">{pedido.cliente}</td>
                                    <td className="p-4 text-gray-600 text-xs max-w-xs truncate" title={pedido.produto}>
                                        {pedido.produto}
                                    </td>
                                    <td className="p-4 font-bold text-blue-700">
                                     R$ {(pedido.valor_total || 0).toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${pedido.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {pedido.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {pedidosFiltrados.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum pedido encontrado com estes filtros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}