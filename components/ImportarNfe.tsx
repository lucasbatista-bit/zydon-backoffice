import React, { useState, ChangeEvent } from 'react';
import { XMLParser } from 'fast-xml-parser';

interface DadosNota {
  nome: string;
  preco: string;
  ean: string;
  ncm: string;
  sku: string;
  quantidade: number;
  valorTotalNota: number;
  dataEmissao: string;
  numeroNota: string;
}

interface ImportarNfeProps {
  aoLerNota: (dados: DadosNota) => void;
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
        
        // Tenta achar a raiz da nota (vários formatos possíveis)
        const nfeProc = result.nfeProc || result;
        const nfe = nfeProc.NFe || result.NFe;
        const infNFe = nfe?.infNFe;
        
        if (infNFe) {
            // 1. Dados do Produto (Pega o primeiro item da nota)
            const det = Array.isArray(infNFe.det) ? infNFe.det[0] : infNFe.det;
            const prod = det.prod;

            // 2. Dados da Nota (Total e Data)
            // Tenta pegar o total, se falhar assume 0
            const totalNota = infNFe.total?.ICMSTot?.vNF || 0;
            
            // Tenta pegar a data, se falhar assume hoje
            let dataBruta = infNFe.ide?.dhEmi || infNFe.ide?.dEmi || new Date().toISOString();
            if (typeof dataBruta === 'string' && dataBruta.includes('T')) {
                dataBruta = dataBruta.split('T')[0];
            }

            const numeroNota = infNFe.ide?.nNF || "S/N";

            // Envia para o formulário
            if (aoLerNota) {
                aoLerNota({ 
                  nome: String(prod.xProd), 
                  preco: String(prod.vUnCom),
                  ean: String(prod.cEAN === "SEM GTIN" ? "" : prod.cEAN),
                  ncm: String(prod.NCM),
                  sku: String(prod.cProd),
                  quantidade: Number(prod.qCom),
                  valorTotalNota: Number(totalNota),
                  dataEmissao: dataBruta,
                  numeroNota: String(numeroNota)
                });
            }
            
            // Removemos o alert daqui para não travar a tela
            console.log("Leitura XML ok");

        } else {
            console.error("Estrutura infNFe não encontrada");
            alert("O arquivo não parece ser uma NF-e válida.");
        }

      } catch (error) {
        console.error("Erro XML:", error);
        // Só avisa erro se realmente não conseguiu ler nada
        alert("Erro ao ler o XML. Verifique se o arquivo é válido.");
      } finally {
        setLoading(false);
        if (event.target) event.target.value = ''; 
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-6 border-2 border-dashed border-blue-200 rounded-xl text-center bg-blue-50 hover:bg-blue-100 transition cursor-pointer group h-full flex flex-col justify-center items-center">
      <h3 className="text-blue-800 font-bold mb-1 group-hover:scale-105 transition">📂 Importar XML (NF-e)</h3>
      <p className="text-xs text-blue-600 mb-4">Carregar Nota Fiscal</p>
      
      <input 
        type="file" 
        accept=".xml" 
        onChange={handleFileUpload}
        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
      />
      
      {loading && <p className="mt-2 text-blue-600 font-bold animate-pulse">Lendo nota...</p>}
    </div>
  );
}