'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<'lancamentos' | 'dashboard'>('lancamentos');
  
  // --- FILTROS DE DATA ---
  const hoje = new Date().toISOString().split('T')[0];
  // Pega o primeiro dia do mês atual
  const primeiroDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(primeiroDia);
  const [dataFim, setDataFim] = useState(hoje);

  // --- DADOS ---
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  
  // Dados para o Dashboard Avançado
  const [kpis, setKpis] = useState({
    pme: 0, // Prazo Médio Estocagem
    pmr: 0, // Prazo Médio Recebimento
    pmp: 0, // Prazo Médio Pagamento
    cicloOperacional: 0,
    cicloFinanceiro: 0,
    ncg: 0, // Necessidade Capital Giro
    estoqueMedio: 0
  });

  // Estados Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoTipo, setNovoTipo] = useState("saida");
  const [novaCategoria, setNovaCategoria] = useState("Geral");
  const [novaDataVenc, setNovaDataVenc] = useState(hoje);

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim, abaAtiva]);

  async function carregarDados() {
    const { data: dadosFin } = await supabase
      .from('financeiro')
      .select('*')
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .order('data_vencimento', { ascending: true });

    if (dadosFin) {
        setLancamentos(dadosFin);
        calcularResumoSimples(dadosFin);
        
        if (abaAtiva === 'dashboard') {
            await calcularCicloFinanceiro(dadosFin);
        }
    }
  }

  function calcularResumoSimples(dados: any[]) {
    let ent = 0;
    let sai = 0;
    dados.forEach(item => {
        if (item.tipo === 'entrada') ent += item.valor;
        if (item.tipo === 'saida') sai += item.valor;
    });
    setResumo({ entradas: ent, saidas: sai, saldo: ent - sai });
  }

  async function calcularCicloFinanceiro(dadosFin: any[]) {
    // A. Valor do Estoque Atual
    const { data: produtos } = await supabase.from('produtos').select('preco, estoque');
    const valorEstoqueTotal = produtos?.reduce((acc, p) => acc + (p.preco * p.estoque), 0) || 0;

    // B. PMP (Saídas)
    const saidas = dadosFin.filter(d => d.tipo === 'saida');
    let somaDiasPagar = 0;
    saidas.forEach(s => {
        const entrada = new Date(s.data_entrada || s.created_at).getTime();
        const vencimento = new Date(s.data_vencimento).getTime();
        const dias = (vencimento - entrada) / (1000 * 3600 * 24);
        somaDiasPagar += dias > 0 ? dias : 0;
    });
    const PMP = saidas.length > 0 ? Math.round(somaDiasPagar / saidas.length) : 0;

    // C. PMR (Entradas)
    const entradas = dadosFin.filter(d => d.tipo === 'entrada');
    let somaDiasReceber = 0;
    entradas.forEach(e => {
        const entrada = new Date(e.data_entrada || e.created_at).getTime();
        const vencimento = new Date(e.data_vencimento).getTime();
        const dias = (vencimento - entrada) / (1000 * 3600 * 24);
        somaDiasReceber += dias > 0 ? dias : 0;
    });
    const PMR = entradas.length > 0 ? Math.round(somaDiasReceber / entradas.length) : 0;

    // D. PME (Estoque)
    const umDia = 1000 * 60 * 60 * 24;
    const diffTempo = new Date(dataFim).getTime() - new Date(dataInicio).getTime();
    const diasNoPeriodo = Math.max(1, Math.round(diffTempo / umDia));
    
    const vendasTotais = resumo.entradas; 
    const vendaDiaria = vendasTotais / diasNoPeriodo;
    const PME = vendaDiaria > 0 ? Math.round(valorEstoqueTotal / vendaDiaria) : 0;

    // E. Ciclos
    const CicloOperacional = PME + PMR;
    const CicloFinanceiro = CicloOperacional - PMP;

    // F. NCG
    const contasReceber = entradas.filter(e => e.status === 'Pendente').reduce((acc, i) => acc + i.valor, 0);
    const contasPagar = saidas.filter(s => s.status === 'Pendente').reduce((acc, i) => acc + i.valor, 0);
    const NCG = (contasReceber + valorEstoqueTotal) - contasPagar;

    setKpis({
        pme: PME,
        pmr: PMR,
        pmp: PMP,
        cicloOperacional: CicloOperacional,
        cicloFinanceiro: CicloFinanceiro,
        ncg: NCG,
        estoqueMedio: valorEstoqueTotal
    });
  }

  async function mudarStatus(id: number, statusAtual: string) {
    const novoStatus = statusAtual === 'Pendente' ? 'Pago' : 'Pendente';
    const { error } = await supabase.from('financeiro').update({ status: novoStatus }).eq('id', id);
    if (error) alert("Erro: " + error.message);
    else carregarDados();
  }

  async function adicionarLancamentoManual() {
    if (!novaDescricao || !novoValor) return alert("Preencha descrição e valor!");
    const { error } = await supabase.from('financeiro').insert({
        descricao: novaDescricao,
        valor: parseFloat(novoValor.replace(',', '.')),
        tipo: novoTipo,
        status: 'Pendente',
        categoria: novaCategoria,
        data_entrada: new Date().toISOString(),
        data_vencimento: novaDataVenc
    });
    if (!error) {
        setModalAberto(false);
        setNovaDescricao(""); setNovoValor("");
        carregarDados();
    }
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-800">Financeiro</h1>
            
            <div className="flex bg-white p-1 rounded-lg shadow-sm border">
                <button 
                    onClick={() => setAbaAtiva('lancamentos')}
                    className={`px-4 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'lancamentos' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📝 Lançamentos
                </button>
                <button 
                    onClick={() => setAbaAtiva('dashboard')}
                    className={`px-4 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📊 Ciclo Financeiro
                </button>
            </div>
        </div>{/* BARRA DE DATA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row items-center gap-4">
            <span className="text-sm font-bold text-gray-500 uppercase">Período:</span>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="border p-2 rounded text-sm font-bold text-gray-700" />
            <span className="text-gray-400">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="border p-2 rounded text-sm font-bold text-gray-700" />
            {abaAtiva === 'lancamentos' && (
                <button onClick={() => setModalAberto(true)} className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700">
                    + Lançar
                </button>
            )}
        </div>

        {/* ABA 1: LANÇAMENTOS */}
        {abaAtiva === 'lancamentos' && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                        <div className="text-xs font-bold text-gray-400 uppercase">Receitas</div>
                        <div className="text-2xl font-bold text-green-600">R$ {resumo.entradas.toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                        <div className="text-xs font-bold text-gray-400 uppercase">Despesas</div>
                        <div className="text-2xl font-bold text-red-600">R$ {resumo.saidas.toFixed(2)}</div>
                    </div>
                    <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${resumo.saldo >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
                        <div className="text-xs font-bold text-gray-400 uppercase">Saldo Líquido</div>
                        <div className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>R$ {resumo.saldo.toFixed(2)}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lancamentos.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50">
                                    <td className="p-4 text-gray-600">{new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-4"><div className="font-bold text-gray-800">{item.descricao}</div><div className="text-xs text-gray-500">{item.categoria}</div></td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status && item.status.includes('Pago') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                                    <td className={`p-4 text-right font-bold ${item.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>{item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toFixed(2)}</td>
                                    <td className="p-4 text-center"><button onClick={() => mudarStatus(item.id, item.status)} className="text-xs font-bold text-blue-600 hover:underline border border-blue-200 px-3 py-1 rounded hover:bg-blue-50">Alterar Status</button></td>
                                </tr>
                            ))}
                            {lancamentos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sem dados neste período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {/* ABA 2: DASHBOARD */}
        {abaAtiva === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* PME */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500">
                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">PME (Estocagem)</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-gray-800">{kpis.pme}</span>
                            <span className="text-sm font-medium text-gray-400 mb-2">dias</span>
                        </div>
                    </div>
                    {/* PMR */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">PMR (Recebimento)</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-gray-800">{kpis.pmr}</span>
                            <span className="text-sm font-medium text-gray-400 mb-2">dias</span>
                        </div>
                    </div>
                    {/* PMP */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-orange-500">
                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">PMP (Pagamento)</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-gray-800">{kpis.pmp}</span>
                            <span className="text-sm font-medium text-gray-400 mb-2">dias</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ciclo Operacional */}
                    <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">Ciclo Operacional (CO)</h3>
                            <div className="text-xs text-gray-400 mb-4">PME ({kpis.pme}) + PMR ({kpis.pmr})</div>
                            <div className="text-5xl font-bold text-white mb-2">{kpis.cicloOperacional} <span className="text-lg font-normal text-gray-400">dias</span></div>
                            <p className="text-xs text-gray-300">Tempo total desde a compra da matéria-prima até receber a venda.</p>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] text-gray-700 opacity-20 text-9xl font-black">CO</div>
                    </div>

                    {/* Ciclo Financeiro */}
                    <div className={`p-6 rounded-xl shadow-lg relative overflow-hidden text-white ${kpis.cicloFinanceiro > 0 ? 'bg-red-700' : 'bg-green-700'}`}>
                        <div className="relative z-10">
                            <h3 className="text-white text-opacity-80 text-xs font-bold uppercase mb-1">Ciclo Financeiro (Caixa)</h3>
                            <div className="text-xs text-white text-opacity-70 mb-4">CO ({kpis.cicloOperacional}) - PMP ({kpis.pmp})</div>
                            <div className="text-5xl font-bold text-white mb-2">{kpis.cicloFinanceiro} <span className="text-lg font-normal text-white text-opacity-70">dias</span></div>
                            <p className="text-xs text-white text-opacity-80">
                                {kpis.cicloFinanceiro > 0 ? "⚠️ Precisa financiar a operação." : "✅ Fornecedores financiam você."}
                            </p>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] text-black opacity-10 text-9xl font-black">CF</div>
                    </div>
                </div>

                {/* NCG */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700 uppercase">Necessidade de Capital de Giro (NCG)</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${kpis.ncg > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {kpis.ncg > 0 ? "Falta Caixa" : "Sobra Caixa"}
                        </span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-center text-center">
                        <div>
                            <div className="text-xs text-gray-500">Estoque</div>
                            <div className="font-bold text-blue-600">+ {kpis.estoqueMedio.toLocaleString()}</div>
                        </div>
                        <div className="text-gray-300 font-bold text-xl">+</div>
                        <div>
                            <div className="text-xs text-gray-500">A Receber</div>
                            <div className="font-bold text-green-600">+ {lancamentos.filter(l => l.tipo === 'entrada' && l.status === 'Pendente').reduce((acc, i) => acc + i.valor, 0).toLocaleString()}</div>
                        </div>
                        <div className="text-gray-300 font-bold text-xl">-</div>
                        <div>
                            <div className="text-xs text-gray-500">A Pagar</div>
                            <div className="font-bold text-red-600">- {lancamentos.filter(l => l.tipo === 'saida' && l.status === 'Pendente').reduce((acc, i) => acc + i.valor, 0).toLocaleString()}</div>
                        </div>
                        <div className="text-gray-300 font-bold text-xl">=</div>
                        <div className="bg-gray-50 p-3 rounded-lg min-w-[150px]">
                            <div className={`text-2xl font-black ${kpis.ncg > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                R$ {kpis.ncg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL */}
        {modalAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
                    <h2 className="text-lg font-bold mb-4">Novo Lançamento</h2>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Descrição" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
                        <div className="flex gap-2">
                            <input className="w-1/2 border p-2 rounded" type="number" placeholder="Valor" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
                            <select className="w-1/2 border p-2 rounded" value={novoTipo} onChange={e => setNovoTipo(e.target.value)}>
                                <option value="saida">Saída</option>
                                <option value="entrada">Entrada</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-1/2"><label className="text-xs text-gray-500">Vencimento</label><input className="w-full border p-2 rounded" type="date" value={novaDataVenc} onChange={e => setNovaDataVenc(e.target.value)} /></div>
                            <div className="w-1/2"><label className="text-xs text-gray-500">Categoria</label><input className="w-full border p-2 rounded" placeholder="Ex: Geral" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} /></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setModalAberto(false)} className="flex-1 py-2 bg-gray-200 rounded font-bold text-gray-700">Cancelar</button>
                            <button onClick={adicionarLancamentoManual} className="flex-1 py-2 bg-blue-600 rounded font-bold text-white">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}