// =====================================================
// BOLETIM DIÁRIO - APP.JS (v2 com Login)
// =====================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbzyKPCMGtmgf3laqpoplIZi4cB_fXHm89gqV65iRvt3649C6oZof1mUgyQdusZ2CNRI/exec';

// ===================== STATE =====================
const state = {
  user: null, // { usuario, nomeCompleto, perfil }
  currentPage: 'meus-veiculos',
  currentBoletimId: null,
  boletins: [],
  registros: [],
  veiculoSelecionado: null,
  editingRowIndex: null
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  // Verificar sessão salva
  const savedUser = localStorage.getItem('boletim_user');
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
      showApp();
    } catch (e) {
      localStorage.removeItem('boletim_user');
    }
  }

  // Login form
  document.getElementById('formLogin').addEventListener('submit', handleLogin);

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Sidebar mobile
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');
  });
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Buscar código com Enter
  document.getElementById('inputCodVeiculo').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarPorCodigo(); }
  });

  // Registro diário
  document.getElementById('formRegistro').addEventListener('submit', submitRegistro);

  // Cadastrar usuário
  document.getElementById('formUsuario').addEventListener('submit', submitUsuario);
});

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===================== LOGIN =====================
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
      localStorage.setItem('boletim_user', JSON.stringify(res.data));
      showApp();
      showToast('Bem-vindo, ' + res.data.nomeCompleto + '!', 'success');
    } else {
      errorDiv.textContent = res.error || 'Erro ao fazer login';
    }
  } catch (err) {
    errorDiv.textContent = 'Erro de conexão com o servidor';
  }
  hideLoading();
}

function logout() {
  state.user = null;
  localStorage.removeItem('boletim_user');
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('formLogin').reset();
  document.getElementById('loginError').textContent = '';
}

function showApp() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';

  // User info
  document.getElementById('userName').textContent = state.user.nomeCompleto;
  document.getElementById('userRole').textContent = state.user.perfil === 'admin' ? 'Administrador' : 'Motorista';

  // Show/hide admin sections
  const isAdmin = state.user.perfil === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  // Carregar página inicial
  navigateTo('meus-veiculos');
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
    'meus-veiculos': 'Meus Veículos',
    'meus-boletins': 'Meus Boletins',
    'detalhes-boletim': 'Detalhes do Boletim',
    'admin-boletins': 'Todos os Boletins',
    'admin-usuarios': 'Gerenciar Usuários'
  };
  document.getElementById('pageTitle').textContent = titles[page] || 'Boletim';
  closeSidebar();
  state.currentPage = page;

  switch (page) {
    case 'meus-veiculos':
      initVeiculoPage();
      break;
    case 'meus-boletins':
      loadMeusBoletins();
      break;
    case 'detalhes-boletim':
      loadBoletimDetalhes(state.currentBoletimId);
      break;
    case 'admin-boletins':
      loadAdminBoletins();
      break;
    case 'admin-usuarios':
      loadUsuarios();
      break;
  }
}

// ===================== API =====================
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
  if (connected) { dot.className = 'status-dot connected'; text.textContent = 'Conectado'; }
  else { dot.className = 'status-dot error'; text.textContent = 'Sem conexão'; }
}

