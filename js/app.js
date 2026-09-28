// ==========================================================================
// ESTADO DA APLICAÇÃO EM MEMÓRIA LOCAL
// ==========================================================================
let appData = JSON.parse(localStorage.getItem('veneza_data')) || {
  produtos: [],
  movimentacoes: [],
  faturamentos: []
};

const initialDemoData = {
  produtos: [
    { id: '1', nome: 'Farol Dianteiro Gol G6', codigo: 'FAROL123', localizacao: 'Prateleira A2', quantidade: 4, estoqueMin: 2, precoCusto: 120.00, precoVenda: 180.00, foto: '' },
    { id: '2', nome: 'Para-choque Dianteiro Onix', codigo: 'PC-ONIX-19', localizacao: 'Corredor 01', quantidade: 1, estoqueMin: 2, precoCusto: 250.00, precoVenda: 410.00, foto: '' }
  ],
  movimentacoes: [
    { id: 'm1', data: '2026-09-20', tipo: 'Entrada', produtoNome: 'Farol Dianteiro Gol G6', quantidade: 4, obs: 'Lote inicial' }
  ],
  faturamentos: [
    { id: 'f1', data: '2026-09-25', descricao: 'Venda Farol Gol G6', valor: 180.00, obs: 'Balcão' }
  ]
};

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  loadLocalState();
  loadFirebaseConfigFields();
  renderAll();
});

function switchPage(pageId, element) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-item button').forEach(btn => btn.classList.remove('active'));

  const targetPage = document.getElementById(`page-${pageId}`);
  if(targetPage) targetPage.classList.add('active');
  if(element) element.classList.add('active');

  renderAll();
}

function loadLocalState() {
  const saved = localStorage.getItem('veneza_app_data');
  if (saved) {
    try { appData = JSON.parse(saved); } catch(e) { appData = initialDemoData; }
  } else {
    appData = initialDemoData;
    saveLocalState();
  }
}

function saveLocalState() {
  localStorage.setItem('veneza_app_data', JSON.stringify(appData));
}

function renderAll() {
  renderEstoqueTable(appData.produtos);
  renderDashboard();
  renderMovimentacoesTable();
  renderFinanceiroTable();
  renderRelatorios();
}

