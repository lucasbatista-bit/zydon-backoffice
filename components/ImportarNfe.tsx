import React, { useState, ChangeEvent } from 'react';
import { XMLParser } from 'fast-xml-parser';

// Aqui definimos as regras do que esse componente aceita
interface ImportarNfeProps {
  aoLerNota: (dados: { nome: string; preco: string; ean: string; ncm: string; sku: string }) => void;
}

export default function ImportarNfe({ aoLerNota }: ImportarNfeProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const xmlContent = e.target?.result;
      
      if (typeof xmlContent !== 'string') {
          setLoading(false);
          return;
      }

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

            const nomeProduto = primeiroProduto?.prod?.xProd || "";
            const precoProduto = primeiroProduto?.prod?.vUnCom || "";
            const eanProduto = primeiroProduto?.prod?.cEAN || ""; 
            const ncmProduto = primeiroProduto?.prod?.NCM || ""; 
            const skuProduto = primeiroProduto?.prod?.cProd || ""; 

            console.log("📦 Produto Lido:", nomeProduto);
            
            if (aoLerNota) {
                aoLerNota({ 
                  nome: String(nomeProduto), 
                  preco: String(precoProduto),
                  ean: String(eanProduto === "SEM GTIN" ? "" : eanProduto),
                  ncm: String(ncmProduto),
                  sku: String(skuProduto)
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
        // Limpa o input
        if (event.target) event.target.value = ''; 
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