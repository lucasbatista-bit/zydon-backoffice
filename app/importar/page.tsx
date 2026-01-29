'use client'
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function Importar() {
  const [texto, setTexto] = useState("");
  const [status, setStatus] = useState("");

  async function processarImportacao() {
    setStatus("⏳ Processando...");
    
    // 1. Quebra o texto em linhas
    const linhas = texto.split("\n");
    const produtosParaSalvar = [];

    for (const linha of linhas) {
      // Exemplo de linha: "Caneta Azul, 2.50, 100"
      const dados = linha.split(","); // Quebra pela vírgula
      
      if (dados.length >= 3) {
        const nome = dados[0].trim();
        const preco = parseFloat(dados[1].trim());
        const estoque = parseInt(dados[2].trim());

        if (nome && preco) {
          produtosParaSalvar.push({ nome, preco, estoque });
        }
      }
    }

    if (produtosParaSalvar.length === 0) {
      return setStatus("🔴 Nenhum produto válido encontrado. Verifique o formato.");
    }

    // 2. Envia tudo para o Supabase de uma vez
    const { error } = await supabase.from('produtos').insert(produtosParaSalvar);

    if (error) {
      setStatus("🔴 Erro ao importar: " + error.message);
    } else {
      setStatus(`🟢 Sucesso! ${produtosParaSalvar.length} produtos importados.`);
      setTexto(""); // Limpa a caixa
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Importação em Massa</h1>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-bold mb-2">Cole sua lista abaixo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Formato: <strong>Nome do Produto, Preço, Quantidade</strong> (um por linha).
            <br/>
            Exemplo:<br/>
            <i>Cabo HDMI, 25.90, 50<br/>Monitor LED, 800.00, 5</i>
          </p>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            className="w-full border p-4 rounded bg-gray-50 font-mono text-sm"
            placeholder="Cole aqui..."
          ></textarea>

          <div className="mt-4 flex justify-between items-center">
            <p className="font-bold text-blue-600">{status}</p>
            <button 
              onClick={processarImportacao}
              className="bg-green-600 text-white px-8 py-3 rounded hover:bg-green-700 font-bold"
            >
              IMPORTAR AGORA
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}