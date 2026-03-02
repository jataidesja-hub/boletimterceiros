// =====================================================
// BOLETIM DIÁRIO - TRANSPORTES DE TRABALHADORES
// Google Apps Script Backend (v3 - Admin + Motorista)
// =====================================================

const SPREADSHEET_ID = '1LMQcwrQUvXJBzY-FyOYs0WW8tRWTmFhHY208utKatYA';

const ABA_BOLETINS = 'Boletins';
const ABA_REGISTROS = 'Registros';
const ABA_USUARIOS = 'Usuarios';
const ABA_VEICULOS_CONFIG = 'VeiculosConfig';
const ABA_PAGINA1 = 'Página1';

// =====================================================
// HELPERS DE FORMATAÇÃO
// =====================================================
function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatarData(val) {
  const d = toDate(val);
  if (!d) return String(val || '');
  return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');
}

function formatarHora(val) {
  const d = toDate(val);
  if (!d) return String(val || '');
  return Utilities.formatDate(d, 'America/Sao_Paulo', 'HH:mm');
}

function formatarMes(val) {
  const d = toDate(val);
  if (!d) return String(val || '');
  return Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM');
}

function formatarMesLongo(date) {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return meses[date.getMonth()] + ' / ' + date.getFullYear();
}

// =====================================================
// CONFIGURAÇÃO INICIAL
// =====================================================
function configurarPlanilha() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Aba Usuarios
  let abaUsuarios = ss.getSheetByName(ABA_USUARIOS);
  if (!abaUsuarios) { abaUsuarios = ss.insertSheet(ABA_USUARIOS); }
  abaUsuarios.clear();
  abaUsuarios.getRange('A1:D1').setValues([['Usuario', 'Senha', 'Nome_Completo', 'Perfil']]);
  abaUsuarios.getRange('A1:D1').setFontWeight('bold');
  abaUsuarios.setFrozenRows(1);
  abaUsuarios.appendRow(['admin', 'admin123', 'Administrador', 'admin']);

  // Aba VeiculosConfig (flag de assinatura obrigatória)
  let abaVC = ss.getSheetByName(ABA_VEICULOS_CONFIG);
  if (!abaVC) { abaVC = ss.insertSheet(ABA_VEICULOS_CONFIG); }
  abaVC.clear();
  abaVC.getRange('A1:B1').setValues([['Cod_Veiculo', 'Requer_Assinatura']]);
  abaVC.getRange('A1:B1').setFontWeight('bold');
  abaVC.setFrozenRows(1);

  // Aba Boletins
  let abaBoletins = ss.getSheetByName(ABA_BOLETINS);
  if (!abaBoletins) { abaBoletins = ss.insertSheet(ABA_BOLETINS); }
  abaBoletins.clear();
  abaBoletins.getRange('A1:I1').setValues([[
    'ID', 'Transportador', 'Motorista', 'Placa', 'Cod_Veiculo', 'Rota', 'Mes_Referencia', 'Data_Criacao', 'Usuario'
  ]]);
  abaBoletins.getRange('A1:I1').setFontWeight('bold');
  abaBoletins.setFrozenRows(1);

  // Aba Registros
  let abaRegistros = ss.getSheetByName(ABA_REGISTROS);
  if (!abaRegistros) { abaRegistros = ss.insertSheet(ABA_REGISTROS); }
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
      case 'buscarVeiculoPorCodigo':
        return jsonResponse(buscarVeiculoPorCodigo(e.parameter.codigo));
      case 'getBoletins':
        return jsonResponse(getBoletins(e.parameter.usuario));
      case 'getBoletim':
        return jsonResponse(getBoletim(e.parameter.id));
      case 'getRegistros':
        return jsonResponse(getRegistros(e));
      case 'getUsuarios':
        return jsonResponse(getUsuarios());
      case 'getVeiculosConfig':
        return jsonResponse(getVeiculosConfig());
      case 'getDadosDashboard':
        return jsonResponse(getDadosDashboard());
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
      case 'salvarVeiculoConfig':
        return jsonResponse(salvarVeiculoConfig(data));
      default:
        return jsonResponse({ error: 'Ação não reconhecida' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
// LOGIN
// =====================================================
function login(usuario, senha) {
  if (!usuario || !senha) return { success: false, error: 'Usuário e senha obrigatórios' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_USUARIOS);
  if (!aba) return { success: false, error: 'Execute configurarPlanilha primeiro' };
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toLowerCase() === String(usuario).trim().toLowerCase() &&
        String(dados[i][1]).trim() === String(senha).trim()) {
      return {
        success: true,
        data: {
          usuario: String(dados[i][0]).trim(),
          nomeCompleto: String(dados[i][2]),
          perfil: String(dados[i][3]) || 'motorista'
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
    resultado.push({ usuario: String(dados[i][0]), nomeCompleto: String(dados[i][2]), perfil: String(dados[i][3]) || 'motorista' });
  }
  return { success: true, data: resultado };
}

function cadastrarUsuario(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_USUARIOS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toLowerCase() === String(data.usuario).trim().toLowerCase()) {
      return { success: false, error: 'Usuário já existe' };
    }
  }
  aba.appendRow([data.usuario, data.senha, data.nomeCompleto, data.perfil || 'motorista']);
  return { success: true, message: 'Usuário cadastrado!' };
}

// =====================================================
// VEÍCULOS CONFIG (Assinatura obrigatória)
// =====================================================
function getVeiculosConfig() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_VEICULOS_CONFIG);
  if (!aba) return { success: true, data: [] };
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    resultado.push({ codVeiculo: String(dados[i][0]), requerAssinatura: String(dados[i][1]).toLowerCase() === 'sim' });
  }
  return { success: true, data: resultado };
}

