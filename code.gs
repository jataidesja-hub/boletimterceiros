// =====================================================
// BOLETIM DIÁRIO - TRANSPORTES DE TRABALHADORES
// Google Apps Script Backend (v2 - com Login)
// =====================================================

const SPREADSHEET_ID = '1LMQcwrQUvXJBzY-FyOYs0WW8tRWTmFhHY208utKatYA';

// Nomes das abas
const ABA_BOLETINS = 'Boletins';
const ABA_REGISTROS = 'Registros';
const ABA_USUARIOS = 'Usuarios';
const ABA_PAGINA1 = 'Página1';

// =====================================================
// CONFIGURAÇÃO INICIAL DA PLANILHA
// =====================================================
function configurarPlanilha() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Aba Usuarios (login motoristas)
  let abaUsuarios = ss.getSheetByName(ABA_USUARIOS);
  if (!abaUsuarios) {
    abaUsuarios = ss.insertSheet(ABA_USUARIOS);
  }
  abaUsuarios.clear();
  abaUsuarios.getRange('A1:D1').setValues([['Usuario', 'Senha', 'Nome_Completo', 'Perfil']]);
  abaUsuarios.getRange('A1:D1').setFontWeight('bold');
  abaUsuarios.setFrozenRows(1);
  // Adicionar admin padrão
  abaUsuarios.appendRow(['admin', 'admin123', 'Administrador', 'admin']);

  // Aba Boletins
  let abaBoletins = ss.getSheetByName(ABA_BOLETINS);
  if (!abaBoletins) {
    abaBoletins = ss.insertSheet(ABA_BOLETINS);
  }
  abaBoletins.clear();
  abaBoletins.getRange('A1:I1').setValues([[
    'ID', 'Transportador', 'Motorista', 'Placa', 'Cod_Veiculo', 'Rota', 'Mes_Referencia', 'Data_Criacao', 'Usuario'
  ]]);
  abaBoletins.getRange('A1:I1').setFontWeight('bold');
  abaBoletins.setFrozenRows(1);

  // Aba Registros
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

  Logger.log('Planilha configurada com sucesso!');
}

// =====================================================
// WEB APP ENDPOINTS
// =====================================================
function doGet(e) {
  const action = e.parameter.action;
  try {
    switch (action) {
      case 'login':
        return jsonResponse(login(e.parameter.usuario, e.parameter.senha));
      case 'getVeiculosMotorista':
        return jsonResponse(getVeiculosMotorista(e.parameter.motorista));
      case 'getBoletins':
        return jsonResponse(getBoletins(e.parameter.usuario));
      case 'getBoletim':
        return jsonResponse(getBoletim(e.parameter.id));
      case 'getRegistros':
        return jsonResponse(getRegistros(e.parameter.boletimId));
      case 'buscarVeiculoPorCodigo':
        return jsonResponse(buscarVeiculoPorCodigo(e.parameter.codigo));
      case 'getUsuarios':
        return jsonResponse(getUsuarios());
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
      case 'editarRegistro':
        return jsonResponse(editarRegistro(data));
      case 'excluirRegistro':
        return jsonResponse(excluirRegistro(data));
      case 'excluirBoletim':
        return jsonResponse(excluirBoletim(data));
      case 'cadastrarUsuario':
        return jsonResponse(cadastrarUsuario(data));
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
// HELPERS DE FORMATAÇÃO
// =====================================================
function formatarData(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  return String(val);
}

function formatarHora(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'America/Sao_Paulo', 'HH:mm');
  }
  return String(val);
}

function fmtCell(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) return String(val);
  return String(val);
}

// =====================================================
// LOGIN
// =====================================================
function login(usuario, senha) {
  if (!usuario || !senha) return { success: false, error: 'Usuário e senha obrigatórios' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_USUARIOS);
  if (!aba) return { success: false, error: 'Aba Usuarios não encontrada. Execute configurarPlanilha.' };
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toLowerCase() === String(usuario).trim().toLowerCase() &&
        String(dados[i][1]).trim() === String(senha).trim()) {
      return {
        success: true,
        data: {
          usuario: dados[i][0],
          nomeCompleto: dados[i][2],
          perfil: dados[i][3] || 'motorista'
        }
      };
    }
  }
  return { success: false, error: 'Usuário ou senha inválidos' };
}

function getUsuarios() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_USUARIOS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    resultado.push({
      usuario: dados[i][0],
      nomeCompleto: dados[i][2],
      perfil: dados[i][3] || 'motorista'
    });
  }
  return { success: true, data: resultado };
}

function cadastrarUsuario(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_USUARIOS);
  // Verificar se já existe
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toLowerCase() === String(data.usuario).trim().toLowerCase()) {
      return { success: false, error: 'Usuário já existe' };
    }
  }
  aba.appendRow([data.usuario, data.senha, data.nomeCompleto, data.perfil || 'motorista']);
  return { success: true, message: 'Usuário cadastrado com sucesso!' };
}

