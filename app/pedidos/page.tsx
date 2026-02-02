'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Pedidos() {
  // --- ESTADOS ---
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([]);
  
  // NOVO: Lista de Clientes para busca
  const [baseClientes, setBaseClientes] = useState<any[]>([]); 
  
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [cliente, setCliente] = useState("");
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [qtdDigitada, setQtdDigitada] = useState(1);

  const [vendaSelecionada, setVendaSelecionada] = useState<any>(null);
  const [itensDaVendaSelecionada, setItensDaVendaSelecionada] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. CARREGAR DADOS ---
  async function carregarDados() {
    const { data: vendasData } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    setListaVendas(vendasData || []);

    const { data: prodsData } = await supabase.from('produtos').select('*').gt('estoque', 0); 
    setProdutosDisponiveis(prodsData || []);

    // NOVO: Busca os clientes para o autocomplete
    const { data: clientesData } = await supabase.from('clientes').select('*').order('nome');
    setBaseClientes(clientesData || []);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function adicionarAoCarrinho() {
    if (!produtoSelecionadoId) return alert("Selecione um produto!");
    const prodReal = produtosDisponiveis.find(p => p.id === Number(produtoSelecionadoId));
    if (!prodReal) return;
    if (prodReal.estoque < qtdDigitada) return alert(`Estoque insuficiente! Só temos ${prodReal.estoque} un.`);

    const novoItem = {
      id_produto: prodReal.id,
      nome: prodReal.nome,
      preco_unitario: prodReal.preco,
      quantidade: qtdDigitada,
      total: prodReal.preco * qtdDigitada
    };
    setCarrinho([...carrinho, novoItem]);
    setProdutoSelecionadoId("");
    setQtdDigitada(1);
  }

  function removerDoCarrinho(index: number) {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(index, 1);
    setCarrinho(novoCarrinho);
  }

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.total, 0);

  async function finalizarVenda() {
    if (!cliente || carrinho.length === 0) return alert("Preencha cliente e carrinho!");

    // Cria Venda
    const { data: vendaCriada, error: erroVenda } = await supabase
      .from('vendas')
      .insert({ cliente, total: totalCarrinho, status: "Concluído" })
      .select().single();

    if (erroVenda) return alert("Erro: " + erroVenda.message);
    const idDaVenda = vendaCriada.id;

    // Salva Itens e Baixa Estoque
    for (const item of carrinho) {
      await supabase.from('itens_venda').insert({
        venda_id: idDaVenda,
        produto_nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.total
      });
      const { data: prodAtual } = await supabase.from('produtos').select('estoque').eq('id', item.id_produto).single();
      if (prodAtual) {
        await supabase.from('produtos').update({ estoque: prodAtual.estoque - item.quantidade }).eq('id', item.id_produto);
      }
    }

    // Financeiro
    await supabase.from('financeiro').insert({
      descricao: `Pedido #${idDaVenda} - ${cliente}`,
      valor: totalCarrinho,
      tipo: 'entrada',
      status: 'pago'
    });

    alert(`Pedido #${idDaVenda} gerado!`);
    setCarrinho([]);
    setCliente("");
    carregarDados();
  }

  async function abrirDetalhes(venda: any) {
    setVendaSelecionada(venda);
    const { data } = await supabase.from('itens_venda').select('*').eq('venda_id', venda.id);
    setItensDaVendaSelecionada(data || []);
    setIsModalOpen(true);
  }

  return (
    <div className="flex relative">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestão de Vendas</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-blue-600">
          <div className="mb-4">
             <h2 className="font-bold text-lg text-gray-700">Novo Pedido</h2>
          </div>
          
          {/* --- AQUI ESTÁ A MUDANÇA DO CLIENTE --- */}
          <div className="flex gap-4 mb-4">
             <input 
                list="lista-clientes" // Conecta com o datalist abaixo
                type="text" 
                value={cliente} 
                onChange={e => setCliente(e.target.value)} 
                placeholder="Busque o Cliente pelo nome..." 
                className="border p-2 rounded flex-1 outline-blue-500"
             />
             {/* Essa lista fica invisível, mas o input usa ela para sugerir nomes */}
             <datalist id="lista-clientes">
                {baseClientes.map(cli => (
                  <option key={cli.id} value={cli.nome}>{cli.telefone ? `Tel: ${cli.telefone}` : ''}</option>
                ))}
             </datalist>
          </div>
          
          <div className="flex gap-2 items-end bg-gray-100 p-4 rounded mb-4">
            <select value={produtoSelecionadoId} onChange={e => setProdutoSelecionadoId(e.target.value)} className="flex-1 p-2 rounded border">
              <option value="">Selecione produto...</option>
              {produtosDisponiveis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input type="number" value={qtdDigitada} onChange={e => setQtdDigitada(Number(e.target.value))} className="w-20 p-2 rounded border" min="1"/>
            <button onClick={adicionarAoCarrinho} className="bg-slate-700 text-white px-4 py-2 rounded font-bold">+</button>
          </div>

          {carrinho.length > 0 && (
            <div className="mb-4">
              {carrinho.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b p-2">
                   <span>{item.quantidade}x {item.nome}</span>
                   <span className="font-bold">R$ {item.total.toFixed(2)}</span>
                   <button onClick={() => removerDoCarrinho(idx)} className="text-red-500 font-bold ml-2">x</button>
                </div>
              ))}
              <div className="text-right text-xl font-bold text-blue-600 mt-2">Total: R$ {totalCarrinho.toFixed(2)}</div>
              <button onClick={finalizarVenda} className="w-full bg-green-600 text-white py-3 rounded mt-4 font-bold">FECHAR PEDIDO</button>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4">Últimos Pedidos</h2>
        <div className="grid gap-4">
          {listaVendas.map((venda) => (
            <div key={venda.id} className="bg-white p-4 rounded shadow hover:shadow-md transition flex justify-between items-center border border-gray-100">
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mr-2">#{venda.id}</span>
                <span className="font-bold text-gray-700">{venda.cliente}</span>
                <p className="text-xs text-gray-400 mt-1">Data: {new Date(venda.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-green-600">R$ {venda.total}</span>
                <button onClick={() => abrirDetalhes(venda)} className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-200 border">Ver Itens</button>
              </div>
            </div>
          ))}
        </div>

      </main>

      {isModalOpen && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Pedido #{vendaSelecionada.id} - {vendaSelecionada.cliente}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr><th className="p-2">Qtd</th><th className="p-2">Produto</th><th className="p-2 text-right">Preço Un.</th><th className="p-2 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {itensDaVendaSelecionada.map((item) => (
                    <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-bold">{item.quantidade}x</td><td className="p-3">{item.produto_nome}</td><td className="p-3 text-right text-gray-500">R$ {item.preco_unitario}</td><td className="p-3 text-right font-medium">R$ {item.subtotal}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 text-right"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-gray-600">Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}