// ===================== HELPERS =====================
function showLoading() { document.getElementById('loadingOverlay').classList.add('active'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('active'); }

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

function getDiaSemana(dateStr) {
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const d = new Date(dateStr + 'T12:00:00');
  return dias[d.getDay()];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Se já está formatado dd/mm/yyyy
  if (dateStr.includes('/')) return dateStr;
  // Se está ISO yyyy-mm-dd
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// ===================== VEÍCULOS (MOTORISTA) =====================
function initVeiculoPage() {
  document.getElementById('veiculoEncontrado').style.display = 'none';
  document.getElementById('veiculoFeedback').textContent = '';
  document.getElementById('inputCodVeiculo').value = '';
  state.veiculoSelecionado = null;

  // Set default month
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('vMesRef').value = `${now.getFullYear()}-${month}`;
}

async function buscarPorCodigo() {
  const codigo = document.getElementById('inputCodVeiculo').value.trim();
  const feedback = document.getElementById('veiculoFeedback');

  if (!codigo) {
    feedback.textContent = 'Digite um código para buscar.';
    feedback.className = 'veiculo-feedback error';
    return;
  }

  feedback.textContent = 'Buscando...';
  feedback.className = 'veiculo-feedback';
  showLoading();

  try {
    const res = await apiGet('buscarVeiculoPorCodigo', { codigo });
    if (res.success) {
      const v = res.data;
      state.veiculoSelecionado = v;

      document.getElementById('vTransportador').textContent = v.transportador || '';
      document.getElementById('vPlaca').textContent = v.placa || '';
      document.getElementById('vCodVeiculo').textContent = v.codVeiculo || '';
      document.getElementById('vRota').textContent = v.rota || '';

      document.getElementById('veiculoEncontrado').style.display = 'block';

      feedback.textContent = '✓ Veículo encontrado!';
      feedback.className = 'veiculo-feedback success';
    } else {
      state.veiculoSelecionado = null;
      document.getElementById('veiculoEncontrado').style.display = 'none';
      feedback.textContent = '✗ ' + res.error;
      feedback.className = 'veiculo-feedback error';
    }
  } catch (err) {
    feedback.textContent = '✗ Erro de conexão';
    feedback.className = 'veiculo-feedback error';
  }
  hideLoading();
}

async function criarBoletimVeiculo() {
  const v = state.veiculoSelecionado;
  if (!v) {
    showToast('Busque um veículo primeiro!', 'error');
    return;
  }

  const mesRef = document.getElementById('vMesRef').value;
  if (!mesRef) {
    showToast('Selecione o mês de referência!', 'error');
    return;
  }

  const data = {
    action: 'criarBoletim',
    transportador: v.transportador,
    motorista: state.user.nomeCompleto,
    placa: v.placa,
    codVeiculo: v.codVeiculo,
    rota: v.rota,
    mesReferencia: mesRef,
    usuario: state.user.usuario
  };

  showLoading();
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message, 'success');
      state.currentBoletimId = res.id;
      navigateTo('detalhes-boletim');
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

// ===================== MEUS BOLETINS =====================
async function loadMeusBoletins() {
  showLoading();
  try {
    const res = await apiGet('getBoletins', { usuario: state.user.usuario });
    if (res.success) state.boletins = res.data;
  } catch (err) { /* handled */ }
  hideLoading();

  const tbody = document.getElementById('meusBoletins');
  if (state.boletins.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum boletim cadastrado. Vá em "Meus Veículos" para criar um novo.</td></tr>';
    return;
  }

  tbody.innerHTML = state.boletins.map(b => `
    <tr>
      <td>${b.transportador}</td>
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
  navigateTo('detalhes-boletim');
}

async function confirmarExcluirBoletim(id) {
  if (!confirm('Tem certeza que deseja excluir este boletim e todos os seus registros?')) return;
  showLoading();
  try {
    const res = await apiPost({ action: 'excluirBoletim', id });
    if (res.success) {
      showToast(res.message, 'success');
      loadMeusBoletins();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

// ===================== ADMIN BOLETINS =====================
async function loadAdminBoletins() {
  showLoading();
  try {
    const res = await apiGet('getBoletins', { usuario: 'admin' });
    if (res.success) state.boletins = res.data;
  } catch (err) { /* handled */ }
  hideLoading();

  const tbody = document.getElementById('adminBoletins');
  if (state.boletins.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum boletim cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = state.boletins.map(b => `
    <tr>
      <td>${b.motorista}</td>
      <td>${b.transportador}</td>
      <td>${b.placa}</td>
      <td>${b.codVeiculo}</td>
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

// ===================== DETALHES BOLETIM =====================
async function loadBoletimDetalhes(boletimId) {
  if (!boletimId) return;
  showLoading();
  try {
    const [boletimRes, registrosRes] = await Promise.all([
      apiGet('getBoletim', { id: boletimId }),
      apiGet('getRegistros', { boletimId })
    ]);

    if (boletimRes.success) renderBoletimInfo(boletimRes.data);
    if (registrosRes.success) {
      state.registros = registrosRes.data;
      renderRegistros(registrosRes.data);
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

function renderBoletimInfo(b) {
  document.getElementById('boletimInfoGrid').innerHTML = `
    <div class="boletim-info-item"><span class="label">Transportador</span><span class="value">${b.transportador}</span></div>
    <div class="boletim-info-item"><span class="label">Motorista</span><span class="value">${b.motorista}</span></div>
    <div class="boletim-info-item"><span class="label">Placa</span><span class="value">${b.placa}</span></div>
    <div class="boletim-info-item"><span class="label">Cód. Veículo</span><span class="value">${b.codVeiculo}</span></div>
    <div class="boletim-info-item"><span class="label">Rota</span><span class="value">${b.rota}</span></div>
    <div class="boletim-info-item"><span class="label">Mês Referência</span><span class="value">${b.mesReferencia}</span></div>
  `;
}

function renderRegistros(registros) {
  const tbody = document.getElementById('registrosDiarios');
  const tfoot = document.getElementById('registrosTfoot');

  if (registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="empty-state">Nenhum registro. Clique em "Adicionar Dia" para começar.</td></tr>';
    tfoot.innerHTML = '';
    return;
  }

  registros.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  let totalKm = 0, totalPessoasIda = 0, totalPessoasVolta = 0;

  tbody.innerHTML = registros.map(r => {
    const km = parseFloat(r.kmRodados) || 0;
    totalKm += km;
    totalPessoasIda += parseInt(r.numPessoasIda) || 0;
    totalPessoasVolta += parseInt(r.numPessoasVolta) || 0;

    return `
    <tr>
      <td>${formatDate(r.data)}</td>
      <td>${r.diaSemana || ''}</td>
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
      <td><strong>${registros.length} dias</strong></td>
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
    const reg = state.registros.find(r => r.rowIndex === rowIndex);
    if (reg) {
      // Converter data para yyyy-mm-dd para o input date
      let dataVal = reg.data || '';
      if (dataVal.includes('/')) {
        const p = dataVal.split('/');
        if (p.length === 3) dataVal = `${p[2]}-${p[1]}-${p[0]}`;
      }
      document.getElementById('regData').value = dataVal;
      document.getElementById('regHoraIniIda').value = reg.horaInicialIda || '';
      document.getElementById('regKmIniIda').value = reg.kmInicialIda || '';
      document.getElementById('regHoraFinIda').value = reg.horaFinalIda || '';
      document.getElementById('regPessoasIda').value = reg.numPessoasIda || '';
      document.getElementById('regHoraIniVolta').value = reg.horaInicialVolta || '';
      document.getElementById('regKmFinVolta').value = reg.kmFinalVolta || '';
      document.getElementById('regHoraFinVolta').value = reg.horaFinalVolta || '';
      document.getElementById('regPessoasVolta').value = reg.numPessoasVolta || '';
      document.getElementById('regObjCusto').value = reg.objCusto || '';
    }
  } else {
    title.textContent = 'Adicionar Registro Diário';
    document.getElementById('formRegistro').reset();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('regData').value = `${yyyy}-${mm}-${dd}`;
  }

  modal.classList.add('active');
}

function fecharModalRegistro() {
  document.getElementById('modalRegistro').classList.remove('active');
  state.editingRowIndex = null;
}

function editarRegistro(rowIndex) { abrirModalRegistro(rowIndex); }

async function submitRegistro(e) {
  e.preventDefault();
  const dataInput = document.getElementById('regData').value; // yyyy-mm-dd
  // Converter para dd/mm/yyyy para salvar na planilha
  const parts = dataInput.split('-');
  const dataFormatada = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dataInput;

  const registro = {
    boletimId: state.currentBoletimId,
    data: dataFormatada,
    diaSemana: getDiaSemana(dataInput),
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

// ===================== ADMIN: USUÁRIOS =====================
async function loadUsuarios() {
  showLoading();
  try {
    const res = await apiGet('getUsuarios');
    if (res.success) {
      const tbody = document.getElementById('listaUsuarios');
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Nenhum usuário</td></tr>';
      } else {
        tbody.innerHTML = res.data.map(u => `
          <tr>
            <td>${u.usuario}</td>
            <td>${u.nomeCompleto}</td>
            <td><span style="text-transform:capitalize;">${u.perfil}</span></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) { /* handled */ }
  hideLoading();
}

async function submitUsuario(e) {
  e.preventDefault();
  const data = {
    action: 'cadastrarUsuario',
    usuario: document.getElementById('novoUsuario').value.trim(),
    senha: document.getElementById('novaSenha').value,
    nomeCompleto: document.getElementById('novoNome').value.trim(),
    perfil: document.getElementById('novoPerfil').value
  };

  if (!data.usuario || !data.senha || !data.nomeCompleto) {
    showToast('Preencha todos os campos!', 'error');
    return;
  }

  showLoading();
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('formUsuario').reset();
      loadUsuarios();
    } else {
      showToast(res.error, 'error');
    }
  } catch (err) { /* handled */ }
  hideLoading();
}
