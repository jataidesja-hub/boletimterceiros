// =====================================================
// BOLETIM DIÁRIO - APP.JS
// Frontend Application Logic
// =====================================================

// ===================== CONFIG =====================
// Cole aqui a URL do seu Web App do Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzyKPCMGtmgf3laqpoplIZi4cB_fXHm89gqV65iRvt3649C6oZof1mUgyQdusZ2CNRI/exec';

// ===================== STATE =====================
const state = {
  currentPage: 'dashboard',
  currentBoletimId: null,
  boletins: [],
  registros: [],
  transportadores: [],
  motoristas: [],
  veiculos: [],
  rotas: [],
  editingRowIndex: null
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupSidebar();
  setupTabs();
  setupForms();
  loadInitialData();
});

// ===================== NAVIGATION =====================
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page, data) {
  // Atualizar sidebar
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Atualizar páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) targetPage.classList.add('active');

  // Atualizar título
  const titles = {
    'dashboard': 'Dashboard',
    'boletins': 'Boletins',
    'novo-boletim': 'Novo Boletim',
    'detalhes-boletim': 'Detalhes do Boletim',
    'cadastros': 'Cadastros'
  };
  document.getElementById('pageTitle').textContent = titles[page] || 'Boletim';

  // Fechar sidebar mobile
  closeSidebar();

  state.currentPage = page;

  // Carregar dados da página
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'boletins':
      loadBoletins();
      break;
    case 'novo-boletim':
      loadFormSelects();
      break;
    case 'detalhes-boletim':
      if (data && data.id) {
        state.currentBoletimId = data.id;
      }
      loadBoletimDetalhes(state.currentBoletimId);
      break;
    case 'cadastros':
      loadCadastros();
      break;
  }
}

// ===================== SIDEBAR =====================
function setupSidebar() {
  const toggle = document.getElementById('menuToggle');
  const close = document.getElementById('sidebarClose');
  const overlay = document.getElementById('sidebarOverlay');

  toggle.addEventListener('click', openSidebar);
  close.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===================== TABS =====================
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// ===================== FORMS SETUP =====================
function setupForms() {
  // Novo Boletim
  document.getElementById('formNovoBoletim').addEventListener('submit', submitNovoBoletim);

  // Transportador change -> update motoristas & veiculos
  document.getElementById('selTransportador').addEventListener('change', (e) => {
    const transp = e.target.value;
    loadMotoristasByTransportador(transp);
    loadVeiculosByTransportador(transp);
  });

  // Registro diário
  document.getElementById('formRegistro').addEventListener('submit', submitRegistro);

  // Cadastros
  document.getElementById('formTransportador').addEventListener('submit', submitTransportador);
  document.getElementById('formMotorista').addEventListener('submit', submitMotorista);
  document.getElementById('formVeiculo').addEventListener('submit', submitVeiculo);
  document.getElementById('formRota').addEventListener('submit', submitRota);
}

// ===================== API CALLS =====================
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    updateConnectionStatus(true);
    return data;
  } catch (err) {
    updateConnectionStatus(false);
    showToast('Erro de conexão: ' + err.message, 'error');
    throw err;
  }
}

async function apiPost(body) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    updateConnectionStatus(true);
    return data;
  } catch (err) {
    updateConnectionStatus(false);
    showToast('Erro de conexão: ' + err.message, 'error');
    throw err;
  }
}

function updateConnectionStatus(connected) {
  const dot = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  if (connected) {
    dot.className = 'status-dot connected';
    text.textContent = 'Conectado';
  } else {
    dot.className = 'status-dot error';
    text.textContent = 'Sem conexão';
  }
}

