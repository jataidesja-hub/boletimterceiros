// =====================================================
// BOLETIM DIÁRIO - TRANSPORTES DE TRABALHADORES
// Google Apps Script Backend
// =====================================================

// ID da planilha - SUBSTITUIR pelo ID real da sua planilha Google Sheets
const SPREADSHEET_ID = '1LMQcwrQUvXJBzY-FyOYs0WW8tRWTmFhHY208utKatYA';

// Nomes das abas
const ABA_BOLETINS = 'Boletins';
const ABA_REGISTROS = 'Registros';
const ABA_TRANSPORTADORES = 'Transportadores';
const ABA_MOTORISTAS = 'Motoristas';
const ABA_VEICULOS = 'Veiculos';
const ABA_ROTAS = 'Rotas';
const ABA_PAGINA1 = 'Página1';

// =====================================================
// CONFIGURAÇÃO INICIAL DA PLANILHA
// =====================================================
function configurarPlanilha() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Aba Boletins (cabeçalho do boletim)
  let abaBoletins = ss.getSheetByName(ABA_BOLETINS);
  if (!abaBoletins) {
    abaBoletins = ss.insertSheet(ABA_BOLETINS);
  }
  abaBoletins.clear();
  abaBoletins.getRange('A1:H1').setValues([[
    'ID', 'Transportador', 'Motorista', 'Placa', 'Cod_Veiculo', 'Rota', 'Mes_Referencia', 'Data_Criacao'
  ]]);
  abaBoletins.getRange('A1:H1').setFontWeight('bold');
  abaBoletins.setFrozenRows(1);

  // Aba Registros (linhas diárias)
  let abaRegistros = ss.getSheetByName(ABA_REGISTROS);
  if (!abaRegistros) {
    abaRegistros = ss.insertSheet(ABA_REGISTROS);
  }
  abaRegistros.clear();
  abaRegistros.getRange('A1:N1').setValues([[
    'Boletim_ID', 'Data', 'Dia_Semana',
    'Hora_Inicial_Ida', 'KM_Inicial_Ida', 'Hora_Final_Ida', 'Num_Pessoas_Ida',
    'Hora_Inicial_Volta', 'KM_Final_Volta', 'Hora_Final_Volta', 'Num_Pessoas_Volta',
    'Obj_Custo', 'KM_Rodados', 'Assinatura'
  ]]);
  abaRegistros.getRange('A1:N1').setFontWeight('bold');
  abaRegistros.setFrozenRows(1);

  // Aba Transportadores (cadastro)
  let abaTransp = ss.getSheetByName(ABA_TRANSPORTADORES);
  if (!abaTransp) {
    abaTransp = ss.insertSheet(ABA_TRANSPORTADORES);
  }
  abaTransp.clear();
  abaTransp.getRange('A1:B1').setValues([['ID', 'Nome']]);
  abaTransp.getRange('A1:B1').setFontWeight('bold');
  abaTransp.setFrozenRows(1);

  // Aba Motoristas (cadastro)
  let abaMotoristas = ss.getSheetByName(ABA_MOTORISTAS);
  if (!abaMotoristas) {
    abaMotoristas = ss.insertSheet(ABA_MOTORISTAS);
  }
  abaMotoristas.clear();
  abaMotoristas.getRange('A1:C1').setValues([['ID', 'Nome', 'Transportador']]);
  abaMotoristas.getRange('A1:C1').setFontWeight('bold');
  abaMotoristas.setFrozenRows(1);

  // Aba Veículos (cadastro)
  let abaVeiculos = ss.getSheetByName(ABA_VEICULOS);
  if (!abaVeiculos) {
    abaVeiculos = ss.insertSheet(ABA_VEICULOS);
  }
  abaVeiculos.clear();
  abaVeiculos.getRange('A1:D1').setValues([['ID', 'Placa', 'Cod_Veiculo', 'Transportador']]);
  abaVeiculos.getRange('A1:D1').setFontWeight('bold');
  abaVeiculos.setFrozenRows(1);

  // Aba Rotas (cadastro)
  let abaRotas = ss.getSheetByName(ABA_ROTAS);
  if (!abaRotas) {
    abaRotas = ss.insertSheet(ABA_ROTAS);
  }
  abaRotas.clear();
  abaRotas.getRange('A1:B1').setValues([['ID', 'Nome']]);
  abaRotas.getRange('A1:B1').setFontWeight('bold');
  abaRotas.setFrozenRows(1);

  // Remover aba padrão "Sheet1" se existir
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1) {
    ss.deleteSheet(sheet1);
  }

  Logger.log('Planilha configurada com sucesso!');
}

