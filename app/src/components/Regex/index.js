import * as XLSX from "xlsx";

function extrairEstadoOuTRF(numeroProcesso) {
    const regexEstado = /\.8\.([0-9]{2})\./;
    const regexTRF = /\.4\.([0-9]{2})\./;

    const matchEstado = numeroProcesso.match(regexEstado);
    const matchTRF = numeroProcesso.match(regexTRF);

    const estados = {
        '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
        '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
        '11': 'MT', '12': 'MS', '13': 'MG', '14': 'PA', '15': 'PB',
        '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
        '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SP',
        '26': 'SE', '27': 'TO'
    };

    const trfs = {
        '01': 'TRF1', '02': 'TRF2', '03': 'TRF3',
        '04': 'TRF4', '05': 'TRF5', '06': 'TRF6'
    };

    if (matchTRF && matchTRF[1]) {
        return trfs[matchTRF[1]] || null;
    }

    if (matchEstado && matchEstado[1]) {
        return estados[matchEstado[1]] || null;
    }

    return null;
}

function processarArquivoXLSX(arrayBuffer) {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const processosPorRegiao = {};
        
        const dados = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        dados.forEach((linha) => {
            linha.forEach((celula) => {
                if (typeof celula === "string" && celula.includes("-")) {
                    const regiao = extrairEstadoOuTRF(celula);
                    if (regiao) {
                        if (!processosPorRegiao[regiao]) {
                            processosPorRegiao[regiao] = [];
                        }
                        processosPorRegiao[regiao].push(celula);
                    }
                }
            });
        }); 

        return processosPorRegiao;
    } catch (error) {
        console.error("Erro ao processar o arquivo XLSX:", error);
        return {};
    }
}

export default processarArquivoXLSX;
