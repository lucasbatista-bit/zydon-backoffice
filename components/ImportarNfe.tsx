import React, { useState, ChangeEvent } from 'react';
import { XMLParser } from 'fast-xml-parser';

// Tipagem dos dados que vamos extrair
export interface ItemNota {
  codigo: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotalItem: number;
  ean: string;
}

export interface DadosNotaFiscal {
  numero: string;
  serie: string;
  emitente: string; // Fornecedor
  cnpjEmitente: string;
  dataEmissao: string;
  valorTotalNota: number;
  itens: ItemNota[];
}

interface ImportarNfeProps {
  aoLerNota: (dados: DadosNotaFiscal) => void;
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
        
        // Navegação segura pelo XML (pode variar a estrutura raiz)
        const nfeProc = result.nfeProc || result;
        const nfe = nfeProc.NFe || result.NFe;
        const infNFe = nfe?.infNFe;

        if (infNFe) {
            // --- 1. CABEÇALHO DA NOTA ---
            const ide = infNFe.ide;
            const emit = infNFe.emit;
            const total = infNFe.total?.ICMSTot;

            // Tratamento de Data (Pega YYYY-MM-DD)
            let dataBruta = ide.dhEmi || ide.dEmi || new Date().toISOString();
            if (typeof dataBruta === 'string' && dataBruta.includes('T')) {
                dataBruta = dataBruta.split('T')[0];
            }

            const cabecalho: DadosNotaFiscal = {
                numero: String(ide.nNF),
                serie: String(ide.serie),
                emitente: String(emit.xNome),
                cnpjEmitente: String(emit.CNPJ),
                dataEmissao: dataBruta,
                valorTotalNota: Number(total?.vNF || 0),
                itens: []
            };

            // --- 2. ITENS DA NOTA ---
            // O fast-xml-parser retorna objeto se for 1 item, e array se forem vários.
            // Vamos normalizar para sempre ser um array.
            const detRaw = infNFe.det;
            const listaItensXML = Array.isArray(detRaw) ? detRaw : [detRaw];

            const itensProcessados: ItemNota[] = listaItensXML.map((item: any) => {
                const prod = item.prod;
                return {
                    codigo: String(prod.cProd),
                    descricao: String(prod.xProd),
                    ncm: String(prod.NCM),
                    cest: String(prod.CEST || ''),
                    cfop: String(prod.CFOP),
                    unidade: String(prod.uCom),
                    quantidade: Number(prod.qCom),
                    valorUnitario: Number(prod.vUnCom),
                    valorTotalItem: Number(prod.vProd),
                    ean: String(prod.cEAN !== "SEM GTIN" ? prod.cEAN : "")
                };
            });

            cabecalho.itens = itensProcessados;

            // Devolve tudo para a tela principal
            if (aoLerNota) aoLerNota(cabecalho);

        } else {
            alert("XML inválido ou estrutura não reconhecida.");
        }

      } catch (error) {
        console.error("Erro ao ler XML:", error);
        alert("Falha ao processar o arquivo XML.");
      } finally {
        setLoading(false);
        if (event.target) event.target.value = ''; 
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition cursor-pointer text-center h-full">
      <div className="text-4xl mb-2">📄</div>
      <h3 className="text-blue-800 font-bold mb-1">Importar XML da Nota</h3>
      <p className="text-xs text-blue-600 mb-4">Processamento automático de múltiplos itens</p>
      
      <label className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 cursor-pointer text-sm font-bold">
        Escolher Arquivo
        <input type="file" accept=".xml" onChange={handleFileUpload} className="hidden" />
      </label>
      
      {loading && <p className="mt-2 text-blue-600 font-bold animate-pulse text-xs">Lendo arquivo...</p>}
    </div>
  );
}