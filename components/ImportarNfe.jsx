import React, { useState } from 'react';
import { XMLParser } from 'fast-xml-parser';

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
        
        // Tenta achar a nota em diferentes caminhos
        const dadosNfe = result.nfeProc?.NFe?.infNFe || result.NFe?.infNFe;
        
        if (dadosNfe) {
            // Garante que é array
            const listaDet = Array.isArray(dadosNfe.det) ? dadosNfe.det : [dadosNfe.det];
            const primeiroProduto = listaDet[0];

            // Pega dados seguros
            const nomeProduto = primeiroProduto?.prod?.xProd || "Produto Desconhecido";
            const precoProduto = primeiroProduto?.prod?.vUnCom || "0";

            console.log("📦 Produto:", nomeProduto, precoProduto);
            
            if (aoLerNota) {
                aoLerNota({ nome: nomeProduto, preco: precoProduto });
            }
            
            alert(`Leitura concluída: ${nomeProduto}`);
        } else {
            alert("Não foi possível ler os dados da nota. Verifique o XML.");
        }

      } catch (error) {
        console.error("Erro XML:", error);
        alert("Erro ao processar o arquivo.");
      } finally {
        setLoading(false);
        event.target.value = ''; 
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-4 border border-dashed border-gray-400 rounded-lg text-center bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Importar XML</h3>
      <p className="text-sm text-gray-500 mb-4">Selecione o arquivo .xml</p>
      
      <input 
        type="file" 
        accept=".xml" 
        onChange={handleFileUpload}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      
      {loading && <p className="mt-2 text-blue-600">Lendo...</p>}
    </div>
  );
}