function salvarVeiculoConfig(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let aba = ss.getSheetByName(ABA_VEICULOS_CONFIG);
  if (!aba) {
    aba = ss.insertSheet(ABA_VEICULOS_CONFIG);
    aba.getRange('A1:B1').setValues([['Cod_Veiculo', 'Requer_Assinatura']]);
    aba.setFrozenRows(1);
  }
  // Verificar se já existe
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === String(data.codVeiculo).trim()) {
      aba.getRange(i + 1, 2).setValue(data.requerAssinatura ? 'Sim' : 'Não');
      return { success: true, message: 'Configuração atualizada!' };
    }
  }
  aba.appendRow([data.codVeiculo, data.requerAssinatura ? 'Sim' : 'Não']);
  return { success: true, message: 'Configuração salva!' };
}

function verificarAssinaturaObrigatoria(codVeiculo) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_VEICULOS_CONFIG);
  if (!aba) return false;
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === String(codVeiculo).trim()) {
      return String(dados[i][1]).toLowerCase() === 'sim';
    }
  }
  return false;
}

// =====================================================
// BUSCAR VEÍCULO (PÁGINA1)
// A=Fornecedor, B=Cod, C=cod.fornecedor, D=placa, E=Rota
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
      const requerAss = verificarAssinaturaObrigatoria(codigoBusca);
      return {
        success: true,
        data: {
          transportador: String(dados[i][0]),
          codVeiculo: String(dados[i][1]),
          codFornecedor: String(dados[i][2]),
          placa: String(dados[i][3]),
          rota: String(dados[i][4]),
          requerAssinatura: requerAss
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
    const userRow = String(dados[i][8] || '').trim();
    if (usuario && usuario !== 'admin' && userRow !== String(usuario).trim()) continue;
    resultado.push({
      id: String(dados[i][0]).trim(),
      transportador: String(dados[i][1]),
      motorista: String(dados[i][2]),
      placa: String(dados[i][3]),
      codVeiculo: String(dados[i][4]),
      rota: String(dados[i][5]),
      mesReferencia: formatarMes(dados[i][6]),
      dataCriacao: String(dados[i][7]),
      usuario: userRow
    });
  }
  return { success: true, data: resultado };
}

function getBoletim(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  const idBusca = String(id || '').trim();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === idBusca) {
      const codV = String(dados[i][4]).trim();
      const requerAss = verificarAssinaturaObrigatoria(codV);
      return {
        success: true,
        data: {
          id: String(dados[i][0]),
          transportador: String(dados[i][1]),
          motorista: String(dados[i][2]),
          placa: String(dados[i][3]),
          codVeiculo: codV,
          rota: String(dados[i][5]),
          mesReferencia: formatarMes(dados[i][6]),
          dataCriacao: String(dados[i][7]),
          usuario: String(dados[i][8]),
          requerAssinatura: requerAss
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
  aba.appendRow([id, data.transportador, data.motorista, data.placa, data.codVeiculo, data.rota, data.mesReferencia, agora, data.usuario || '']);
  return { success: true, id: id, message: 'Boletim criado!' };
}

function excluirBoletim(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const abaReg = ss.getSheetByName(ABA_REGISTROS);
  const dadosReg = abaReg.getDataRange().getValues();
  for (let i = dadosReg.length - 1; i >= 1; i--) {
    if (String(dadosReg[i][0]) === String(data.id)) abaReg.deleteRow(i + 1);
  }
  const aba = ss.getSheetByName(ABA_BOLETINS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(data.id)) {
      aba.deleteRow(i + 1);
      return { success: true, message: 'Boletim excluído!' };
    }
  }
  return { success: false, error: 'Boletim não encontrado' };
}

// =====================================================
// REGISTROS DIÁRIOS
// =====================================================
function getRegistros(e) {
  const boletimId = String(e.parameter.boletimId || '');
  if (!boletimId) return { success: false, error: 'boletimId não fornecido' };
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  if (!aba) return { success: true, data: [] };
  
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  
  const idBusca = String(boletimId || '').trim();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === idBusca) {
      resultado.push({
        rowIndex: i + 1,
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
        assinatura: String(dados[i][13] || '')
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
    data.boletimId, data.data, data.diaSemana,
    data.horaInicialIda, data.kmInicialIda, data.horaFinalIda, data.numPessoasIda,
    data.horaInicialVolta, data.kmFinalVolta, data.horaFinalVolta, data.numPessoasVolta,
    data.objCusto, kmRodados, data.assinatura || ''
  ]);
  return { success: true, message: 'Registro salvo!' };
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
    data.data, data.diaSemana,
    data.horaInicialIda, data.kmInicialIda, data.horaFinalIda, data.numPessoasIda,
    data.horaInicialVolta, data.kmFinalVolta, data.horaFinalVolta, data.numPessoasVolta,
    data.objCusto, kmRodados, data.assinatura || ''
  ]]);
  return { success: true, message: 'Registro atualizado!' };
}

