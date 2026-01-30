'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome');
    setClientes(data || []);
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  async function salvarCliente() {
    if (!novoNome) return alert("Preencha o nome!");

    const { error } = await supabase.from('clientes').insert({
      nome: novoNome,
      telefone: novoTelefone,
      email: novoEmail
    });

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setNovoNome("");
      setNovoTelefone("");
      setNovoEmail("");
      carregarClientes();
      alert("Cliente cadastrado com sucesso!");
    }
  }

  async function deletarCliente(id: number) {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      await supabase.from('clientes').delete().eq('id', id);
      carregarClientes();
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Base de Clientes</h1>

        {/* --- FORMULÁRIO DE CADASTRO --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-purple-600">
          <h2 className="font-bold text-lg text-gray-700 mb-4">Novo Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Nome Completo *" 
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              className="border p-2 rounded outline-purple-500"
            />
            <input 
              type="text" 
              placeholder="Telefone / WhatsApp" 
              value={novoTelefone}
              onChange={e => setNovoTelefone(e.target.value)}
              className="border p-2 rounded outline-purple-500"
            />
            <input 
              type="email" 
              placeholder="E-mail" 
              value={novoEmail}
              onChange={e => setNovoEmail(e.target.value)}
              className="border p-2 rounded outline-purple-500"
            />
          </div>
          <button 
            onClick={salvarCliente}
            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700"
          >
            CADASTRAR CLIENTE
          </button>
        </div>

        {/* --- LISTAGEM --- */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Contato</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cli) => (
                <tr key={cli.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-700">{cli.nome}</td>
                  <td className="p-4">
                    <div className="text-sm">{cli.telefone}</div>
                    <div className="text-xs text-gray-400">{cli.email}</div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => deletarCliente(cli.id)} className="text-red-500 hover:text-red-700 font-bold text-sm">
                      Excluir
                    </button>
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