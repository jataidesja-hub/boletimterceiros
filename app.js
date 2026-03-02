// =====================================================
// BOLETIM DIÁRIO - APP.JS (v3 - Admin + Motorista)
// =====================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbzyKPCMGtmgf3laqpoplIZi4cB_fXHm89gqV65iRvt3649C6oZof1mUgyQdusZ2CNRI/exec';

// ===================== STATE =====================
const state = {
  user: null, // { usuario, nomeCompleto, perfil }
  currentPage: 'login',
  currentBoletimId: null,
  currentBoletimData: null,
  boletins: [],
  registros: [],
  veiculoEncontrado: null,
  editingRowIndex: null,
  qrScanner: null
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('boletim_user_v3');
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
      showApp();
    } catch (e) { localStorage.removeItem('boletim_user_v3'); }
  }

  // Event Listeners
  document.getElementById('formLogin').addEventListener('submit', handleLogin);
  document.getElementById('formRegistro').addEventListener('submit', submitRegistro);
  document.getElementById('formUsuario').addEventListener('submit', submitUsuario);
  document.getElementById('formVeiculoConfig').addEventListener('submit', submitVeiculoConfig);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Mobile Menu
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');
  });
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Input Enter Search
  document.getElementById('inputCodVeiculo').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarPorCodigo(); }
  });
});

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===================== LOGIN / LOGOUT =====================
async function handleLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = '';

  showLoading();
  try {
    const res = await apiGet('login', { usuario, senha });
    if (res.success) {
      state.user = res.data;
      localStorage.setItem('boletim_user_v3', JSON.stringify(res.data));
      showApp();
      showToast('Bem-vindo, ' + res.data.nomeCompleto + '!', 'success');
    } else {
      errorDiv.textContent = res.error || 'Erro ao logar';
    }
  } catch (err) { errorDiv.textContent = 'Erro de conexão'; }
  hideLoading();
}

function logout() {
  state.user = null;
  localStorage.removeItem('boletim_user_v3');
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('formLogin').reset();
}

function showApp() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  document.getElementById('userName').textContent = state.user.nomeCompleto;
  document.getElementById('userRole').textContent = state.user.perfil === 'admin' ? 'Administrador' : 'Motorista';

  const isAdmin = state.user.perfil === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
  document.querySelectorAll('.motorista-only').forEach(el => el.style.display = !isAdmin ? 'flex' : 'none');

  const startPage = isAdmin ? 'admin-dashboard' : 'motorista-inicio';
  navigateTo(startPage);
}

// ===================== NAVIGATION =====================
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) targetPage.classList.add('active');

  const titles = {
    'motorista-inicio': 'Novo Boletim',
    'motorista-boletins': 'Meus Boletins',
    'admin-dashboard': 'Dashboard Admin',
    'admin-boletins': 'Todos os Boletins',
    'admin-veiculos': 'Configuração de Veículos',
    'admin-usuarios': 'Usuários do Sistema',
    'detalhes-boletim': 'Detalhes do Boletim'
  };
  document.getElementById('pageTitle').textContent = titles[page] || 'Boletim';
  closeSidebar();
  state.currentPage = page;

  if (page === 'motorista-inicio') initMotoristaInicio();
  if (page === 'motorista-boletins') loadMotoristaBoletins();
  if (page === 'admin-dashboard') loadAdminDashboard();
  if (page === 'admin-boletins') loadAdminTodosBoletins();
  if (page === 'admin-veiculos') loadVeiculosConfig();
  if (page === 'admin-usuarios') loadUsuarios();
}

function voltarPagina() {
  const prev = state.user.perfil === 'admin' ? 'admin-boletins' : 'motorista-boletins';
  navigateTo(prev);
}

// ===================== API WRAPPERS =====================
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    setConnection(true);
    return data;
  } catch (err) { setConnection(false); throw err; }
}

async function apiPost(body) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setConnection(true);
    return data;
  } catch (err) { setConnection(false); throw err; }
}

function setConnection(ok) {
  const dot = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  dot.classList.toggle('connected', ok);
  dot.classList.toggle('error', !ok);
  text.textContent = ok ? 'Conectado' : 'Erro API';
}