function excluirRegistro(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName(ABA_REGISTROS);
  if (!data.rowIndex || data.rowIndex < 2) return { success: false, error: 'Índice inválido' };
  aba.deleteRow(data.rowIndex);
  return { success: true, message: 'Registro excluído!' };
}

function getDadosDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const abaBol = ss.getSheetByName(ABA_BOLETINS);
  const abaReg = ss.getSheetByName(ABA_REGISTROS);
  const abaUsr = ss.getSheetByName(ABA_USUARIOS);
  
  if (!abaBol || !abaReg) return { success: false, error: 'Abas não encontradas' };
  
  const boletins = abaBol.getDataRange().getValues();
  const registros = abaReg.getDataRange().getValues();
  const usuarios = abaUsr ? abaUsr.getDataRange().getValues().length - 1 : 0;
  
  const mapBol = {};
  for (let i = 1; i < boletins.length; i++) {
    const bId = String(boletins[i][0]).trim();
    if (!bId) continue;
    mapBol[bId] = {
      placa: String(boletins[i][3]),
      codVeiculo: String(boletins[i][4]),
      rota: String(boletins[i][5])
    };
  }
  
  const apuracao = {};
  for (let j = 1; j < registros.length; j++) {
    const bId = String(registros[j][0]).trim();
    const bInfo = mapBol[bId];
    if (!bInfo) continue;
    
    let dia, mes, ano;
    const valData = registros[j][1];
    
    if (valData instanceof Date && !isNaN(valData)) {
      dia = valData.getDate();
      mes = valData.getMonth();
      ano = valData.getFullYear();
    } else {
      const sData = String(valData);
      const partes = sData.split(/[\/\-]/); // aceita / ou -
      if (partes.length === 3) {
        if (partes[0].length === 4) { // yyyy-mm-dd
          ano = parseInt(partes[0]);
          mes = parseInt(partes[1]) - 1;
          dia = parseInt(partes[2]);
        } else { // dd/mm/yyyy
          dia = parseInt(partes[0]);
          mes = parseInt(partes[1]) - 1;
          ano = parseInt(partes[2]);
        }
      } else {
        continue;
      }
    }
    
    if (isNaN(dia) || isNaN(mes) || isNaN(ano)) continue;

    // Regra: dia 11 do mês anterior ao dia 10 do mês atual = Mês Atual
    const dAp = new Date(ano, mes, dia);
    if (dia >= 11) {
      dAp.setMonth(dAp.getMonth() + 1);
    }
    
    const mesRef = formatarMesLongo(dAp);
    if (!apuracao[mesRef]) apuracao[mesRef] = {};
    
    const cod = bInfo.codVeiculo;
    if (!apuracao[mesRef][cod]) {
      apuracao[mesRef][cod] = {
        placa: bInfo.placa,
        rota: bInfo.rota,
        totalDias: 0,
        dias: {}
      };
    }
    const dataKey = `${dia}/${mes+1}/${ano}`;
    if (!apuracao[mesRef][cod].dias[dataKey]) {
      apuracao[mesRef][cod].dias[dataKey] = true;
      apuracao[mesRef][cod].totalDias++;
    }
  }
  
  return { 
    success: true, 
    apuracao: apuracao, 
    totalBoletins: boletins.length - 1, 
    totalUsuarios: usuarios 
  };
}

