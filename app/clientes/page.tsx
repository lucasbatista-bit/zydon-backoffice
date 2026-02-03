'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

// Definindo o tipo de dados do Cliente
interface Cliente {
  id: number;
  razao_social: string;
  cnpj_cpf: string;
  nome_fantasia: string;
  responsavel: string;
  telefone: string;
  cidade: string;
  estado: string;
  logradouro: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [idEdicao, setIdEdicao] = useState<number | null>(null);

  // Estados do Formulário
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [logradouro, setLogradouro] = useState("");

  // --- MÁSCARAS E FORMATAÇÃO ---
  
  const mascaraTelefone = (valor: string) => {
    // Remove tudo que não é número
    valor = valor.replace(/\D/g, "");
    // Limita a 11 números (para formato celular com DDD)
    valor = valor.substring(0, 11);
    
    // Aplica a máscara (XX) 9XXXX-XXXX
    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
    return valor;
  };

  const mascaraEstado = (valor: string) => {
    // Apenas letras, maiúsculas, máx 2 caracteres
    return valor.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 2);
  };

  // -----------------------------

  async function carregarClientes() {
    // Atenção: O nome da tabela deve ser exatamente 'Cliente' como você criou
    const { data, error } = await supabase
      .from('Cliente') 
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao carregar:", error);
    } else {
        setClientes(data || []);
    }
  }

  async function salvarCliente() {
    if (!razaoSocial || !responsavel) return alert("Razão Social e Responsável são obrigatórios!");

    const dadosCliente = {
      razao_social: razaoSocial,
      cnpj_cpf: cnpjCpf,
      nome_fantasia: nomeFantasia,
      responsavel: responsavel,
      telefone: telefone,
      cidade: cidade,
      estado: estado,
      logradouro: logradouro
    };

    if (idEdicao) {
        // Atualizar
        const { error } = await supabase.from('Cliente').update(dadosCliente).eq('id', idEdicao);
        if (error) alert("Erro ao atualizar: " + error.message);
        else alert("Cliente atualizado!");
    } else {
        // Criar Novo
        const { error } = await supabase.from('Cliente').insert(dadosCliente);
        if (error) alert("Erro ao salvar: " + error.message);
        else alert("Cliente cadastrado com sucesso!");
    }

    limparFormulario();
    carregarClientes();
  }

  function iniciarEdicao(cliente: Cliente) {
    setIdEdicao(cliente.id);
    setRazaoSocial(cliente.razao_social || "");
    setCnpjCpf(cliente.cnpj_cpf || "");
    setNomeFantasia(cliente.nome_fantasia || "");
    setResponsavel(cliente.responsavel || "");
    setTelefone(cliente.telefone || "");
    setCidade(cliente.cidade || "");
    setEstado(cliente.estado || "");
    setLogradouro(cliente.logradouro || "");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluirCliente(id: number) {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
        const { error } = await supabase.from('Cliente').delete().eq('id', id);
        if (error) alert("Erro ao excluir: " + error.message);
        else carregarClientes();
    }
  }

  function limparFormulario() {
    setIdEdicao(null);
    setRazaoSocial("");
    setCnpjCpf("");
    setNomeFantasia("");
    setResponsavel("");
    setTelefone("");
    setCidade("");
    setEstado("");
    setLogradouro("");
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(c => 
    c.razao_social?.toLowerCase().includes(busca.toLowerCase()) ||
    c.nome_fantasia?.toLowerCase().includes(busca.toLowerCase()) ||
    c.responsavel?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestão de Clientes</h1>

        {/* --- FORMULÁRIO --- */}
        <div className={`p-6 rounded-xl shadow-sm mb-8 border transition-all ${idEdicao ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between mb-4">
                <h2 className="font-bold text-gray-700 uppercase tracking-wide">
                    {idEdicao ? '✏️ Editando Cliente' : '👤 Novo Cliente'}
                </h2>
                {idEdicao && <button onClick={limparFormulario} className="text-red-500 text-sm hover:underline">Cancelar</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Linha 1 */}
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Razão Social *</label>
                    <input type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className="w-full border p-2 rounded outline-blue-500" placeholder="Empresa LTDA" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">CNPJ / CPF</label>
                    <input type="text" value={cnpjCpf} onChange={e => setCnpjCpf(e.target.value)} className="w-full border p-2 rounded outline-blue-500" placeholder="00.000.000/0001-00" />
                </div>

                {/* Linha 2 */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nome Fantasia</label>
                    <input type="text" value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} className="w-full border p-2 rounded outline-blue-500" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Responsável *</label>
                    <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} className="w-full border p-2 rounded outline-blue-500" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Telefone</label>
                    <input 
                        type="text" 
                        value={telefone} 
                        onChange={e => setTelefone(mascaraTelefone(e.target.value))} 
                        className="w-full border p-2 rounded outline-blue-500" 
                        placeholder="(99) 99999-9999"
                    />
                </div>

                {/* Linha 3 */}
                <div className="md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                    <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className="w-full border p-2 rounded outline-blue-500" />
                </div>
                <div className="md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Estado (UF)</label>
                    <input 
                        type="text" 
                        value={estado} 
                        onChange={e => setEstado(mascaraEstado(e.target.value))} 
                        className="w-full border p-2 rounded outline-blue-500 text-center uppercase" 
                        placeholder="MG"
                    />
                </div>
                <div className="md:col-span-1 flex items-end">
                    <button onClick={salvarCliente} className={`w-full text-white font-bold py-2 rounded shadow-md transition ${idEdicao ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {idEdicao ? 'SALVAR ALTERAÇÕES' : '+ CADASTRAR'}
                    </button>
                </div>
                
                {/* Linha Extra: Endereço completo */}
                <div className="md:col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Logradouro Completo</label>
                    <input type="text" value={logradouro} onChange={e => setLogradouro(e.target.value)} className="w-full border p-2 rounded outline-blue-500" placeholder="Rua, Número, Bairro..." />
                </div>
            </div>
        </div>

        {/* --- TABELA --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Seus Clientes</h3>
                <input type="text" placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="border p-2 pl-4 rounded-full text-sm w-64 focus:outline-blue-500" />
            </div>
            
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                        <th className="p-4">Cliente / Fantasia</th>
                        <th className="p-4">Contato</th>
                        <th className="p-4">Localização</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {clientesFiltrados.map(c => (
                        <tr key={c.id} className="hover:bg-blue-50">
                            <td className="p-4">
                                <div className="font-bold text-gray-800">{c.razao_social}</div>
                                {c.nome_fantasia && <div className="text-xs text-gray-500">{c.nome_fantasia}</div>}
                                <div className="text-xs text-gray-400 mt-1">{c.cnpj_cpf}</div>
                            </td>
                            <td className="p-4">
                                <div className="font-medium text-gray-700">{c.responsavel}</div>
                                <div className="text-xs text-blue-600">{c.telefone}</div>
                            </td>
                            <td className="p-4 text-gray-600">
                                {c.cidade} - {c.estado}
                            </td>
                            <td className="p-4 text-right space-x-3">
                                <button onClick={() => iniciarEdicao(c)} className="text-blue-600 hover:underline font-medium">Editar</button>
                                <button onClick={() => excluirCliente(c.id)} className="text-red-400 hover:text-red-600">Excluir</button>
                            </td>
                        </tr>
                    ))}
                    {clientesFiltrados.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhum cliente encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </main>
    </div>
  );
}