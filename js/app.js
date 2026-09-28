// js/app.js

// Obtém a instância do Supabase vinda do supabase-config.js
const getDb = () => window.dbClient;

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa a página inicial (Dashboard)
  const defaultBtn = document.querySelector(".nav-menu button[onclick*='dashboard']") || document.querySelector(".sidebar button");
  switchPage('dashboard', defaultBtn);

  // Atualiza indicador do banco no rodapé
  updateDbStatusBadge(true);

  // Carrega os dados do Supabase
  loadDataFromSupabase();

  // Renderiza ícones
  if (window.lucide) window.lucide.createIcons();
});

// --- INDICADOR DO BANCO DE DADOS NO RODAPÉ ---
function updateDbStatusBadge(isOnline) {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;

  if (isOnline) {
    badge.className = 'badge-status online';
    badge.style.color = '#ffffff';
    badge.innerHTML = '<span class="dot" style="background-color: #10b981; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;"></span> Supabase';
  } else {
    badge.className = 'badge-status offline';
    badge.style.color = '#ef4444';
    badge.innerHTML = '<span class="dot" style="background-color: #ef4444; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;"></span> Off-line';
  }
}

// --- SISTEMA DE NAVEGAÇÃO ENTRE ABAS ---
function switchPage(pageId, element) {
  // 1. Oculta todas as seções e remove a classe 'active'
  const allSections = document.querySelectorAll('main section, .page-section, .page, section');
  allSections.forEach(sec => {
    sec.classList.remove('active');
    sec.style.display = 'none';
  });

  // 2. Mapeamento flexível de IDs para garantir que encontre a seção correta
  let targetSection = document.getElementById(pageId);

  if (!targetSection) {
    if (pageId === 'estoque' || pageId === 'pecas') {
      targetSection = document.getElementById('estoque') || document.getElementById('produtos') || document.getElementById('page-estoque');
    } else if (pageId === 'dashboard') {
      targetSection = document.getElementById('dashboard') || document.getElementById('page-dashboard');
    } else if (pageId === 'movimentacoes') {
      targetSection = document.getElementById('movimentacoes') || document.getElementById('page-movimentacoes');
    } else if (pageId === 'financeiro') {
      targetSection = document.getElementById('financeiro') || document.getElementById('page-financeiro');
    } else if (pageId === 'relatorios' || pageId === 'reports') {
      targetSection = document.getElementById('relatorios') || document.getElementById('reports') || document.getElementById('page-relatorios');
    } else if (pageId === 'configuracoes' || pageId === 'settings') {
      targetSection = document.getElementById('configuracoes') || document.getElementById('settings') || document.getElementById('page-configuracoes');
    }
  }

  // Se não achar por ID, tenta buscar por classe CSS
  if (!targetSection) {
    targetSection = document.querySelector(`main section.${pageId}`) || document.querySelector(`section.${pageId}`);
  }

  // 3. Exibe a seção encontrada
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
  } else {
    console.warn(`Seção com ID "${pageId}" não foi encontrada no HTML.`);
  }

  // 4. Atualiza os botões da barra lateral (marca o ativo)
  const navBtns = document.querySelectorAll('.sidebar button, .nav-menu button, .nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  if (element) {
    element.classList.add('active');
  }

  // 5. Atualiza ícones Lucide
  if (window.lucide) window.lucide.createIcons();
}

// --- CARREGAR DADOS DO SUPABASE ---
async function loadDataFromSupabase() {
  try {
    const db = getDb();
    if (!db) {
      updateDbStatusBadge(false);
      return;
    }

    const { data: produtos, error: errProdutos } = await db
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false });

    if (errProdutos) throw errProdutos;

    const { data: faturamentos, error: errFat } = await db
      .from('faturamentos')
      .select('*');

    if (errFat) throw errFat;

    updateDbStatusBadge(true);
    renderProductsTable(produtos || []);
    updateDashboardCards(produtos || [], faturamentos || []);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    updateDbStatusBadge(false);
    showToast('Erro de Conexão', 'Não foi possível carregar os dados do banco.', 'danger');
  }
}

