'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [saldo, setSaldo] = useState(0);

  // Campos para novo lançamento
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("entrada"); // Começa marcado como Entrada

  async function carregarFinanceiro() {
    const { data } = await supabase.from('financeiro').select('*').order('created_at', { ascending: false });
    
    if (data) {
      setLancamentos(data);
      // Cálculo mágico do saldo: Soma as entradas e subtrai as saídas
      const total = data.reduce((acc, item) => {
        return item.tipo === 'entrada' ? acc + item.valor : acc - item.valor;
      }, 0);
      setSaldo(total);
    }
  }

  async function adicionarLancamento() {
    if (!descricao || !valor) return alert("Preencha tudo!");

    await supabase.from('financeiro').insert({
      descricao,
      valor: parseFloat(valor.replace(',', '.')),
      tipo,
      status: "pago" // Vamos assumir que já está pago para facilitar o saldo
    });

    setDescricao("");
    setValor("");
    carregarFinanceiro();
  }

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Fluxo de Caixa</h1>

        {/* --- CARD DO SALDO --- */}
        <div className={`${saldo >= 0 ? 'bg-green-600' : 'bg-red-600'} text-white p-6 rounded-lg shadow-lg mb-8 max-w-sm`}>
          <h2 className="text-sm opacity-90">Saldo em Caixa</h2>
          <p className="text-4xl font-bold mt-2">
            R$ {saldo.toFixed(2)}
          </p>
        </div>

        {/* --- NOVO LANÇAMENTO --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-700">Lançamento Rápido</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600">Descrição</label>
              <input 
                type="text" 
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full border p-2 rounded" 
                placeholder="Ex: Venda do dia"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-600">Valor</label>
              <input 
                type="text" 
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full border p-2 rounded" 
                placeholder="0.00"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-600">Tipo</label>
              <select 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border p-2 rounded bg-white"
              >
                <option value="entrada">🟢 Entrada</option>
                <option value="saida">🔴 Saída</option>
              </select>
            </div>
            <button 
              onClick={adicionarLancamento}
              className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 font-bold"
            >
              LANÇAR
            </button>
          </div>
        </div>

        {/* --- EXTRATO --- */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {lancamentos.map((item) => (
            <div key={item.id} className="p-4 border-b flex justify-between items-center hover:bg-gray-50">
              <p className="font-medium text-gray-800">{item.descricao}</p>
              <p className={`font-bold ${item.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                {item.tipo === 'entrada' ? '+ ' : '- '} 
                R$ {item.valor}
              </p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}