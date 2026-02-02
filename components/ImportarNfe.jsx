import React, { useState } from 'react';
import { XMLParser } from 'fast-xml-parser';

// Note que aqui removemos o ": any" que estava causando o erro
export default function ImportarNfe({ aoLerNota }) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const xmlContent = e.target?.result;
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: ""
      });

      try {
        const result = parser.parse(xmlContent);
        
        const dadosNfe = result.nfeProc?.NFe?.infNFe || result.NFe?.infNFe;
        
        if (dadosNfe) {
            const listaDet = Array.isArray(dadosNfe.det) ? dadosNfe.det : [dadosNfe.det];
            const primeiroProduto = listaDet[0];

            const nomeProduto = primeiroProduto.prod.xProd;
            const precoProduto = primeiroProduto.prod.vUnCom; 

            console.log("📦 Produto Encontrado:", nomeProduto, precoProduto);
            
            if (aoLerNota) {
                aoLerNota({ nome: nomeProduto, preco: precoProduto });
            }
            
            alert(`Sucesso! Carregamos: ${nomeProduto}`);
        } else {
            alert("Estrutura da nota não identificada.");
        }

      } catch (error) {
        console.error("Erro ao ler XML", error);
        alert("Erro ao ler o arquivo XML.");
      } finally {
        setLoading(false);
        event.target.value = ''; 
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-4 border border-dashed border-gray-400 rounded-lg text-center bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Importar XML da Nota (NF-e)</h3>
      <p className="text-sm text-gray-500 mb-4">Selecione o arquivo .xml para preencher o formulário</p>
      
      <input 
        type="file" 
        accept=".xml" 
        onChange={handleFileUpload}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
      />
      
      {loading && <p className="mt-2 text-blue-600">Lendo arquivo...</p>}
    </div>
  );
}