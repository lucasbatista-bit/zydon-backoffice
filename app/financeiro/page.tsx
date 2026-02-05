'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<'lancamentos' | 'dashboard'>('lancamentos');
  
  // FILTRO: Por padrão, pegamos desde o dia 1 de JANEIRO deste ano, 
  // para garantir que notas antigas apareçam no Dashboard.
  const hoje = new Date().toISOString().split('T')[0];
  const inicioAno = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(inicioAno);
  const [dataFim, setDataFim] = useState(hoje);

  // ... (Estados iguais: lancamentos, kpis, modal...) 
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [kpis, setKpis] = useState({
    pme: 0, pmr: 0, pmp: 0, cicloOperacional: 0, cicloFinanceiro: 0, ncg: 0, estoqueMedio: 0
  });

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
        if (abaAtiva === 'dashboard') await calcularCicloFinanceiro(dadosFin);
    }
  }

  function calcularResumoSimples(dados: any[]) {
    let ent = 0; let sai = 0;
    dados.forEach(item => {
        if (item.tipo === 'entrada') ent += item.valor;
        if (item.tipo === 'saida') sai += item.valor;
    });
    setResumo({ entradas: ent, saidas: sai, saldo: ent - sai });
  }

  async function calcularCicloFinanceiro(dadosFin: any[]) {
    // A. Valor do Estoque Atual (AGORA BASEADO NO CUSTO)
    // Se o custo for null (produtos antigos), usamos 60% do preço como estimativa
    const { data: produtos } = await supabase.from('produtos').select('custo, preco, estoque');
    
    const valorEstoqueTotal = produtos?.reduce((acc, p) => {
        const custoReal = p.custo ? p.custo : (p.preco * 0.6); // Fallback se não tiver custo
        return acc + (custoReal * p.estoque);
    }, 0) || 0;

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
        pme: PME, pmr: PMR, pmp: PMP, cicloOperacional: CicloOperacional, 
        cicloFinanceiro: CicloFinanceiro, ncg: NCG, estoqueMedio: valorEstoqueTotal
    });
  }

  // ... (Restante das funções: mudarStatus, adicionarLancamentoManual igual ao anterior)
  async function mudarStatus(id: number, statusAtual: string) {
    const novoStatus = statusAtual === 'Pendente' ? 'Pago' : 'Pendente';
    const { error } = await supabase.from('financeiro').update({ status: novoStatus }).eq('id', id);
    if (error) alert("Erro: " + error.message); else carregarDados();
  }
  async function adicionarLancamentoManual() {
    if (!novaDescricao || !novoValor) return alert("Preencha campos!");
    await supabase.from('financeiro').insert({
        descricao: novaDescricao, valor: parseFloat(novoValor.replace(',', '.')),
        tipo: novoTipo, status: 'Pendente', categoria: novaCategoria,
        data_entrada: new Date().toISOString(), data_vencimento: novaDataVenc
    });
    setModalAberto(false); setNovaDescricao(""); setNovoValor(""); carregarDados();
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-800">Financeiro</h1>
            <div className="flex bg-white p-1 rounded-lg shadow-sm border">
                <button onClick={() => setAbaAtiva('lancamentos')} className={`px-4 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'lancamentos' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>📝 Lançamentos</button>
                <button onClick={() => setAbaAtiva('dashboard')} className={`px-4 py-2 rounded-md font-bold text-sm transition ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>📊 Dashboard CFO</button>
            </div>
        </div>

        {/* BARRA DE DATA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row items-center gap-4">
            <span className="text-sm font-bold text-gray-500 uppercase">Período:</span>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="border p-2 rounded text-sm font-bold text-gray-700" />
            <span className="text-gray-400">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="border p-2 rounded text-sm font-bold text-gray-700" />
            {abaAtiva === 'lancamentos' && <button onClick={() => setModalAberto(true)} className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700">+ Lançar</button>}
        </div>

        {/* CONTEÚDO ABAS (Visual igual ao anterior, resumido aqui) */}
        {abaAtiva === 'lancamentos' && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500"><div className="text-xs font-bold text-gray-400 uppercase">Receitas</div><div className="text-2xl font-bold text-green-600">R$ {resumo.entradas.toFixed(2)}</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500"><div className="text-xs font-bold text-gray-400 uppercase">Despesas</div><div className="text-2xl font-bold text-red-600">R$ {resumo.saidas.toFixed(2)}</div></div>
                    <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${resumo.saldo >= 0 ? 'border-blue-500' : 'border-orange-500'}`}><div className="text-xs font-bold text-gray-400 uppercase">Saldo</div><div className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>R$ {resumo.saldo.toFixed(2)}</div></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold"><tr><th className="p-4">Vencimento</th><th className="p-4">Descrição</th><th className="p-4">Status</th><th className="p-4 text-right">Valor</th><th className="p-4 text-center">Ações</th></tr></thead>
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
        {abaAtiva === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500"><h3 className="text-gray-500 text-xs font-bold uppercase mb-2">PME (Estoque)</h3><div className="text-4xl font-bold text-gray-800">{kpis.pme} <span className="text-sm font-medium text-gray-400">dias</span></div></div>
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500"><h3 className="text-gray-500 text-xs font-bold uppercase mb-2">PMR (Recebimento)</h3><div className="text-4xl font-bold text-gray-800">{kpis.pmr} <span className="text-sm font-medium text-gray-400">dias</span></div></div>
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-orange-500"><h3 className="text-gray-500 text-xs font-bold uppercase mb-2">PMP (Pagamento)</h3><div className="text-4xl font-bold text-gray-800">{kpis.pmp} <span className="text-sm font-medium text-gray-400">dias</span></div></div>
                </div>
                {/* ... Restante do Dashboard CFO (NCG, Ciclos) igual ao anterior ... */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                    <h3 className="font-bold text-gray-700 uppercase mb-4">Capital de Giro (NCG)</h3>
                    <div className={`text-4xl font-black ${kpis.ncg > 0 ? 'text-red-600' : 'text-green-600'}`}>R$ {kpis.ncg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <p className="text-sm text-gray-500 mt-2">Baseado no Estoque (Custo) + Contas a Receber - Contas a Pagar</p>
                </div>
            </div>
        )}
        {modalAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
                    <h2 className="text-lg font-bold mb-4">Novo Lançamento</h2>
                    <input className="w-full border p-2 mb-2 rounded" placeholder="Descrição" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
                    <input className="w-full border p-2 mb-2 rounded" type="number" placeholder="Valor" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
                    <button onClick={adicionarLancamentoManual} className="w-full py-2 bg-blue-600 text-white rounded font-bold">Salvar</button>
                    <button onClick={() => setModalAberto(false)} className="w-full py-2 mt-2 bg-gray-200 text-gray-700 rounded font-bold">Cancelar</button>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}