// =====================================================
// WEB APP ENDPOINTS
// =====================================================
function doGet(e) {
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'getTransportadores':
        return jsonResponse(getTransportadores());
      case 'getMotoristas':
        return jsonResponse(getMotoristas(e.parameter.transportador));
      case 'getVeiculos':
        return jsonResponse(getVeiculos(e.parameter.transportador));
      case 'getRotas':
        return jsonResponse(getRotas());
      case 'getBoletins':
        return jsonResponse(getBoletins());
      case 'getBoletim':
        return jsonResponse(getBoletim(e.parameter.id));
      case 'getRegistros':
        return jsonResponse(getRegistros(e.parameter.boletimId));
      case 'buscarVeiculoPorCodigo':
        return jsonResponse(buscarVeiculoPorCodigo(e.parameter.codigo));
      default:
        return jsonResponse({ error: 'Ação não reconhecida' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'criarBoletim':
        return jsonResponse(criarBoletim(data));
      case 'salvarRegistro':
        return jsonResponse(salvarRegistro(data));
      case 'salvarRegistros':
        return jsonResponse(salvarRegistros(data));
      case 'editarRegistro':
        return jsonResponse(editarRegistro(data));
      case 'excluirRegistro':
        return jsonResponse(excluirRegistro(data));
      case 'adicionarTransportador':
        return jsonResponse(adicionarTransportador(data));
      case 'adicionarMotorista':
        return jsonResponse(adicionarMotorista(data));
      case 'adicionarVeiculo':
        return jsonResponse(adicionarVeiculo(data));
      case 'adicionarRota':
        return jsonResponse(adicionarRota(data));
      case 'excluirBoletim':
        return jsonResponse(excluirBoletim(data));
      default:
        return jsonResponse({ error: 'Ação não reconhecida' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
// FUNÇÕES DE CADASTRO (GET)
// =====================================================
function getTransportadores() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_TRANSPORTADORES);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    resultado.push({ id: dados[i][0], nome: dados[i][1] });
  }
  return { success: true, data: resultado };
}

function getMotoristas(transportador) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_MOTORISTAS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    if (!transportador || dados[i][2] === transportador) {
      resultado.push({ id: dados[i][0], nome: dados[i][1], transportador: dados[i][2] });
    }
  }
  return { success: true, data: resultado };
}

function getVeiculos(transportador) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_VEICULOS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    if (!transportador || dados[i][3] === transportador) {
      resultado.push({ id: dados[i][0], placa: dados[i][1], codVeiculo: dados[i][2], transportador: dados[i][3] });
    }
  }
  return { success: true, data: resultado };
}

function getRotas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_ROTAS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    resultado.push({ id: dados[i][0], nome: dados[i][1] });
  }
  return { success: true, data: resultado };
}

// =====================================================
// FUNÇÕES DE BOLETIM
// =====================================================
function getBoletins() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    resultado.push({
      id: dados[i][0],
      transportador: dados[i][1],
      motorista: dados[i][2],
      placa: dados[i][3],
      codVeiculo: dados[i][4],
      rota: dados[i][5],
      mesReferencia: dados[i][6],
      dataCriacao: dados[i][7]
    });
  }
  return { success: true, data: resultado };
}

function getBoletim(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] == id) {
      return {
        success: true,
        data: {
          id: dados[i][0],
          transportador: dados[i][1],
          motorista: dados[i][2],
          placa: dados[i][3],
          codVeiculo: dados[i][4],
          rota: dados[i][5],
          mesReferencia: dados[i][6],
          dataCriacao: dados[i][7]
        }
      };
    }
  }
  return { success: false, error: 'Boletim não encontrado' };
}

function criarBoletim(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const id = Utilities.getUuid();

  aba.appendRow([
    id,
    data.transportador,
    data.motorista,
    data.placa,
    data.codVeiculo,
    data.rota,
    data.mesReferencia,
    new Date().toISOString()
  ]);

  return { success: true, id: id, message: 'Boletim criado com sucesso!' };
}

function excluirBoletim(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Excluir registros do boletim
  const abaReg = ss.getSheetByName(ABA_REGISTROS);
  const dadosReg = abaReg.getDataRange().getValues();
  for (let i = dadosReg.length - 1; i >= 1; i--) {
    if (dadosReg[i][0] == data.id) {
      abaReg.deleteRow(i + 1);
    }
  }

  // Excluir o boletim
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] == data.id) {
      aba.deleteRow(i + 1);
      return { success: true, message: 'Boletim excluído com sucesso!' };
    }
  }
  return { success: false, error: 'Boletim não encontrado' };
}