// ===================== LOADING =====================
function showLoading() {
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

// ===================== TOAST =====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  toast.innerHTML = `<span class="material-icons-round">${icons[type] || 'info'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===================== LOAD DATA =====================
async function loadInitialData() {
  showLoading();
  try {
    const [transp, rotas, boletins] = await Promise.all([
      apiGet('getTransportadores'),
      apiGet('getRotas'),
      apiGet('getBoletins')
    ]);

    if (transp.success) state.transportadores = transp.data;
    if (rotas.success) state.rotas = rotas.data;
    if (boletins.success) state.boletins = boletins.data;

    loadDashboard();
  } catch (err) {
    console.error('Erro ao carregar dados iniciais:', err);
  } finally {
    hideLoading();
  }
}

// ===================== DASHBOARD =====================
async function loadDashboard() {
  document.getElementById('totalBoletins').textContent = state.boletins.length;

  // Calcular totais dos registros
  let totalRegistros = 0;
  let totalKm = 0;
  let totalPessoas = 0;

  // Carregar registros de todos os boletins para as estatísticas
  try {
    for (const boletim of state.boletins.slice(0, 10)) {
      const res = await apiGet('getRegistros', { boletimId: boletim.id });
      if (res.success) {
        totalRegistros += res.data.length;
        for (const reg of res.data) {
          totalKm += parseFloat(reg.kmRodados) || 0;
          totalPessoas += (parseInt(reg.numPessoasIda) || 0) + (parseInt(reg.numPessoasVolta) || 0);
        }
      }
    }
  } catch (err) { /* continue */ }

  document.getElementById('totalRegistros').textContent = totalRegistros;
  document.getElementById('totalKm').textContent = totalKm.toLocaleString('pt-BR');
  document.getElementById('totalPessoas').textContent = totalPessoas.toLocaleString('pt-BR');

  // Tabela recentes
  const tbody = document.getElementById('recentBoletins');
  if (state.boletins.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum boletim cadastrado</td></tr>';
    return;
  }

  const recentes = state.boletins.slice(-5).reverse();
  tbody.innerHTML = recentes.map(b => `
    <tr>
      <td>${b.transportador}</td>
      <td>${b.motorista}</td>
      <td>${b.placa}</td>
      <td>${b.rota}</td>
      <td>${b.mesReferencia}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Ver detalhes" onclick="abrirBoletim('${b.id}')">
            <span class="material-icons-round">visibility</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===================== BOLETINS LIST =====================
async function loadBoletins() {
  showLoading();
  try {
    const res = await apiGet('getBoletins');
    if (res.success) {
      state.boletins = res.data;
    }
  } catch (err) { /* handled */ }
  hideLoading();

  const tbody = document.getElementById('allBoletins');
  if (state.boletins.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum boletim cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = state.boletins.map(b => `
    <tr>
      <td>${b.transportador}</td>
      <td>${b.motorista}</td>
      <td>${b.placa}</td>
      <td>${b.codVeiculo}</td>
      <td>${b.rota}</td>
      <td>${b.mesReferencia}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Ver detalhes" onclick="abrirBoletim('${b.id}')">
            <span class="material-icons-round">visibility</span>
          </button>
          <button class="btn-icon danger" title="Excluir" onclick="confirmarExcluirBoletim('${b.id}')">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function abrirBoletim(id) {
  state.currentBoletimId = id;
  navigateTo('detalhes-boletim', { id });
}

async function confirmarExcluirBoletim(id) {
  if (!confirm('Tem certeza que deseja excluir este boletim e todos os seus registros?')) return;
  showLoading();
  try {
    const res = await apiPost({ action: 'excluirBoletim', id });
    if (res.success) {
      showToast(res.message, 'success');
      state.boletins = state.boletins.filter(b => b.id !== id);
      loadBoletins();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

// ===================== NOVO BOLETIM =====================
async function loadFormSelects() {
  showLoading();
  try {
    const [transp, rotas] = await Promise.all([
      apiGet('getTransportadores'),
      apiGet('getRotas')
    ]);

    if (transp.success) {
      state.transportadores = transp.data;
      fillSelect('selTransportador', transp.data.map(t => ({ value: t.nome, label: t.nome })));
    }

    if (rotas.success) {
      state.rotas = rotas.data;
      fillSelect('selRota', rotas.data.map(r => ({ value: r.nome, label: r.nome })));
    }

    // Set default month
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('mesReferencia').value = `${now.getFullYear()}-${month}`;
  } catch (err) { /* handled */ }
  hideLoading();
}

function fillSelect(id, options, placeholder) {
  const sel = document.getElementById(id);
  const ph = placeholder || 'Selecione...';
  sel.innerHTML = `<option value="">${ph}</option>`;
  options.forEach(opt => {
    sel.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
  });
}

async function loadMotoristasByTransportador(transportador) {
  if (!transportador) {
    fillSelect('selMotorista', [], 'Selecione o transportador primeiro');
    return;
  }
  try {
    const res = await apiGet('getMotoristas', { transportador });
    if (res.success) {
      state.motoristas = res.data;
      fillSelect('selMotorista', res.data.map(m => ({ value: m.nome, label: m.nome })));
    }
  } catch (err) { /* handled */ }
}

async function loadVeiculosByTransportador(transportador) {
  if (!transportador) {
    fillSelect('selVeiculo', [], 'Selecione o transportador primeiro');
    return;
  }
  try {
    const res = await apiGet('getVeiculos', { transportador });
    if (res.success) {
      state.veiculos = res.data;
      fillSelect('selVeiculo', res.data.map(v => ({
        value: `${v.placa}|${v.codVeiculo}`,
        label: `${v.placa} - Cód: ${v.codVeiculo}`
      })));
    }
  } catch (err) { /* handled */ }
}

async function submitNovoBoletim(e) {
  e.preventDefault();
  const veiculoVal = document.getElementById('selVeiculo').value.split('|');

  const data = {
    action: 'criarBoletim',
    transportador: document.getElementById('selTransportador').value,
    motorista: document.getElementById('selMotorista').value,
    placa: veiculoVal[0],
    codVeiculo: veiculoVal[1] || '',
    rota: document.getElementById('selRota').value,
    mesReferencia: document.getElementById('mesReferencia').value
  };

  showLoading();
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message, 'success');
      e.target.reset();
      state.currentBoletimId = res.id;
      // Recarregar boletins
      const boletinsRes = await apiGet('getBoletins');
      if (boletinsRes.success) state.boletins = boletinsRes.data;
      // Ir para detalhes
      navigateTo('detalhes-boletim', { id: res.id });
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

// ===================== DETALHES BOLETIM =====================
async function loadBoletimDetalhes(boletimId) {
  if (!boletimId) return;
  showLoading();
  try {
    const [boletimRes, registrosRes] = await Promise.all([
      apiGet('getBoletim', { id: boletimId }),
      apiGet('getRegistros', { boletimId })
    ]);

    if (boletimRes.success) {
      renderBoletimInfo(boletimRes.data);
    }

    if (registrosRes.success) {
      state.registros = registrosRes.data;
      renderRegistros(registrosRes.data);
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

function renderBoletimInfo(boletim) {
  document.getElementById('boletimInfoGrid').innerHTML = `
    <div class="boletim-info-item">
      <span class="label">Transportador</span>
      <span class="value">${boletim.transportador}</span>
    </div>
    <div class="boletim-info-item">
      <span class="label">Motorista</span>
      <span class="value">${boletim.motorista}</span>
    </div>
    <div class="boletim-info-item">
      <span class="label">Placa</span>
      <span class="value">${boletim.placa}</span>
    </div>
    <div class="boletim-info-item">
      <span class="label">Cód. Veículo</span>
      <span class="value">${boletim.codVeiculo}</span>
    </div>
    <div class="boletim-info-item">
      <span class="label">Rota</span>
      <span class="value">${boletim.rota}</span>
    </div>
    <div class="boletim-info-item">
      <span class="label">Mês Referência</span>
      <span class="value">${boletim.mesReferencia}</span>
    </div>
  `;
}

function getDiaSemana(dateStr) {
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const d = new Date(dateStr + 'T12:00:00');
  return dias[d.getDay()];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function renderRegistros(registros) {
  const tbody = document.getElementById('registrosDiarios');
  const tfoot = document.getElementById('registrosTfoot');

  if (registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="empty-state">Nenhum registro adicionado. Clique em "Adicionar Dia" para começar.</td></tr>';
    tfoot.innerHTML = '';
    return;
  }

  // Ordenar por data
  registros.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  let totalKm = 0;
  let totalPessoasIda = 0;
  let totalPessoasVolta = 0;
  let totalDias = registros.length;

  tbody.innerHTML = registros.map(r => {
    const km = parseFloat(r.kmRodados) || 0;
    totalKm += km;
    totalPessoasIda += parseInt(r.numPessoasIda) || 0;
    totalPessoasVolta += parseInt(r.numPessoasVolta) || 0;

    return `
    <tr>
      <td>${formatDate(r.data)}</td>
      <td>${r.diaSemana || getDiaSemana(r.data)}</td>
      <td>${r.horaInicialIda || ''}</td>
      <td>${r.kmInicialIda || ''}</td>
      <td>${r.horaFinalIda || ''}</td>
      <td>${r.numPessoasIda || ''}</td>
      <td>${r.horaInicialVolta || ''}</td>
      <td>${r.kmFinalVolta || ''}</td>
      <td>${r.horaFinalVolta || ''}</td>
      <td>${r.numPessoasVolta || ''}</td>
      <td>${r.objCusto || ''}</td>
      <td>${km > 0 ? km.toLocaleString('pt-BR') : ''}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Editar" onclick="editarRegistro(${r.rowIndex})">
            <span class="material-icons-round">edit</span>
          </button>
          <button class="btn-icon danger" title="Excluir" onclick="excluirRegistro(${r.rowIndex})">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tfoot.innerHTML = `
    <tr>
      <td colspan="5"><strong>Totais</strong></td>
      <td><strong>${totalPessoasIda}</strong></td>
      <td colspan="3"></td>
      <td><strong>${totalPessoasVolta}</strong></td>
      <td></td>
      <td><strong>${totalKm.toLocaleString('pt-BR')}</strong></td>
      <td><strong>${totalDias} dias</strong></td>
    </tr>
  `;
}

// ===================== MODAL REGISTRO =====================
function abrirModalRegistro(rowIndex) {
  state.editingRowIndex = rowIndex || null;
  const modal = document.getElementById('modalRegistro');
  const title = document.getElementById('modalRegistroTitle');

  if (rowIndex) {
    title.textContent = 'Editar Registro Diário';
    // Preencher formulário com dados existentes
    const registro = state.registros.find(r => r.rowIndex === rowIndex);
    if (registro) {
      document.getElementById('regData').value = registro.data || '';
      document.getElementById('regHoraIniIda').value = registro.horaInicialIda || '';
      document.getElementById('regKmIniIda').value = registro.kmInicialIda || '';
      document.getElementById('regHoraFinIda').value = registro.horaFinalIda || '';
      document.getElementById('regPessoasIda').value = registro.numPessoasIda || '';
      document.getElementById('regHoraIniVolta').value = registro.horaInicialVolta || '';
      document.getElementById('regKmFinVolta').value = registro.kmFinalVolta || '';
      document.getElementById('regHoraFinVolta').value = registro.horaFinalVolta || '';
      document.getElementById('regPessoasVolta').value = registro.numPessoasVolta || '';
      document.getElementById('regObjCusto').value = registro.objCusto || '';
    }
  } else {
    title.textContent = 'Adicionar Registro Diário';
    document.getElementById('formRegistro').reset();
    // Default: hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('regData').value = today;
  }

  modal.classList.add('active');
}

function fecharModalRegistro() {
  document.getElementById('modalRegistro').classList.remove('active');
  state.editingRowIndex = null;
}

function editarRegistro(rowIndex) {
  abrirModalRegistro(rowIndex);
}

async function submitRegistro(e) {
  e.preventDefault();
  const dataValue = document.getElementById('regData').value;

  const registro = {
    boletimId: state.currentBoletimId,
    data: dataValue,
    diaSemana: getDiaSemana(dataValue),
    horaInicialIda: document.getElementById('regHoraIniIda').value,
    kmInicialIda: document.getElementById('regKmIniIda').value,
    horaFinalIda: document.getElementById('regHoraFinIda').value,
    numPessoasIda: document.getElementById('regPessoasIda').value,
    horaInicialVolta: document.getElementById('regHoraIniVolta').value,
    kmFinalVolta: document.getElementById('regKmFinVolta').value,
    horaFinalVolta: document.getElementById('regHoraFinVolta').value,
    numPessoasVolta: document.getElementById('regPessoasVolta').value,
    objCusto: document.getElementById('regObjCusto').value
  };

  showLoading();
  try {
    let res;
    if (state.editingRowIndex) {
      registro.action = 'editarRegistro';
      registro.rowIndex = state.editingRowIndex;
      res = await apiPost(registro);
    } else {
      registro.action = 'salvarRegistro';
      res = await apiPost(registro);
    }

    if (res.success) {
      showToast(res.message, 'success');
      fecharModalRegistro();
      loadBoletimDetalhes(state.currentBoletimId);
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

async function excluirRegistro(rowIndex) {
  if (!confirm('Tem certeza que deseja excluir este registro?')) return;
  showLoading();
  try {
    const res = await apiPost({ action: 'excluirRegistro', rowIndex });
    if (res.success) {
      showToast(res.message, 'success');
      loadBoletimDetalhes(state.currentBoletimId);
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

// ===================== CADASTROS =====================
async function loadCadastros() {
  showLoading();
  try {
    const [transp, motoristas, veiculos, rotas] = await Promise.all([
      apiGet('getTransportadores'),
      apiGet('getMotoristas'),
      apiGet('getVeiculos'),
      apiGet('getRotas')
    ]);

    if (transp.success) {
      state.transportadores = transp.data;
      renderTransportadores(transp.data);
      // Preencher selects de motorista e veículo
      fillSelect('transpMotorista', transp.data.map(t => ({ value: t.nome, label: t.nome })), 'Transportador...');
      fillSelect('transpVeiculo', transp.data.map(t => ({ value: t.nome, label: t.nome })), 'Transportador...');
    }
    if (motoristas.success) {
      state.motoristas = motoristas.data;
      renderMotoristas(motoristas.data);
    }
    if (veiculos.success) {
      state.veiculos = veiculos.data;
      renderVeiculos(veiculos.data);
    }
    if (rotas.success) {
      state.rotas = rotas.data;
      renderRotas(rotas.data);
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

function renderTransportadores(data) {
  const tbody = document.getElementById('listaTransportadores');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td class="empty-state">Nenhum transportador cadastrado</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(t => `<tr><td>${t.nome}</td></tr>`).join('');
}

function renderMotoristas(data) {
  const tbody = document.getElementById('listaMotoristas');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Nenhum motorista cadastrado</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(m => `<tr><td>${m.nome}</td><td>${m.transportador}</td></tr>`).join('');
}

function renderVeiculos(data) {
  const tbody = document.getElementById('listaVeiculos');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Nenhum veículo cadastrado</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(v => `<tr><td>${v.placa}</td><td>${v.codVeiculo}</td><td>${v.transportador}</td></tr>`).join('');
}

function renderRotas(data) {
  const tbody = document.getElementById('listaRotas');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td class="empty-state">Nenhuma rota cadastrada</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(r => `<tr><td>${r.nome}</td></tr>`).join('');
}

// ===================== SUBMIT CADASTROS =====================
async function submitTransportador(e) {
  e.preventDefault();
  const nome = document.getElementById('nomeTransportador').value.trim();
  if (!nome) return;

  showLoading();
  try {
    const res = await apiPost({ action: 'adicionarTransportador', nome });
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('nomeTransportador').value = '';
      loadCadastros();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

async function submitMotorista(e) {
  e.preventDefault();
  const nome = document.getElementById('nomeMotorista').value.trim();
  const transportador = document.getElementById('transpMotorista').value;
  if (!nome || !transportador) return;

  showLoading();
  try {
    const res = await apiPost({ action: 'adicionarMotorista', nome, transportador });
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('nomeMotorista').value = '';
      loadCadastros();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

async function submitVeiculo(e) {
  e.preventDefault();
  const placa = document.getElementById('placaVeiculo').value.trim();
  const codVeiculo = document.getElementById('codVeiculo').value.trim();
  const transportador = document.getElementById('transpVeiculo').value;
  if (!placa || !codVeiculo || !transportador) return;

  showLoading();
  try {
    const res = await apiPost({ action: 'adicionarVeiculo', placa, codVeiculo, transportador });
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('placaVeiculo').value = '';
      document.getElementById('codVeiculo').value = '';
      loadCadastros();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

async function submitRota(e) {
  e.preventDefault();
  const nome = document.getElementById('nomeRota').value.trim();
  if (!nome) return;

  showLoading();
  try {
    const res = await apiPost({ action: 'adicionarRota', nome });
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('nomeRota').value = '';
      loadCadastros();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}
