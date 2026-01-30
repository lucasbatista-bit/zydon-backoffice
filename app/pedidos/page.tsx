'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Pedidos() {
  // --- ESTADOS (MEMÓRIA DA TELA) ---
  const [historicoVendas, setHistoricoVendas] = useState<any[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([]);
  
  // Dados do Carrinho
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [cliente, setCliente] = useState("");
  
  // Campos de seleção atual
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [qtdDigitada, setQtdDigitada] = useState(1);

  // --- 1. CARREGAR DADOS INICIAIS ---
  async function carregarDados() {
    const { data: listaVendas } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });
    setHistoricoVendas(listaVendas || []);

    const { data: listaProdutos } = await supabase
      .from('produtos')
      .select('*')
      .gt('estoque', 0); 
    setProdutosDisponiveis(listaProdutos || []);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // --- 2. FUNÇÕES DO CARRINHO ---
  function adicionarAoCarrinho() {
    if (!produtoSelecionadoId) return alert("Selecione um produto!");
    
    const prodReal = produtosDisponiveis.find(p => p.id === Number(produtoSelecionadoId));
    if (!prodReal) return;

    if (prodReal.estoque < qtdDigitada) {
      return alert(`Estoque insuficiente! Só temos ${prodReal.estoque} un.`);
    }

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


  // --- 3. FINALIZAR VENDA (AGORA COM INTEGRAÇÃO FINANCEIRA) ---
  async function finalizarVenda() {
    if (!cliente) return alert("Preencha o nome do cliente!");
    if (carrinho.length === 0) return alert("O carrinho está vazio!");

    // Vamos processar item por item
    for (const item of carrinho) {
      
      // A. Salva no Histórico de Pedidos
      await supabase.from('pedidos').insert({
        cliente: cliente,
        produto: item.nome,
        quantidade: item.quantidade,
        valor: item.total,
        status: "Pendente"
      });

      // B. Baixa o Estoque
      const { data: prodAtual } = await supabase
        .from('produtos')
        .select('estoque')
        .eq('id', item.id_produto)
        .single();

      if (prodAtual) {
        await supabase
          .from('produtos')
          .update({ estoque: prodAtual.estoque - item.quantidade })
          .eq('id', item.id_produto);
      }

      // C. (NOVO!) Lança no Financeiro Automaticamente
      // Isso aqui é o que faltava para atualizar seu caixa!
      await supabase.from('financeiro').insert({
        descricao: `Venda: ${item.quantidade}x ${item.nome} (${cliente})`,
        valor: item.total,
        tipo: 'entrada',    // Entra dinheiro
        status: 'pago'      // Vamos assumir pago para cair no saldo já
      });
    }

    alert("Venda Finalizada! Estoque baixado e Financeiro atualizado. 💰");
    
    setCarrinho([]);
    setCliente("");
    carregarDados();
  }


  // --- 4. TELA (VISUAL IGUAL) ---
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Vendas (Ponto de Venda)</h1>

        {/* --- ÁREA DO CAIXA (CARRINHO) --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-blue-600">
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-1">Cliente</label>
            <input 
              type="text" 
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full border p-2 rounded outline-blue-500"
              placeholder="Ex: Mercadinho do João"
            />
          </div>

          <hr className="my-6 border-gray-100"/>

          <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Produto</label>
              <select 
                value={produtoSelecionadoId}
                onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                className="w-full border p-2 rounded bg-white"
              >
                <option value="">Selecione um item...</option>
                {produtosDisponiveis.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (Estoque: {p.estoque}) - R$ {p.preco}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Qtd</label>
              <input 
                type="number" 
                value={qtdDigitada}
                min="1"
                onChange={(e) => setQtdDigitada(Number(e.target.value))}
                className="w-full border p-2 rounded text-center"
              />
            </div>

            <button 
              onClick={adicionarAoCarrinho}
              className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 font-bold"
            >
              + ADICIONAR
            </button>
          </div>

          <div className="mt-6">
            <h3 className="font-bold text-gray-700 mb-2">Itens no Carrinho:</h3>
            {carrinho.length === 0 ? (
              <p className="text-gray-400 text-sm italic">O carrinho está vazio.</p>
            ) : (
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Produto</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrinho.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.nome}</td>
                        <td className="p-3 text-center">{item.quantidade}</td>
                        <td className="p-3 text-right">R$ {item.total.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => removerDoCarrinho(index)} className="text-red-500 hover:text-red-700 font-bold">
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between items-center pt-4 border-t">
            <div>
              <p className="text-gray-500 text-sm">Total da Venda</p>
              <p className="text-3xl font-bold text-blue-600">R$ {totalCarrinho.toFixed(2)}</p>
            </div>
            
            {carrinho.length > 0 && (
              <button 
                onClick={finalizarVenda}
                className="bg-green-600 text-white px-8 py-3 rounded hover:bg-green-700 font-bold text-lg shadow-lg"
              >
                FINALIZAR VENDA ✅
              </button>
            )}
          </div>

        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4">Histórico de Pedidos</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Produto (Qtd)</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {historicoVendas.map((pedido) => (
                <tr key={pedido.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{pedido.cliente}</td>
                  <td className="p-4">
                    <span className="font-bold text-gray-800">{pedido.quantidade}x</span> {pedido.produto}
                  </td>
                  <td className="p-4 text-right font-bold text-green-600">R$ {pedido.valor}</td>
                  <td className="p-4 text-center">
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {pedido.status}
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