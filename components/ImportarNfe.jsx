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
        
        const dadosNfe = result.nfeProc?.NFe?.infNFe || result.NFe?.infNFe;
        
        if (dadosNfe) {
            const listaDet = Array.isArray(dadosNfe.det) ? dadosNfe.det : [dadosNfe.det];
            const primeiroProduto = listaDet[0];

            // Pega dados seguros e AGORA PEGA OS NOVOS CAMPOS TAMBÉM
            const nomeProduto = primeiroProduto?.prod?.xProd || "";
            const precoProduto = primeiroProduto?.prod?.vUnCom || "";
            const eanProduto = primeiroProduto?.prod?.cEAN || ""; // Código de Barras
            const ncmProduto = primeiroProduto?.prod?.NCM || ""; // Código Fiscal
            const skuProduto = primeiroProduto?.prod?.cProd || ""; // Código do Produto no fornecedor

            console.log("📦 Produto:", nomeProduto, precoProduto, eanProduto);
            
            if (aoLerNota) {
                aoLerNota({ 
                  nome: nomeProduto, 
                  preco: precoProduto,
                  ean: eanProduto,
                  ncm: ncmProduto,
                  sku: skuProduto
                });
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
    <div className="p-6 border-2 border-dashed border-blue-200 rounded-xl text-center bg-blue-50 hover:bg-blue-100 transition cursor-pointer group">
      <h3 className="text-blue-800 font-bold mb-1 group-hover:scale-105 transition">Importar XML (NF-e)</h3>
      <p className="text-xs text-blue-600 mb-4">Preenche EAN, NCM e SKU automaticamente</p>
      
      <input 
        type="file" 
        accept=".xml" 
        onChange={handleFileUpload}
        className="block w-full text-xs text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-xs file:font-semibold
          file:bg-blue-600 file:text-white
          hover:file:bg-blue-700 cursor-pointer"
      />
      
      {loading && <p className="mt-2 text-blue-600 font-bold animate-pulse">Lendo nota...</p>}
    </div>
  );
}