// ===================== MOTORISTA LOGIC =====================
function initMotoristaInicio() {
  document.getElementById('veiculoEncontrado').style.display = 'none';
  document.getElementById('veiculoFeedback').textContent = '';
  document.getElementById('inputCodVeiculo').value = '';
  const now = new Date();
  document.getElementById('vMesRef').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function buscarPorCodigo() {
  const cod = document.getElementById('inputCodVeiculo').value.trim();
  if (!cod) return;
  showLoading();
  try {
    const res = await apiGet('buscarVeiculoPorCodigo', { codigo: cod });
    if (res.success) {
      state.veiculoEncontrado = res.data;
      document.getElementById('vTransportador').textContent = res.data.transportador;
      document.getElementById('vPlaca').textContent = res.data.placa;
      document.getElementById('vCodVeiculo').textContent = res.data.codVeiculo;
      document.getElementById('vRota').textContent = res.data.rota;
      document.getElementById('vRequerAssinatura').style.display = res.data.requerAssinatura ? 'inline-flex' : 'none';
      document.getElementById('veiculoEncontrado').style.display = 'block';
      document.getElementById('veiculoFeedback').textContent = '';
    } else {
      document.getElementById('veiculoEncontrado').style.display = 'none';
      document.getElementById('veiculoFeedback').textContent = 'Veículo não encontrado.';
    }
  } catch (e) { showToast('Erro ao buscar veículo', 'error'); }
  hideLoading();
}

async function criarBoletimVeiculo() {
  const v = state.veiculoEncontrado;
  const mes = document.getElementById('vMesRef').value;
  showLoading();
  try {
    const res = await apiPost({
      action: 'criarBoletim',
      transportador: v.transportador,
      motorista: state.user.nomeCompleto,
      placa: v.placa,
      codVeiculo: v.codVeiculo,
      rota: v.rota,
      mesReferencia: mes,
      usuario: state.user.usuario
    });
    if (res.success) {
      state.currentBoletimId = res.id;
      navigateTo('detalhes-boletim');
    }
  } catch (e) { showToast('Erro ao criar boletim', 'error'); }
  hideLoading();
}

async function loadMotoristaBoletins() {
  showLoading();
  try {
    const res = await apiGet('getBoletins', { usuario: state.user.usuario });
    const tbody = document.getElementById('listaBoletinsMotorista');
    if (res.success && res.data.length > 0) {
      tbody.innerHTML = res.data.map(b => `
        <tr>
          <td>${b.placa} (${b.codVeiculo})</td>
          <td>${b.rota}</td>
          <td>${b.mesReferencia}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="abrirBoletimDetalhes('${b.id}')">Ver</button>
            <button class="btn btn-sm btn-secondary" style="color:red" onclick="excluirBoletim('${b.id}')">X</button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhum boletim encontrado.</td></tr>';
    }
  } catch (e) { }
  hideLoading();
}

// ===================== ADMIN LOGIC =====================
async function loadAdminDashboard() {
  showLoading();
  try {
    const [bol, u] = await Promise.all([apiGet('getBoletins'), apiGet('getUsuarios')]);
    document.getElementById('statBoletins').textContent = bol.data.length;
    document.getElementById('statUsuarios').textContent = u.data.length;

    document.getElementById('adminDashboardBoletins').innerHTML = bol.data.slice(0, 5).map(b => `
      <tr><td>${b.motorista}</td><td>${b.placa}</td><td>${b.mesReferencia}</td><td><button class="btn btn-sm btn-secondary" onclick="abrirBoletimDetalhes('${b.id}')">Ver</button></td></tr>
    `).join('');
  } catch (e) { }
  hideLoading();
}

async function loadAdminTodosBoletins() {
  showLoading();
  try {
    const res = await apiGet('getBoletins');
    const tbody = document.getElementById('adminTodosBoletins');
    tbody.innerHTML = res.data.map(b => `
      <tr>
        <td>${b.motorista}</td>
        <td>${b.transportador}</td>
        <td>${b.placa}</td>
        <td>${b.rota}</td>
        <td>${b.mesReferencia}</td>
        <td><button class="btn btn-sm btn-secondary" onclick="abrirBoletimDetalhes('${b.id}')">Gerenciar</button></td>
      </tr>
    `).join('');
  } catch (e) { }
  hideLoading();
}

async function loadVeiculosConfig() {
  showLoading();
  try {
    const res = await apiGet('getVeiculosConfig');
    document.getElementById('listaVeiculosConfig').innerHTML = res.data.map(v => `
      <tr><td>${v.codVeiculo}</td><td>${v.requerAssinatura ? 'Sim' : 'Não'}</td></tr>
    `).join('');
  } catch (e) { }
  hideLoading();
}

async function submitVeiculoConfig(e) {
  e.preventDefault();
  const cod = document.getElementById('confCodVeiculo').value;
  const ass = document.getElementById('confRequerAssinatura').checked;
  showLoading();
  const res = await apiPost({ action: 'salvarVeiculoConfig', codVeiculo: cod, requerAssinatura: ass });
  if (res.success) { showToast(res.message, 'success'); loadVeiculosConfig(); }
  hideLoading();
}

async function loadUsuarios() {
  showLoading();
  const res = await apiGet('getUsuarios');
  document.getElementById('listaUsuarios').innerHTML = res.data.map(u => `
    <tr><td>${u.usuario}</td><td>${u.nomeCompleto}</td><td style="text-transform:capitalize">${u.perfil}</td></tr>
  `).join('');
  hideLoading();
}

async function submitUsuario(e) {
  e.preventDefault();
  const data = {
    action: 'cadastrarUsuario',
    usuario: document.getElementById('novoUsuario').value,
    senha: document.getElementById('novaSenha').value,
    nomeCompleto: document.getElementById('novoNome').value,
    perfil: document.getElementById('novoPerfil').value
  };
  showLoading();
  const res = await apiPost(data);
  if (res.success) { showToast(res.message, 'success'); loadUsuarios(); document.getElementById('formUsuario').reset(); }
  else { showToast(res.error, 'error'); }
  hideLoading();
}

// ===================== DETALHES & REGISTROS =====================
async function abrirBoletimDetalhes(id) {
  state.currentBoletimId = id;
  navigateTo('detalhes-boletim');
  showLoading();
  try {
    const [bol, reg] = await Promise.all([apiGet('getBoletim', { id }), apiGet('getRegistros', { boletimId: id })]);
    state.currentBoletimData = bol.data;
    renderBoletimInfo(bol.data);
    state.registros = reg.data;
    renderRegistros(reg.data);
  } catch (e) { }
  hideLoading();
}

function renderBoletimInfo(b) {
  document.getElementById('boletimInfoGrid').innerHTML = `
    <div class="info-item"><span class="label">Motorista</span><span class="value">${b.motorista}</span></div>
    <div class="info-item"><span class="label">Placa</span><span class="value">${b.placa}</span></div>
    <div class="info-item"><span class="label">Cód</span><span class="value">${b.codVeiculo}</span></div>
    <div class="info-item"><span class="label">Mês</span><span class="value">${b.mesReferencia}</span></div>
  `;
}

function renderRegistros(regs) {
  const tbody = document.getElementById('registrosDiarios');
  tbody.innerHTML = regs.map(r => `
    <tr>
      <td>${r.data}</td>
      <td>${r.diaSemana}</td>
      <td class="ida">${r.horaInicialIda}</td><td class="ida">${r.kmInicialIda}</td><td class="ida">${r.horaFinalIda}</td><td class="ida">${r.numPessoasIda}</td>
      <td class="volta">${r.horaInicialVolta}</td><td class="volta">${r.kmFinalVolta}</td><td class="volta">${r.horaFinalVolta}</td><td class="volta">${r.numPessoasVolta}</td>
      <td>${r.objCusto}</td><td>${r.kmRodados}</td>
      <td>${r.assinatura ? '<span class="material-icons-round" style="color:green">done</span>' : (state.currentBoletimData.requerAssinatura ? '❌' : '-')}</td>
      <td>
        <button class="btn btn-sm" onclick="editarReg(${r.rowIndex})">E</button>
        <button class="btn btn-sm" style="color:red" onclick="excluirReg(${r.rowIndex})">X</button>
      </td>
    </tr>
  `).join('');
}

// ===================== MODAL REGISTRO & QR =====================
function abrirModalRegistro(idx) {
  state.editingRowIndex = idx || null;
  document.getElementById('formRegistro').reset();
  document.getElementById('modalRegistro').style.display = 'flex';
  document.getElementById('assinaturaSection').style.display = state.currentBoletimData.requerAssinatura ? 'block' : 'none';
  resetAssinatura();

  if (idx) {
    const r = state.registros.find(x => x.rowIndex === idx);
    // Fill form... (simplified for brevity)
    document.getElementById('regData').value = r.data.split('/').reverse().join('-');
    document.getElementById('regObjCusto').value = r.objCusto;
    document.getElementById('regHoraIniIda').value = r.horaInicialIda;
    document.getElementById('regKmIniIda').value = r.kmInicialIda;
    document.getElementById('regHoraFinIda').value = r.horaFinalIda;
    document.getElementById('regPessoasIda').value = r.numPessoasIda;
    document.getElementById('regHoraIniVolta').value = r.horaInicialVolta;
    document.getElementById('regKmFinVolta').value = r.kmFinalVolta;
    document.getElementById('regHoraFinVolta').value = r.horaFinalVolta;
    document.getElementById('regPessoasVolta').value = r.numPessoasVolta;
    document.getElementById('regAssinatura').value = r.assinatura;
    if (r.assinatura) setAssinaturaOK();
  }
}

function fecharModalRegistro() {
  document.getElementById('modalRegistro').style.display = 'none';
  if (state.qrScanner) { state.qrScanner.stop(); state.qrScanner = null; }
}

function editarReg(idx) { abrirModalRegistro(idx); }

async function submitRegistro(e) {
  e.preventDefault();
  const d = document.getElementById('regData').value;
  if (state.currentBoletimData.requerAssinatura && !document.getElementById('regAssinatura').value) {
    alert('Assinatura QR Code obrigatória!'); return;
  }
  const reg = {
    boletimId: state.currentBoletimId,
    data: d.split('-').reverse().join('/'),
    diaSemana: getDiaSemana(d),
    horaInicialIda: document.getElementById('regHoraIniIda').value,
    kmInicialIda: document.getElementById('regKmIniIda').value,
    horaFinalIda: document.getElementById('regHoraFinIda').value,
    numPessoasIda: document.getElementById('regPessoasIda').value,
    horaInicialVolta: document.getElementById('regHoraIniVolta').value,
    kmFinalVolta: document.getElementById('regKmFinVolta').value,
    horaFinalVolta: document.getElementById('regHoraFinVolta').value,
    numPessoasVolta: document.getElementById('regPessoasVolta').value,
    objCusto: document.getElementById('regObjCusto').value,
    assinatura: document.getElementById('regAssinatura').value
  };

  showLoading();
  let res;
  if (state.editingRowIndex) { res = await apiPost({ ...reg, action: 'editarRegistro', rowIndex: state.editingRowIndex }); }
  else { res = await apiPost({ ...reg, action: 'salvarRegistro' }); }

  if (res.success) { showToast(res.message, 'success'); fecharModalRegistro(); abrirBoletimDetalhes(state.currentBoletimId); }
  hideLoading();
}

function iniciarLeituraQR() {
  const qrDiv = document.getElementById('qr-reader');
  qrDiv.style.display = 'block';
  state.qrScanner = new Html5Qrcode("qr-reader");
  state.qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (text) => {
      document.getElementById('regAssinatura').value = text;
      setAssinaturaOK();
      state.qrScanner.stop();
      qrDiv.style.display = 'none';
    },
    () => { } // error
  ).catch(err => alert("Erro ao abrir câmera"));
}

function resetAssinatura() {
  const st = document.getElementById('assinaturaStatus');
  st.className = 'assinatura-status pending';
  st.innerHTML = '<span class="material-icons-round">pending</span> Pendente';
  document.getElementById('regAssinatura').value = '';
}

function setAssinaturaOK() {
  const st = document.getElementById('assinaturaStatus');
  st.className = 'assinatura-status signed';
  st.innerHTML = '<span class="material-icons-round">check_circle</span> Assinado via QR';
}

function getDiaSemana(d) {
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return days[new Date(d + 'T12:00:00').getDay()];
}

// ===================== UI UTILS =====================
function showLoading() { document.getElementById('loadingOverlay').style.display = 'flex'; }
function hideLoading() { document.getElementById('loadingOverlay').style.display = 'none'; }
function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