// =====================================================
// VEÍCULOS DO MOTORISTA (PÁGINA1)
// Página1: A=Fornecedor(Transportador), B=Cod, C=cod.fornecedor, D=placa, E=Rota
// =====================================================
function getVeiculosMotorista(motorista) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_PAGINA1);
  if (!aba) return { success: false, error: 'Aba Página1 não encontrada' };
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  const nomeBusca = String(motorista).trim().toUpperCase();
  for (let i = 1; i < dados.length; i++) {
    // Retorna todos os veículos (o motorista escolhe qual está dirigindo)
    resultado.push({
      transportador: String(dados[i][0]),
      codVeiculo: String(dados[i][1]),
      codFornecedor: String(dados[i][2]),
      placa: String(dados[i][3]),
      rota: String(dados[i][4])
    });
  }
  return { success: true, data: resultado };
}

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
          transportador: String(dados[i][0]),
          codVeiculo: String(dados[i][1]),
          codFornecedor: String(dados[i][2]),
          placa: String(dados[i][3]),
          rota: String(dados[i][4])
        }
      };
    }
  }
  return { success: false, error: 'Veículo com código ' + codigo + ' não encontrado' };
}

// =====================================================
// BOLETINS
// =====================================================
function getBoletins(usuario) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    // Se usuario informado, filtrar. Se admin, mostra tudo.
    if (usuario && usuario !== 'admin' && String(dados[i][8]) !== usuario) continue;
    resultado.push({
      id: String(dados[i][0]),
      transportador: String(dados[i][1]),
      motorista: String(dados[i][2]),
      placa: String(dados[i][3]),
      codVeiculo: String(dados[i][4]),
      rota: String(dados[i][5]),
      mesReferencia: String(dados[i][6]),
      dataCriacao: String(dados[i][7]),
      usuario: String(dados[i][8])
    });
  }
  return { success: true, data: resultado };
}

function getBoletim(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(id)) {
      return {
        success: true,
        data: {
          id: String(dados[i][0]),
          transportador: String(dados[i][1]),
          motorista: String(dados[i][2]),
          placa: String(dados[i][3]),
          codVeiculo: String(dados[i][4]),
          rota: String(dados[i][5]),
          mesReferencia: String(dados[i][6]),
          dataCriacao: String(dados[i][7]),
          usuario: String(dados[i][8])
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
  const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  aba.appendRow([
    id,
    data.transportador,
    data.motorista,
    data.placa,
    data.codVeiculo,
    data.rota,
    data.mesReferencia,
    agora,
    data.usuario || ''
  ]);

  return { success: true, id: id, message: 'Boletim criado com sucesso!' };
}

function excluirBoletim(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const abaReg = ss.getSheetByName(ABA_REGISTROS);
  const dadosReg = abaReg.getDataRange().getValues();
  for (let i = dadosReg.length - 1; i >= 1; i--) {
    if (String(dadosReg[i][0]) === String(data.id)) {
      abaReg.deleteRow(i + 1);
    }
  }
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(data.id)) {
      aba.deleteRow(i + 1);
      return { success: true, message: 'Boletim excluído com sucesso!' };
    }
  }
  return { success: false, error: 'Boletim não encontrado' };
}

// =====================================================
// REGISTROS DIÁRIOS
// =====================================================
function getRegistros(boletimId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(boletimId)) {
      resultado.push({
        rowIndex: i + 1,
        boletimId: String(dados[i][0]),
        data: formatarData(dados[i][1]),
        diaSemana: String(dados[i][2]),
        horaInicialIda: formatarHora(dados[i][3]),
        kmInicialIda: String(dados[i][4]),
        horaFinalIda: formatarHora(dados[i][5]),
        numPessoasIda: String(dados[i][6]),
        horaInicialVolta: formatarHora(dados[i][7]),
        kmFinalVolta: String(dados[i][8]),
        horaFinalVolta: formatarHora(dados[i][9]),
        numPessoasVolta: String(dados[i][10]),
        objCusto: String(dados[i][11]),
        kmRodados: String(dados[i][12]),
        assinatura: String(dados[i][13])
      });
    }
  }
  return { success: true, data: resultado };
}

function salvarRegistro(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);

  const kmIni = parseFloat(data.kmInicialIda) || 0;
  const kmFin = parseFloat(data.kmFinalVolta) || 0;
  const kmRodados = kmFin > 0 && kmIni > 0 ? kmFin - kmIni : 0;

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

function editarRegistro(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  const rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) return { success: false, error: 'Índice inválido' };

  const kmIni = parseFloat(data.kmInicialIda) || 0;
  const kmFin = parseFloat(data.kmFinalVolta) || 0;
  const kmRodados = kmFin > 0 && kmIni > 0 ? kmFin - kmIni : 0;

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
  if (!rowIndex || rowIndex < 2) return { success: false, error: 'Índice inválido' };
  aba.deleteRow(rowIndex);
  return { success: true, message: 'Registro excluído com sucesso!' };
}