// ==========================================================================
// RENDERIZADORES DAS PÁGINAS
// ==========================================================================
function renderDashboard() {
  const totalPecas = appData.produtos.length;
  const qtdEstoque = appData.produtos.reduce((acc, p) => acc + Number(p.quantidade || 0), 0);
  const baixos = appData.produtos.filter(p => Number(p.quantidade) <= Number(p.estoqueMin || 1));

  document.getElementById('dashTotalPecas').innerText = totalPecas;
  document.getElementById('dashQtdEstoque').innerText = qtdEstoque;
  document.getElementById('dashAlertas').innerText = baixos.length;

  const lowStockContainer = document.getElementById('dashLowStockList');
  if (lowStockContainer) {
    if(baixos.length === 0) {
      lowStockContainer.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">Nenhuma peça com estoque baixo.</p>';
    } else {
      lowStockContainer.innerHTML = baixos.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 12px; border-radius:8px;">
          <div>
            <strong style="font-size:0.85rem;">${p.nome}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${p.localizacao}</div>
          </div>
          <span class="badge-status badge-danger">${p.quantidade} un.</span>
        </div>
      `).join('');
    }
  }
}

// ==========================================================================
// RENDERIZAR TABELA DE ESTOQUE (COM BOTÃO DE VENDA)
// ==========================================================================
function renderEstoqueTable(items) {
  const tbody = document.getElementById('tableEstoqueBody');
  if(!tbody) return;

  if(items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Nenhuma peça encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr>
      <td>
        ${p.foto 
          ? `<img src="${p.foto}" class="thumb-img">` 
          : `<div class="thumb-img" style="display:flex;align-items:center;justify-content:center;color:#a1a1aa;"><i data-lucide="image" style="width:20px;"></i></div>`}
      </td>
      <td><strong>${p.nome}</strong></td>
      <td><span class="code-badge">${p.codigo}</span></td>
      <td><span class="location-badge"><i data-lucide="map-pin" style="width:12px;"></i> ${p.localizacao}</span></td>
      <td>
        <strong style="color: ${Number(p.quantidade) <= Number(p.estoqueMin) ? 'var(--danger)' : 'inherit'}">
          ${p.quantidade} un.
        </strong>
      </td>
      <td>R$ ${Number(p.precoVenda || 0).toFixed(2)}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary" style="padding:6px 10px; background-color:var(--success-bg); color:var(--success); border-color:var(--success);" onclick="openVendaModal('${p.id}')" title="Registrar Venda">
            <i data-lucide="shopping-cart" style="width:14px;"></i> Vender
          </button>
          <button class="btn btn-secondary" style="padding:6px 10px;" onclick="deleteProduct('${p.id}')" title="Excluir">
            <i data-lucide="trash-2" style="width:14px; color:var(--danger);"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function renderMovimentacoesTable() {
  const tbody = document.getElementById('tableMovimentacoesBody');
  if(!tbody) return;
  tbody.innerHTML = appData.movimentacoes.map(m => `
    <tr>
      <td>${m.data}</td>
      <td><span class="badge-status ${m.tipo === 'Entrada' ? 'badge-success' : 'badge-danger'}">${m.tipo}</span></td>
      <td>${m.produtoNome}</td>
      <td><strong>${m.quantidade} un.</strong></td>
      <td>${m.obs || '-'}</td>
    </tr>
  `).join('');
}

function renderFinanceiroTable() {
  const tbody = document.getElementById('tableFinanceiroBody');
  if(!tbody) return;
  tbody.innerHTML = appData.faturamentos.map(f => `
    <tr>
      <td>${f.data}</td>
      <td>${f.descricao}</td>
      <td><strong style="color:var(--success);">R$ ${Number(f.valor).toFixed(2)}</strong></td>
      <td>${f.obs || '-'}</td>
    </tr>
  `).join('');
}

function renderRelatorios() {
  const totalValor = appData.produtos.reduce((acc, p) => acc + (Number(p.quantidade || 0) * Number(p.precoCusto || 0)), 0);
  document.getElementById('relValorEstoque').innerText = `R$ ${totalValor.toFixed(2)}`;
}

// ==========================================================================
// PESQUISA GLOBAL
// ==========================================================================
function handleGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  if(!q) {
    renderEstoqueTable(appData.produtos);
    return;
  }
  const filtered = appData.produtos.filter(p => 
    p.nome.toLowerCase().includes(q) ||
    p.codigo.toLowerCase().includes(q) ||
    p.localizacao.toLowerCase().includes(q)
  );
  renderEstoqueTable(filtered);
}

// ==========================================================================
// FOTOS & MODAL
// ==========================================================================
function previewAndCompressImage(fileInput) {
  const file = fileInput.files[0];
  const nameLabel = document.getElementById('fileNameText');
  
  if (!file) {
    if (nameLabel) nameLabel.innerText = 'Nenhum arquivo selecionado';
    return;
  }

  // Atualiza o texto com o nome do arquivo selecionado
  if (nameLabel) nameLabel.innerText = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 600;
      let scale = maxW / img.width;
      if (scale > 1) scale = 1;

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('prodPhotoBase64').value = compressedBase64;

      const preview = document.getElementById('photoPreview');
      preview.src = compressedBase64;
      preview.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function openProductModal() {
  document.getElementById('formProduct').reset();
  document.getElementById('prodPhotoBase64').value = '';
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('modalProduct').classList.add('active');
}

function closeProductModal() {
  document.getElementById('modalProduct').classList.remove('active');
}

// ==========================================================================
// ENVIO DO FORMULÁRIO COM TRATAMENTO DE ERRO
// ==========================================================================
function handleProductSubmit(e) {
  e.preventDefault();

  try {
    const nome = document.getElementById('prodNome').value.trim();
    const codigo = document.getElementById('prodCodigo').value.trim();
    const localizacao = document.getElementById('prodLocalizacao').value.trim();

    // Validação básica dos campos
    if (!nome || !codigo || !localizacao) {
      showToast('Campos obrigatórios', 'Por favor, preencha todos os campos com asterisco (*).', 'danger');
      return;
    }

    const newProd = {
      id: Date.now().toString(),
      nome: nome,
      codigo: codigo,
      localizacao: localizacao,
      quantidade: Number(document.getElementById('prodQtd').value || 0),
      estoqueMin: Number(document.getElementById('prodEstoqueMin').value || 1),
      precoCusto: Number(document.getElementById('prodPrecoCusto').value || 0),
      precoVenda: Number(document.getElementById('prodPrecoVenda').value || 0),
      foto: document.getElementById('prodPhotoBase64').value
    };

    appData.produtos.push(newProd);
    saveLocalState();
    closeProductModal();
    renderAll();

    // Notificação de sucesso com o nome da peça
    showToast('Peça Cadastrada!', `"${nome}" foi salva no estoque com sucesso.`, 'success');

  } catch (error) {
    console.error('Erro ao salvar peça:', error);
    showToast('Erro ao Cadastrar', 'Não foi possível salvar a peça. Tente novamente.', 'danger');
  }
}

// Variável temporária para guardar o ID da peça selecionada para exclusão
let itemToDeleteId = null;

// Abre o modal customizado de confirmação
function deleteProduct(id) {
  const product = appData.produtos.find(p => p.id === id);
  if (!product) return;

  itemToDeleteId = id;

  // Atualiza o nome do item no texto do modal
  const nameElement = document.getElementById('confirmItemName');
  if (nameElement) nameElement.innerText = `"${product.nome}"`;

  // Configura a ação do botão de confirmação
  const btnConfirm = document.getElementById('btnConfirmDelete');
  if (btnConfirm) {
    btnConfirm.onclick = () => confirmDeleteProduct(product.nome);
  }

  const modal = document.getElementById('modalConfirm');
  if (modal) {
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }
}

// Fecha o modal de confirmação
function closeConfirmModal() {
  const modal = document.getElementById('modalConfirm');
  if (modal) modal.classList.remove('active');
  itemToDeleteId = null;
}

// Executa a exclusão após o clique em "Sim, Excluir"
function confirmDeleteProduct(productName) {
  if (!itemToDeleteId) return;

  try {
    appData.produtos = appData.produtos.filter(p => p.id !== itemToDeleteId);
    saveLocalState();
    renderAll();
    closeConfirmModal();

    // Notificação visual de exclusão concluída
    showToast('Peça Excluída', `"${productName}" foi removida do estoque com sucesso.`, 'success');
  } catch (error) {
    console.error('Erro ao excluir peça:', error);
    showToast('Erro ao Excluir', 'Não foi possível excluir o item selecionado.', 'danger');
  }
}

// ==========================================================================
// GERENCIADOR DE CREDENCIAIS DO FIREBASE
// ==========================================================================
function saveFirebaseConfig() {
  const config = {
    apiKey: document.getElementById('cfgApiKey').value,
    authDomain: document.getElementById('cfgAuthDomain').value,
    projectId: document.getElementById('cfgProjectId').value,
    appId: document.getElementById('cfgAppId').value
  };

  localStorage.setItem('veneza_firebase_config', JSON.stringify(config));
  alert('Credenciais salvas com sucesso no navegador!');
  updateDBStatusUI(true);
}

function loadFirebaseConfigFields() {
  const saved = localStorage.getItem('veneza_firebase_config');
  if (saved) {
    try {
      const cfg = JSON.parse(saved);
      document.getElementById('cfgApiKey').value = cfg.apiKey || '';
      document.getElementById('cfgAuthDomain').value = cfg.authDomain || '';
      document.getElementById('cfgProjectId').value = cfg.projectId || '';
      document.getElementById('cfgAppId').value = cfg.appId || '';
      updateDBStatusUI(true);
    } catch(e) {}
  }
}

function updateDBStatusUI(isConfigured) {
  const dot = document.getElementById('dbDot');
  const text = document.getElementById('dbText');
  if(isConfigured) {
    dot.classList.add('online');
    text.innerText = 'Conectado';
  } else {
    dot.classList.remove('online');
    text.innerText = 'Demo Local';
  }
}

// ==========================================================================
// BACKUP JSON
// ==========================================================================
function exportDataJSON() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_veneza_auto_latas_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importDataJSON(e) {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if(imported.produtos) {
        appData = imported;
        saveLocalState();
        renderAll();
        alert('Backup restaurado com sucesso!');
      }
    } catch(err) {
      alert('Erro ao carregar o arquivo JSON.');
    }
  };
  reader.readAsText(file);
}

// ==========================================================================
// SISTEMA DE NOTIFICAÇÕES (TOASTS)
// ==========================================================================
function showToast(title, message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle-2' : 'alert-circle';

  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  // Remove automaticamente após 4 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// FUNÇÕES PARA REGISTRO DE VENDA E FATURAMENTO
// ==========================================================================

// 1. Abre o modal e preenche os dados da peça selecionada
function openVendaModal(productId) {
  const product = appData.produtos.find(p => p.id === productId);
  if (!product) return;

  if (product.quantidade <= 0) {
    showToast('Sem Estoque', 'Esta peça não possui unidades disponíveis.', 'danger');
    return;
  }

  document.getElementById('vendaProdId').value = product.id;
  document.getElementById('vendaProdNome').value = product.nome;
  document.getElementById('vendaQtd').value = 1;
  document.getElementById('vendaQtd').max = product.quantidade;
  document.getElementById('vendaPrecoUnitario').value = product.precoVenda || 0;
  document.getElementById('vendaObs').value = '';
  
  calcularTotalVenda();
  document.getElementById('modalVenda').classList.add('active');
}

// 2. Fecha o modal de venda
function closeVendaModal() {
  document.getElementById('modalVenda').classList.remove('active');
}

// 3. Multiplica Quantidade x Preço Unitário em tempo real no modal
function calcularTotalVenda() {
  const qtd = Number(document.getElementById('vendaQtd').value || 0);
  const preco = Number(document.getElementById('vendaPrecoUnitario').value || 0);
  const total = qtd * preco;
  document.getElementById('vendaValorTotal').value = `R$ ${total.toFixed(2)}`;
}

// 4. Salva a venda: baixa no estoque + registra movimentação + soma no faturamento
function handleVendaSubmit(e) {
  e.preventDefault();

  const prodId = document.getElementById('vendaProdId').value;
  const qtdVenda = Number(document.getElementById('vendaQtd').value);
  const precoUnitario = Number(document.getElementById('vendaPrecoUnitario').value);
  const obs = document.getElementById('vendaObs').value;
  const valorTotal = qtdVenda * precoUnitario;

  const product = appData.produtos.find(p => p.id === prodId);
  if (!product || product.quantidade < qtdVenda) {
    showToast('Quantidade Inválida', 'Quantidade maior do que a disponível no estoque.', 'danger');
    return;
  }

  // Abate a quantidade no estoque da peça
  product.quantidade -= qtdVenda;

  const hoje = new Date().toISOString().slice(0, 10);

  // Registra a saída na lista de movimentações
  appData.movimentacoes = appData.movimentacoes || [];
  appData.movimentacoes.unshift({
    id: Date.now().toString(),
    data: hoje,
    tipo: 'Saída',
    produtoNome: product.nome,
    quantidade: qtdVenda,
    obs: `Venda (R$ ${valorTotal.toFixed(2)})`
  });

  // Registra o valor no histórico de faturamento
  appData.faturamentos = appData.faturamentos || [];
  appData.faturamentos.unshift({
    id: Date.now().toString(),
    data: hoje,
    descricao: `Venda: ${product.nome} (${qtdVenda}x)`,
    valor: valorTotal,
    obs: obs || 'Balcão'
  });

  saveLocalState();
  closeVendaModal();
  renderAll(); // Re-renderiza a tela com os novos valores

  showToast('Venda Registrada!', `Venda de R$ ${valorTotal.toFixed(2)} salva com sucesso.`, 'success');
}

// 5. Calcula o faturamento da semana e do mês para atualizar os cards
function renderFinanceiroTable() {
  const tbody = document.getElementById('tableFinanceiroBody');
  const agora = new Date();
  
  // Início do mês atual
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  
  // Início da semana atual (Domingo)
  const inicioSemana = new Date(agora);
  inicioSemana.setDate(agora.getDate() - agora.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  let fatSemana = 0;
  let fatMes = 0;

  (appData.faturamentos || []).forEach(f => {
    const dataVenda = new Date(f.data + 'T00:00:00');
    const valor = Number(f.valor || 0);

    if (dataVenda >= inicioMes) fatMes += valor;
    if (dataVenda >= inicioSemana) fatSemana += valor;
  });

  // Atualiza o texto dos cards na tela
  const elemSemana = document.getElementById('finFatSemana');
  const elemMes = document.getElementById('finFatMes');
  const elemDashMes = document.getElementById('dashFatMes');

  if (elemSemana) elemSemana.innerText = `R$ ${fatSemana.toFixed(2)}`;
  if (elemMes) elemMes.innerText = `R$ ${fatMes.toFixed(2)}`;
  if (elemDashMes) elemDashMes.innerText = `R$ ${fatMes.toFixed(2)}`;

  if (!tbody) return;

  tbody.innerHTML = (appData.faturamentos || []).map(f => `
    <tr>
      <td>${f.data}</td>
      <td>${f.descricao}</td>
      <td><strong style="color:var(--success);">R$ ${Number(f.valor).toFixed(2)}</strong></td>
      <td>${f.obs || '-'}</td>
    </tr>
  `).join('');
}