// =====================================================
// FUNÇÕES DE REGISTROS DIÁRIOS
// =====================================================
function getRegistros(boletimId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] == boletimId) {
      resultado.push({
        rowIndex: i + 1,
        boletimId: dados[i][0],
        data: dados[i][1],
        diaSemana: dados[i][2],
        horaInicialIda: dados[i][3],
        kmInicialIda: dados[i][4],
        horaFinalIda: dados[i][5],
        numPessoasIda: dados[i][6],
        horaInicialVolta: dados[i][7],
        kmFinalVolta: dados[i][8],
        horaFinalVolta: dados[i][9],
        numPessoasVolta: dados[i][10],
        objCusto: dados[i][11],
        kmRodados: dados[i][12],
        assinatura: dados[i][13]
      });
    }
  }
  return { success: true, data: resultado };
}

function salvarRegistro(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);

  const kmRodados = (parseFloat(data.kmFinalVolta) || 0) - (parseFloat(data.kmInicialIda) || 0);

  aba.appendRow([
    data.boletimId,
    data.data,
    data.diaSemana,
    data.horaInicialIda,
    data.kmInicialIda,
    data.horaFinalIda,
    data.numPessoasIda,
    data.horaInicialVolta,
    data.kmFinalVolta,
    data.horaFinalVolta,
    data.numPessoasVolta,
    data.objCusto,
    kmRodados,
    data.assinatura || ''
  ]);

  return { success: true, message: 'Registro salvo com sucesso!' };
}

function salvarRegistros(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  const registros = data.registros;
  let count = 0;

  for (const reg of registros) {
    const kmRodados = (parseFloat(reg.kmFinalVolta) || 0) - (parseFloat(reg.kmInicialIda) || 0);
    aba.appendRow([
      data.boletimId,
      reg.data,
      reg.diaSemana,
      reg.horaInicialIda,
      reg.kmInicialIda,
      reg.horaFinalIda,
      reg.numPessoasIda,
      reg.horaInicialVolta,
      reg.kmFinalVolta,
      reg.horaFinalVolta,
      reg.numPessoasVolta,
      reg.objCusto,
      kmRodados,
      reg.assinatura || ''
    ]);
    count++;
  }

  return { success: true, message: count + ' registros salvos com sucesso!' };
}

function editarRegistro(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  const rowIndex = data.rowIndex;

  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de linha inválido' };
  }

  const kmRodados = (parseFloat(data.kmFinalVolta) || 0) - (parseFloat(data.kmInicialIda) || 0);

  aba.getRange(rowIndex, 2, 1, 13).setValues([[
    data.data,
    data.diaSemana,
    data.horaInicialIda,
    data.kmInicialIda,
    data.horaFinalIda,
    data.numPessoasIda,
    data.horaInicialVolta,
    data.kmFinalVolta,
    data.horaFinalVolta,
    data.numPessoasVolta,
    data.objCusto,
    kmRodados,
    data.assinatura || ''
  ]]);

  return { success: true, message: 'Registro atualizado com sucesso!' };
}

function excluirRegistro(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  const rowIndex = data.rowIndex;

  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de linha inválido' };
  }

  aba.deleteRow(rowIndex);
  return { success: true, message: 'Registro excluído com sucesso!' };
}

// =====================================================
// FUNÇÕES DE CADASTRO (POST)
// =====================================================
function adicionarTransportador(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_TRANSPORTADORES);
  const id = Utilities.getUuid();
  aba.appendRow([id, data.nome]);
  return { success: true, id: id, message: 'Transportador adicionado!' };
}

function adicionarMotorista(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_MOTORISTAS);
  const id = Utilities.getUuid();
  aba.appendRow([id, data.nome, data.transportador]);
  return { success: true, id: id, message: 'Motorista adicionado!' };
}

function adicionarVeiculo(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_VEICULOS);
  const id = Utilities.getUuid();
  aba.appendRow([id, data.placa, data.codVeiculo, data.transportador]);
  return { success: true, id: id, message: 'Veículo adicionado!' };
}

function adicionarRota(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_ROTAS);
  const id = Utilities.getUuid();
  aba.appendRow([id, data.nome]);
  return { success: true, id: id, message: 'Rota adicionada!' };
}

// =====================================================
// BUSCAR VEÍCULO POR CÓDIGO NA PÁGINA1
// Página1: A=Fornecedor, B=Cod, C=cod.fornecedor, D=placa, E=Rota
// =====================================================
function buscarVeiculoPorCodigo(codigo) {
  if (!codigo) return { success: false, error: 'Código não informado' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_PAGINA1);
  if (!aba) return { success: false, error: 'Aba Página1 não encontrada' };
  const dados = aba.getDataRange().getValues();
  const codigoBusca = String(codigo).trim();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][1]).trim() == codigoBusca) {
      return {
        success: true,
        data: {
          transportador: dados[i][0],
          codVeiculo: dados[i][1],
          codFornecedor: dados[i][2],
          placa: dados[i][3],
          rota: dados[i][4]
        }
      };
    }
  }
  return { success: false, error: 'Veículo com código ' + codigo + ' não encontrado' };
}