// --- SALVAR PEÇA (CADASTRAR / EDITAR) ---
async function handleProductSubmit(e) {
  if (e) e.preventDefault();

  try {
    const db = getDb();
    const prodId = document.getElementById('prodId')?.value;
    const nome = document.getElementById('prodNome')?.value.trim();
    const codigo = document.getElementById('prodCodigo')?.value.trim();
    const localizacao = document.getElementById('prodLocalizacao')?.value.trim();

    if (!nome || !codigo) {
      showToast('Campos obrigatórios', 'Preencha os campos de Nome e Código.', 'danger');
      return;
    }

    const payload = {
      nome: nome,
      codigo: codigo,
      localizacao: localizacao || '',
      quantidade: Number(document.getElementById('prodQtd')?.value || 0),
      estoque_min: Number(document.getElementById('prodEstoqueMin')?.value || 1),
      preco_custo: Number(document.getElementById('prodPrecoCusto')?.value || 0),
      preco_venda: Number(document.getElementById('prodPrecoVenda')?.value || 0)
    };

    if (prodId) {
      const { error } = await db.from('produtos').update(payload).eq('id', prodId);
      if (error) throw error;
      showToast('Peça Atualizada!', `"${nome}" foi alterada com sucesso.`, 'success');
    } else {
      const { error } = await db.from('produtos').insert([payload]);
      if (error) throw error;
      showToast('Peça Cadastrada!', `"${nome}" foi salva no banco de dados.`, 'success');
    }

    closeProductModal();
    await loadDataFromSupabase();
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    showToast('Erro ao Cadastrar', 'Falha ao salvar a peça no banco de dados.', 'danger');
  }
}

// --- RENDERIZAR TABELA DE PRODUTOS ---
function renderProductsTable(produtos) {
  const tbody = document.getElementById('tbodyProdutos') || document.querySelector('tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhuma peça cadastrada.</td></tr>`;
    return;
  }

  produtos.forEach(prod => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.foto ? `<img src="${prod.foto}" class="table-thumb">` : '-'}</td>
      <td><strong>${prod.nome}</strong></td>
      <td><code>${prod.codigo}</code></td>
      <td>${prod.localizacao || '-'}</td>
      <td>${prod.quantidade}</td>
      <td>R$ ${Number(prod.preco_venda || 0).toFixed(2)}</td>
      <td>
        <button onclick="deleteProduct('${prod.id}', '${escapeHtml(prod.nome)}')" style="cursor:pointer; border:none; background:none; color:#ef4444;" title="Apagar Peça">
          <i data-lucide="trash-2"></i> Apagar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

// --- ATUALIZAR CARDS DO DASHBOARD ---
function updateDashboardCards(produtos, faturamentos) {
  const totalPecasEl = document.getElementById('cardTotalPecas') || document.getElementById('totalPecas');
  const estoqueBaixoEl = document.getElementById('cardEstoqueBaixo') || document.getElementById('estoqueBaixo');
  const faturamentoEl = document.getElementById('cardFaturamento') || document.getElementById('faturamentoMes');

  if (totalPecasEl) {
    const total = produtos.reduce((acc, p) => acc + (Number(p.quantidade) || 0), 0);
    totalPecasEl.innerText = total;
  }

  if (estoqueBaixoEl) {
    const baixos = produtos.filter(p => Number(p.quantidade) <= Number(p.estoque_min || 1)).length;
    estoqueBaixoEl.innerText = baixos;
  }

  if (faturamentoEl) {
    const totalFat = faturamentos.reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
    faturamentoEl.innerText = `R$ ${totalFat.toFixed(2)}`;
  }
}

// --- CONTROLE DOS MODAIS ---
function openProductModal() {
  const form = document.getElementById('formProduct') || document.querySelector('form');
  if (form) form.reset();
  const prodId = document.getElementById('prodId');
  if (prodId) prodId.value = '';

  const modal = document.getElementById('modalProduct') || document.getElementById('modalCadastro');
  if (modal) modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function closeProductModal() {
  const modal = document.getElementById('modalProduct') || document.getElementById('modalCadastro');
  if (modal) modal.classList.remove('active');
}

// --- DELETAR PEÇA ---
async function deleteProduct(id, nome) {
  if (!confirm(`Deseja realmente excluir a peça "${nome || ''}"?`)) return;
  try {
    const db = getDb();
    const { error } = await db.from('produtos').delete().eq('id', id);
    if (error) throw error;
    showToast('Peça Removida', 'A peça foi apagada do banco de dados.', 'warning');
    await loadDataFromSupabase();
  } catch (err) {
    console.error('Erro ao deletar:', err);
    showToast('Erro ao Apagar', 'Não foi possível excluir a peça.', 'danger');
  }
}

// --- MENSAGENS VISUAIS (TOAST) ---
function showToast(titulo, mensagem, tipo = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <div class="toast-header">
      <strong>${titulo}</strong>
    </div>
    <div class="toast-body">${mensagem}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}