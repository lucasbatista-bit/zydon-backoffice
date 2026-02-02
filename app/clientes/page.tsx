'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Clientes() {
  // --- ESTADO DA ABA (Navegação) ---
  // 'lista' = Mostra a tabela | 'cadastro' = Mostra o formulário
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'cadastro'>('lista');

  const [clientes, setClientes] = useState<any[]>([]);

  // --- ESTADOS DOS CAMPOS ---
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [qtdFuncionarios, setQtdFuncionarios] = useState("");

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('razao_social');
    setClientes(data || []);
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  // --- ESTILOS VISUAIS ---
  function getEstilo(valor: string) {
    if (valor && valor.length > 0) {
      return "w-full p-2 rounded border border-green-400 bg-green-50 text-black outline-none transition-all shadow-sm";
    }
    return "w-full p-2 rounded border border-gray-300 bg-gray-100 text-black placeholder-gray-400 outline-none focus:bg-white focus:border-purple-600 transition-all";
  }

  // --- MÁSCARAS ---
  function handleCpfCnpj(valor: string) {
    const apenasNumeros = valor.replace(/\D/g, "");
    setCpfCnpj(apenasNumeros);
  }

  function handleEstado(valor: string) {
    setEstado(valor.toUpperCase().slice(0, 2));
  }

  async function salvarCliente() {
    if (!cpfCnpj || !razaoSocial) {
      alert("Preencha os campos obrigatórios!");
      return;
    }

    const { error } = await supabase.from('clientes').insert({
      cpf_cnpj: cpfCnpj,
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      cidade,
      estado,
      logradouro,
      faturamento_anual: faturamento ? parseFloat(faturamento) : null,
      qtd_funcionarios: qtdFuncionarios ? parseInt(qtdFuncionarios) : null
    });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      // Limpar tudo
      setCpfCnpj(""); setRazaoSocial(""); setNomeFantasia("");
      setCidade(""); setEstado(""); setLogradouro("");
      setFaturamento(""); setQtdFuncionarios("");
      
      carregarClientes();
      alert("Cliente salvo com sucesso!");
      
      // TRUQUE: Vai para a lista automaticamente após salvar
      setAbaAtiva('lista');
    }
  }

  async function deletarCliente(id: number) {
    if (confirm("Tem certeza que deseja excluir?")) {
      await supabase.from('clientes').delete().eq('id', id);
      carregarClientes();
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Gerenciamento de Clientes</h1>

        {/* --- MENU DE ABAS (BOTÕES) --- */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1">
          <button 
            onClick={() => setAbaAtiva('lista')}
            className={`pb-2 px-4 font-bold text-lg transition-colors ${
              abaAtiva === 'lista' 
                ? 'text-purple-600 border-b-4 border-purple-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📋 Clientes Cadastrados
          </button>

          <button 
            onClick={() => setAbaAtiva('cadastro')}
            className={`pb-2 px-4 font-bold text-lg transition-colors ${
              abaAtiva === 'cadastro' 
                ? 'text-purple-600 border-b-4 border-purple-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ➕ Novo Cadastro
          </button>
        </div>


        {/* --- CONTEÚDO DA ABA: CADASTRO --- */}
        {abaAtiva === 'cadastro' && (
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600 animate-fade-in">
            <h2 className="font-bold text-lg text-gray-700 mb-6">Preencha os dados do cliente</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campos do Formulário (Mesmos de antes) */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">CNPJ/CPF:</label>
                <span className="text-xs text-red-500 font-bold block mb-1">* Obrigatório (Somente números)</span>
                <input type="text" placeholder="Digite aqui..." value={cpfCnpj} onChange={e => handleCpfCnpj(e.target.value)} className={getEstilo(cpfCnpj)} />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Razão Social:</label>
                <span className="text-xs text-red-500 font-bold block mb-1">* Obrigatório</span>
                <input type="text" placeholder="Digite a Razão Social..." value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className={getEstilo(razaoSocial)} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-1">Nome Fantasia:</label>
                <input type="text" placeholder="Digite o Nome Fantasia..." value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} className={getEstilo(nomeFantasia)} />
              </div>

              <div className="md:col-span-1">
                  <label className="block text-gray-700 font-bold mb-1">Cidade:</label>
                  <input type="text" placeholder="Cidade..." value={cidade} onChange={e => setCidade(e.target.value)} className={getEstilo(cidade)} />
              </div>

              <div className="md:col-span-1">
                  <label className="block text-gray-700 font-bold mb-1">Estado (UF):</label>
                  <input type="text" placeholder="Ex: MG" value={estado} onChange={e => handleEstado(e.target.value)} className={getEstilo(estado)} maxLength={2} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-1">Logradouro/Endereço:</label>
                <input type="text" placeholder="Rua, Número, Complemento..." value={logradouro} onChange={e => setLogradouro(e.target.value)} className={getEstilo(logradouro)} />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Faturamento Anual:</label>
                <input type="number" placeholder="R$ 0,00" value={faturamento} onChange={e => setFaturamento(e.target.value)} className={getEstilo(faturamento)} />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Quantidade de Funcionários:</label>
                <input type="number" placeholder="0" value={qtdFuncionarios} onChange={e => setQtdFuncionarios(e.target.value)} className={getEstilo(qtdFuncionarios)} />
              </div>
            </div>

            <button onClick={salvarCliente} className="mt-6 w-full bg-purple-600 text-white py-3 rounded font-bold hover:bg-purple-700 transition shadow-lg">
              SALVAR CADASTRO
            </button>
          </div>
        )}


        {/* --- CONTEÚDO DA ABA: LISTA --- */}
        {abaAtiva === 'lista' && (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100 animate-fade-in">
            
            {/* Se a lista estiver vazia, mostra aviso */}
            {clientes.length === 0 ? (
               <div className="p-8 text-center text-gray-500">
                  <p>Nenhum cliente cadastrado.</p>
                  <button onClick={() => setAbaAtiva('cadastro')} className="text-purple-600 font-bold mt-2 underline">Clique aqui para cadastrar o primeiro</button>
               </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-4">Razão Social / Fantasia</th>
                    <th className="p-4">Documento</th>
                    <th className="p-4">Local</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cli) => (
                    <tr key={cli.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-800 text-base">{cli.razao_social}</div>
                        <div className="text-xs text-gray-500 uppercase">{cli.nome_fantasia}</div>
                      </td>
                      <td className="p-4 font-mono text-gray-700 font-medium">{cli.cpf_cnpj}</td>
                      <td className="p-4 text-gray-600">
                        {cli.cidade} - {cli.estado}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => deletarCliente(cli.id)} className="text-red-500 hover:text-red-700 font-bold bg-red-50 px-3 py-1 rounded border border-red-100">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </main>
    </div>
  );
}