import * as XLSX from "xlsx";

function extrairEstadoComSigla(numeroProcesso) {
    const regex = /\.([0-9]{2})\./;
    const match = numeroProcesso.match(regex);

    if (match && match[1]) {
        const estados = {
            '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
            '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
            '11': 'MS', '12': 'MT', '13': 'MG', '14': 'PA', '15': 'PB',
            '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
            '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SP',
            '26': 'SE', '27': 'TO'
        };
        return estados[match[1]] || null;
    }
    return null;
}

function processarArquivoXLSX(arrayBuffer) {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const processosPorEstado = {};
        
        const dados = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        dados.forEach((linha) => {
            linha.forEach((celula) => {
                if (typeof celula === "string" && celula.includes("-")) {
                    const estadoSigla = extrairEstadoComSigla(celula);
                    if (estadoSigla) {
                        if (!processosPorEstado[estadoSigla]) {
                            processosPorEstado[estadoSigla] = [];
                        }
                        processosPorEstado[estadoSigla].push(celula);
                    }
                }
            });
        }); 

        return processosPorEstado;
    } catch (error) {
        console.error("Erro ao processar o arquivo XLSX:", error);
        return {};
    }
}

export default processarArquivoXLSX;
