'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Papa from "papaparse";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DE CADASTRO / EDIÇÃO ---
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [idEdicao, setIdEdicao] = useState<number | null>(null); // Se tiver ID, é edição
  const [formulario, setFormulario] = useState({
    razao_social: "", nome_fantasia: "", cnpj_cpf: "",
    responsavel: "", telefone: "", telefone2: "", // Novo campo
    cidade: "", estado: "", logradouro: ""
  });

  // --- ESTADOS DO PERFIL (CRM) ---
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [clientePerfil, setClientePerfil] = useState<any>(null);
  const [pedidosDoCliente, setPedidosDoCliente] = useState<any[]>([]);
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // --- ESTADO IMPORTAÇÃO ---
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    setLoading(true);
    const { data } = await supabase.from('Cliente').select('*').order('created_at', { ascending: false });
    setClientes(data || []);
    setLoading(false);
  }

  // --- GERADOR DE CÓDIGO ---
  function gerarCodigoUnico(telefone: string) {
    const apenasNumeros = telefone ? telefone.replace(/\D/g, "") : "00";
    const ddd = apenasNumeros.length >= 2 ? apenasNumeros.substring(0, 2) : "00";
    const aleatorio = Math.floor(100000 + Math.random() * 900000);
    return `${ddd}${aleatorio}`;
  }

  // --- ABRIR MODAL CADASTRO (Novo ou Edição) ---
  function abrirModalCadastro(cliente?: any) {
    if (cliente) {
        // Modo Edição
        setIdEdicao(cliente.id);
        setFormulario({
            razao_social: cliente.razao_social,
            nome_fantasia: cliente.nome_fantasia || "",
            cnpj_cpf: cliente.cnpj_cpf,
            responsavel: cliente.responsavel || "",
            telefone: cliente.telefone || "",
            telefone2: cliente.telefone2 || "",
            cidade: cliente.cidade || "",
            estado: cliente.estado || "",
            logradouro: cliente.logradouro || ""
        });
    } else {
        // Modo Novo
        setIdEdicao(null);
        setFormulario({
            razao_social: "", nome_fantasia: "", cnpj_cpf: "",
            responsavel: "", telefone: "", telefone2: "",
            cidade: "", estado: "", logradouro: ""
        });
    }
    setModalCadastroAberto(true);
  }

  // --- SALVAR (Insert ou Update) ---
  async function salvarCliente() {
    if (!formulario.razao_social || !formulario.cnpj_cpf) return alert("Razão Social e Documento são obrigatórios!");

    const dadosParaSalvar = { ...formulario };

    // Se for novo, gera código. Se for edição, mantém o que tem (não enviamos o campo código no update pra não mudar)
    let error;
    
    if (idEdicao) {
        // UPDATE
        const { error: err } = await supabase.from('Cliente').update(dadosParaSalvar).eq('id', idEdicao);
        error = err;
    } else {
        // INSERT (Gera código)
        const codigo = gerarCodigoUnico(formulario.telefone);
        const { error: err } = await supabase.from('Cliente').insert({
            ...dadosParaSalvar,
            codigo_cliente: codigo
        });
        error = err;
    }

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert(idEdicao ? "Cliente atualizado!" : "Cliente cadastrado com sucesso!");
        setModalCadastroAberto(false);
        carregarClientes();
    }
  }

  async function excluirCliente(id: number, nome: string) {
    if (confirm(`Tem certeza que deseja excluir ${nome}?`)) {
        const { error } = await supabase.from('Cliente').delete().eq('id', id);
        if (error) alert("Erro ao excluir: " + error.message);
        else carregarClientes();
    }
  }

  // --- ABRIR PERFIL (Visualizar Pedidos) ---
  async function abrirPerfil(cliente: any) {
    setClientePerfil(cliente);
    setPerfilAberto(true);
    setLoadingPerfil(true);

    // Busca pedidos onde o nome do cliente bate com a Razão Social
    // (Lembrando que no Pedidos salvamos o nome. O ideal futuro é salvar o ID, mas vamos usar o nome por enquanto)
    const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente', cliente.razao_social)
        .order('created_at', { ascending: false });

    setPedidosDoCliente(data || []);
    setLoadingPerfil(false);
  }

  // --- IMPORTAÇÃO CSV ---
  function handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    setImportando(true);

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async (results) => {
            const lista: any[] = results.data;
            if (lista.length === 0) { alert("Arquivo vazio."); setImportando(false); return; }

            const prontos = lista.map((l: any) => {
                const t1 = l['Telefone'] || l['Celular'] || l['telefone'] || "";
                const t2 = l['Telefone2'] || l['Celular2'] || l['telefone2'] || ""; // Lê o telefone 2
                return {
                    razao_social: l['Razao Social'] || l['Nome'] || l['razao_social'],
                    nome_fantasia: l['Fantasia'] || l['nome_fantasia'] || "",
                    cnpj_cpf: l['CNPJ'] || l['CPF'] || l['cnpj_cpf'],
                    responsavel: l['Responsavel'] || l['Contato'] || l['responsavel'] || "",
                    telefone: t1,
                    telefone2: t2,
                    cidade: l['Cidade'] || l['cidade'] || "",
                    estado: l['Estado'] || l['UF'] || l['estado'] || "",
                    logradouro: l['Endereco'] || l['logradouro'] || "",
                    codigo_cliente: gerarCodigoUnico(t1)
                };
            }).filter(c => c.razao_social && c.cnpj_cpf);

            const { error } = await supabase.from('Cliente').insert(prontos);
            if (error) alert("Erro importação: " + error.message);
            else { alert(`✅ ${prontos.length} clientes importados!`); carregarClientes(); }
            setImportando(false);
            event.target.value = "";
        }
    });
  }

  const filtrados = clientes.filter(c => 
    c.razao_social?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj_cpf?.includes(busca) ||
    c.codigo_cliente?.includes(busca)
  );

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Carteira de Clientes</h1>
            <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow hover:bg-green-700 cursor-pointer transition ${importando ? 'opacity-50' : ''}`}>
                    📂 {importando ? 'Carregando...' : 'Importar CSV'}
                    <input type="file" accept=".csv" onChange={handleFileUpload} disabled={importando} className="hidden" />
                </label>
                <button onClick={() => abrirModalCadastro()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition">
                    + Novo Cliente
                </button>
            </div>
        </div>

        {/* BUSCA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
            <input type="text" placeholder="🔍 Buscar por nome, CNPJ ou Código..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full border p-2 rounded outline-blue-500" />
        </div>

        {/* LISTAGEM */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                    <tr>
                        <th className="p-4">Cód.</th>
                        <th className="p-4">Cliente (Clique para Perfil)</th>
                        <th className="p-4">Telefones</th>
                        <th className="p-4">Cidade/UF</th>
                        <th className="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filtrados.map(c => (
                        <tr key={c.id} className="hover:bg-blue-50 transition group">
                            <td className="p-4"><span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-mono text-xs">{c.codigo_cliente}</span></td>
                            <td className="p-4 cursor-pointer" onClick={() => abrirPerfil(c)}>
                                <div className="font-bold text-blue-700 group-hover:underline">{c.razao_social}</div>
                                <div className="text-xs text-gray-500">{c.nome_fantasia} | {c.cnpj_cpf}</div>
                            </td>
                            <td className="p-4 text-xs">
                                <div className="font-bold text-gray-700">📱 {c.telefone}</div>
                                {c.telefone2 && <div className="text-gray-500">📞 {c.telefone2}</div>}
                            </td>
                            <td className="p-4 text-gray-600">{c.cidade}/{c.estado}</td>
                            <td className="p-4 text-center space-x-2">
                                <button onClick={() => abrirModalCadastro(c)} className="text-blue-600 hover:bg-blue-100 p-2 rounded">✏️</button>
                                <button onClick={() => excluirCliente(c.id, c.razao_social)} className="text-red-600 hover:bg-red-100 p-2 rounded">🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* --- MODAL CADASTRO / EDIÇÃO --- */}
        {modalCadastroAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-[700px] max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">{idEdicao ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Razão Social *</label><input className="w-full border p-2 rounded" value={formulario.razao_social} onChange={e => setFormulario({...formulario, razao_social: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Nome Fantasia</label><input className="w-full border p-2 rounded" value={formulario.nome_fantasia} onChange={e => setFormulario({...formulario, nome_fantasia: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">CNPJ / CPF *</label><input className="w-full border p-2 rounded" value={formulario.cnpj_cpf} onChange={e => setFormulario({...formulario, cnpj_cpf: e.target.value})} /></div>
                        
                        <div className="col-span-2 border-t mt-2 pt-2 text-xs font-bold text-gray-400 uppercase">Contatos</div>
                        <div><label className="text-xs font-bold text-gray-500">Telefone Principal (Gera Código)</label><input className="w-full border p-2 rounded" placeholder="(00) 00000-0000" value={formulario.telefone} onChange={e => setFormulario({...formulario, telefone: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Telefone Secundário</label><input className="w-full border p-2 rounded" placeholder="Fixo / Recado" value={formulario.telefone2} onChange={e => setFormulario({...formulario, telefone2: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Responsável</label><input className="w-full border p-2 rounded" value={formulario.responsavel} onChange={e => setFormulario({...formulario, responsavel: e.target.value})} /></div>
                        
                        <div className="col-span-2 border-t mt-2 pt-2 text-xs font-bold text-gray-400 uppercase">Endereço</div>
                        <div><label className="text-xs font-bold text-gray-500">Cidade</label><input className="w-full border p-2 rounded" value={formulario.cidade} onChange={e => setFormulario({...formulario, cidade: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Estado (UF)</label><input className="w-full border p-2 rounded" value={formulario.estado} onChange={e => setFormulario({...formulario, estado: e.target.value})} /></div>
                        <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Logradouro Completo</label><input className="w-full border p-2 rounded" value={formulario.logradouro} onChange={e => setFormulario({...formulario, logradouro: e.target.value})} /></div>
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button onClick={() => setModalCadastroAberto(false)} className="flex-1 py-3 bg-gray-200 rounded font-bold text-gray-700">Cancelar</button>
                        <button onClick={salvarCliente} className="flex-1 py-3 bg-blue-600 rounded font-bold text-white hover:bg-blue-700">{idEdicao ? 'Salvar Alterações' : 'Cadastrar'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL PERFIL (CRM) --- */}
        {perfilAberto && clientePerfil && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-end z-50">
                <div className="bg-white w-[500px] h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                    
                    {/* Header Perfil */}
                    <div className="flex justify-between items-start mb-6 border-b pb-4">
                        <div>
                            <div className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block mb-2">Cód: {clientePerfil.codigo_cliente}</div>
                            <h2 className="text-2xl font-bold text-gray-800 leading-tight">{clientePerfil.razao_social}</h2>
                            <p className="text-gray-500 text-sm">{clientePerfil.nome_fantasia}</p>
                        </div>
                        <button onClick={() => setPerfilAberto(false)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">&times;</button>
                    </div>

                    {/* Dados Cadastrais */}
                    <div className="space-y-4 mb-8">
                        <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-1">Dados de Contato</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="block text-gray-400 text-xs">CNPJ/CPF</span>{clientePerfil.cnpj_cpf}</div>
                            <div><span className="block text-gray-400 text-xs">Responsável</span>{clientePerfil.responsavel || '-'}</div>
                            <div><span className="block text-gray-400 text-xs">Telefone 1</span>{clientePerfil.telefone}</div>
                            <div><span className="block text-gray-400 text-xs">Telefone 2</span>{clientePerfil.telefone2 || '-'}</div>
                            <div className="col-span-2"><span className="block text-gray-400 text-xs">Endereço</span>{clientePerfil.logradouro} - {clientePerfil.cidade}/{clientePerfil.estado}</div>
                        </div>
                    </div>

                    {/* Histórico de Pedidos */}
                    <div>
                        <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-1 mb-3 flex justify-between items-center">
                            Histórico de Pedidos
                            <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-xs">{pedidosDoCliente.length}</span>
                        </h3>
                        
                        {loadingPerfil ? (
                            <p className="text-center text-gray-500 py-4">Buscando histórico...</p>
                        ) : pedidosDoCliente.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                                <p className="text-gray-400 text-sm">Nenhum pedido encontrado para este cliente.</p>
                                <button onClick={() => window.location.href='/pedidos'} className="mt-2 text-blue-600 text-xs font-bold hover:underline">Novo Pedido</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pedidosDoCliente.map(p => (
                                    <div key={p.id} className="border p-3 rounded-lg hover:bg-gray-50 transition">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-gray-500 font-mono">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-800 line-clamp-2">{p.produto}</div>
                                        <div className="mt-2 text-right font-bold text-blue-700">R$ {(p.valor_total || 0).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )}

      </main>
    </div>
  );
}