// ==========================================
// CONTROLE DE ESTOQUE - VENEZA AUTO LATAS
// ==========================================

const getDb = () => window.dbClient;

let produtosCache = [];
let faturamentosCache = [];


// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    const defaultBtn =
        document.querySelector(".nav-menu button[onclick*='dashboard']") ||
        document.querySelector(".sidebar button");

    switchPage('dashboard', defaultBtn);

    updateDbStatusBadge(true);

    loadDataFromSupabase();

    if (window.lucide) {
        window.lucide.createIcons();
    }
});


// ==========================================
// STATUS DO BANCO
// ==========================================

function updateDbStatusBadge(online = true) {

    const badge = document.getElementById('dbStatusBadge');

    if (!badge) return;

    if (online) {
        badge.innerHTML = '<span class="dot"></span> Supabase';
        badge.classList.remove('offline');
        badge.classList.add('online');
    } else {
        badge.innerHTML = '<span class="dot"></span> Offline';
        badge.classList.remove('online');
        badge.classList.add('offline');
    }
}


// ==========================================
// NAVEGAÇÃO
// ==========================================

function switchPage(page, button = null) {

    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    const pagina =
        document.getElementById(`page-${page}`) ||
        document.getElementById(page);

    if (pagina) {
        pagina.classList.add('active');
    }

    document.querySelectorAll('.nav-menu button').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ==========================================
// CARREGAR DADOS
// ==========================================

async function loadDataFromSupabase() {

    const db = getDb();

    if (!db) {
        console.error('Supabase não está conectado.');
        updateDbStatusBadge(false);
        return;
    }

    try {

        const { data: produtos, error: produtosError } = await db
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false });

        if (produtosError) {
            throw produtosError;
        }


        const { data: faturamentos, error: faturamentosError } = await db
            .from('faturamentos')
            .select('*')
            .order('created_at', { ascending: false });

        if (faturamentosError) {
            throw faturamentosError;
        }


        produtosCache = produtos || [];
        faturamentosCache = faturamentos || [];


        renderProductsTable(produtosCache);
        updateDashboardCards(produtosCache, faturamentosCache);
        renderMovimentacoesTable(faturamentosCache);
        renderFinanceiroTable(faturamentosCache);
        atualizarRelatorios(produtosCache);


        updateDbStatusBadge(true);

    } catch (error) {

        console.error('Erro ao carregar dados:', error);

        updateDbStatusBadge(false);

        showToast(
            'Erro ao carregar os dados do banco.',
            'error'
        );
    }
}


// ==========================================
// FOTO DA PEÇA
// ==========================================

async function previewAndCompressImage(input) {

    const arquivo = input.files?.[0];

    if (!arquivo) return;


    if (!arquivo.type.startsWith('image/')) {

        showToast(
            'Selecione um arquivo de imagem.',
            'error'
        );

        input.value = '';

        return;
    }


    if (arquivo.size > 5 * 1024 * 1024) {

        showToast(
            'A imagem deve ter no máximo 5 MB.',
            'error'
        );

        input.value = '';

        return;
    }


    const fileName = document.getElementById('fileNameText');

    if (fileName) {
        fileName.textContent = arquivo.name;
    }


    try {

        const imagem = await carregarImagem(arquivo);

        const tamanhoMaximo = 1000;

        let largura = imagem.width;
        let altura = imagem.height;


        if (largura > tamanhoMaximo || altura > tamanhoMaximo) {

            if (largura > altura) {

                altura =
                    Math.round(
                        altura * tamanhoMaximo / largura
                    );

                largura = tamanhoMaximo;

            } else {

                largura =
                    Math.round(
                        largura * tamanhoMaximo / altura
                    );

                altura = tamanhoMaximo;
            }
        }


        const canvas = document.createElement('canvas');

        canvas.width = largura;
        canvas.height = altura;


        const contexto = canvas.getContext('2d');

        contexto.fillStyle = '#ffffff';
        contexto.fillRect(
            0,
            0,
            largura,
            altura
        );


        contexto.drawImage(
            imagem,
            0,
            0,
            largura,
            altura
        );


        const base64 =
            canvas.toDataURL(
                'image/jpeg',
                0.80
            );


        const campoFoto =
            document.getElementById('prodPhotoBase64');


        if (campoFoto) {
            campoFoto.value = base64;
        }


        mostrarPreviewFoto(base64);


    } catch (error) {

        console.error(
            'Erro ao processar imagem:',
            error
        );

        showToast(
            'Não foi possível processar a imagem.',
            'error'
        );
    }
}


// ==========================================
// CARREGAR IMAGEM
// ==========================================

function carregarImagem(arquivo) {

    return new Promise((resolve, reject) => {

        const leitor = new FileReader();


        leitor.onload = event => {

            const imagem = new Image();


            imagem.onload = () => {
                resolve(imagem);
            };


            imagem.onerror = () => {
                reject(
                    new Error('Imagem inválida.')
                );
            };


            imagem.src = event.target.result;
        };


        leitor.onerror = () => {
            reject(
                new Error('Erro ao ler arquivo.')
            );
        };


        leitor.readAsDataURL(arquivo);
    });
}


// ==========================================
// MOSTRAR FOTO
// ==========================================

function mostrarPreviewFoto(foto) {

    const preview =
        document.getElementById('photoPreview');

    if (!preview) return;


    if (!foto) {

        preview.src = '';
        preview.style.display = 'none';

        return;
    }


    preview.src = foto;
    preview.style.display = 'block';
}


// ==========================================
// ESCONDER FOTO
// ==========================================

function esconderPreviewFoto() {

    const preview =
        document.getElementById('photoPreview');

    if (preview) {

        preview.src = '';
        preview.style.display = 'none';
    }


    const fileName =
        document.getElementById('fileNameText');

    if (fileName) {
        fileName.textContent =
            'Nenhum arquivo selecionado';
    }
}


// ==========================================
// CADASTRAR / EDITAR PRODUTO
// ==========================================

async function handleProductSubmit(event) {

    event.preventDefault();


    const db = getDb();

    if (!db) {

        showToast(
            'Banco de dados não conectado.',
            'error'
        );

        return;
    }


    const id =
        document.getElementById('prodId')?.value || '';


    const nome =
        document.getElementById('prodNome')?.value.trim() || '';


    const codigo =
        document.getElementById('prodCodigo')?.value.trim() || '';


    const localizacao =
        document.getElementById('prodLocalizacao')?.value.trim() || '';


    if (!nome) {

        showToast(
            'Digite o nome da peça.',
            'error'
        );

        return;
    }


    const payload = {

        nome: nome,

        codigo: codigo,

        localizacao: localizacao,

        quantidade: Number(
            document.getElementById('prodQtd')?.value || 0
        ),

        estoque_min: Number(
            document.getElementById('prodEstoqueMin')?.value || 1
        ),

        preco_custo: Number(
            document.getElementById('prodPrecoCusto')?.value || 0
        ),

        preco_venda: Number(
            document.getElementById('prodPrecoVenda')?.value || 0
        ),
        marca_carro: document.getElementById('prodMarcaCarro')?.value.trim() || '',
        ano_carro:
        document.getElementById('prodAnoCarro')?.value.trim() || '',
        cor_peca: document.getElementById('prodCorPeca')?.value.trim() || ''
    };


    // ======================================
    // FOTO
    // ======================================

    const campoFoto =
        document.getElementById('prodPhotoBase64');


    if (campoFoto) {

        payload.foto =
            campoFoto.value || '';
    }


    try {

        // ==================================
        // EDITAR
        // ==================================

        if (id) {

            const { error } = await db
                .from('produtos')
                .update(payload)
                .eq('id', id);


            if (error) {
                throw error;
            }


            showToast(
                'Peça atualizada com sucesso!',
                'success'
            );

        }


        // ==================================
        // CADASTRAR
        // ==================================

        else {

            const { error } = await db
                .from('produtos')
                .insert([payload]);


            if (error) {
                throw error;
            }


            showToast(
                'Peça cadastrada com sucesso!',
                'success'
            );
        }


        closeProductModal();

        await loadDataFromSupabase();


    } catch (error) {

        console.error(
            'Erro ao salvar produto:',
            error
        );


        showToast(
            'Não foi possível salvar a peça.',
            'error'
        );
    }
}


// ==========================================
// NOVA PEÇA
// ==========================================

function openProductModal() {

    const form =
        document.getElementById('formProduct');


    if (form) {
        form.reset();
    }


    const prodId =
        document.getElementById('prodId');

    if (prodId) {
        prodId.value = '';
    }


    const campoFoto =
        document.getElementById('prodPhotoBase64');

    if (campoFoto) {
        campoFoto.value = '';
    }


    esconderPreviewFoto();


    const modal =
        document.getElementById('modalProduct');


    if (modal) {
        modal.classList.add('active');
    }


    alterarTituloModal(
        'Cadastrar Nova Peça'
    );


    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ==========================================
// EDITAR PEÇA
// ==========================================

function editProduct(id) {

    const produto =
        produtosCache.find(
            item =>
                String(item.id) === String(id)
        );


    if (!produto) {

        showToast(
            'Peça não encontrada.',
            'error'
        );

        return;
    }


    const campoId =
        document.getElementById('prodId');

    const campoNome =
        document.getElementById('prodNome');

    const campoCodigo =
        document.getElementById('prodCodigo');

    const campoLocalizacao =
        document.getElementById('prodLocalizacao');

    const campoQtd =
        document.getElementById('prodQtd');

    const campoEstoqueMin =
        document.getElementById('prodEstoqueMin');

    const campoPrecoCusto =
        document.getElementById('prodPrecoCusto');

    const campoPrecoVenda =
        document.getElementById('prodPrecoVenda');

    const campoFoto =
        document.getElementById('prodPhotoBase64');

    const inputFoto =
        document.getElementById('prodPhoto');

    const fileName =
        document.getElementById('fileNameText');

    document.getElementById('prodMarcaCarro').value = produto.marca_carro || '';
    document.getElementById('prodAnoCarro').value = produto.ano_carro || '';
    document.getElementById('prodCorPeca').value = produto.cor_peca || '';


    if (campoId) {
        campoId.value = produto.id || '';
    }

    if (campoNome) {
        campoNome.value = produto.nome || '';
    }

    if (campoCodigo) {
        campoCodigo.value = produto.codigo || '';
    }

    if (campoLocalizacao) {
        campoLocalizacao.value =
            produto.localizacao || '';
    }

    if (campoQtd) {
        campoQtd.value =
            produto.quantidade ?? 0;
    }

    if (campoEstoqueMin) {
        campoEstoqueMin.value =
            produto.estoque_min ?? 1;
    }

    if (campoPrecoCusto) {
        campoPrecoCusto.value =
            produto.preco_custo ?? 0;
    }

    if (campoPrecoVenda) {
        campoPrecoVenda.value =
            produto.preco_venda ?? 0;
    }


    // O navegador não permite preencher
    // automaticamente o input type="file".
    if (inputFoto) {
        inputFoto.value = '';
    }


    // Mantém a foto atual.
    if (campoFoto) {

        campoFoto.value =
            produto.foto || '';
    }


    if (produto.foto) {

        mostrarPreviewFoto(
            produto.foto
        );

        if (fileName) {
            fileName.textContent =
                'Imagem atual da peça';
        }

    } else {

        esconderPreviewFoto();
    }


    const modal =
        document.getElementById('modalProduct');


    if (modal) {
        modal.classList.add('active');
    }


    alterarTituloModal(
        'Editar Peça'
    );


    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ==========================================
// TÍTULO DO MODAL
// ==========================================

function alterarTituloModal(titulo) {

    const elemento =
        document.getElementById(
            'modalProductTitle'
        );


    if (elemento) {
        elemento.textContent = titulo;
    }
}


// ==========================================
// FECHAR MODAL DE PRODUTO
// ==========================================

function closeProductModal() {

    const modal =
        document.getElementById('modalProduct');


    if (modal) {
        modal.classList.remove('active');
    }
}


 // ==========================================
 // TABELA DE ESTOQUE
 // ==========================================

function renderProductsTable(produtos) {

    const listaProdutos = produtos || [];

    const tbody = document.getElementById(
        'tableEstoqueBody'
    );

    if (!tbody) return;

    tbody.innerHTML = '';

    if (!listaProdutos.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    Nenhuma peça cadastrada.
                </td>
            </tr>
        `;

        return;
    }

    listaProdutos.forEach(prod => {

        const quantidade = Number(
            prod.quantidade || 0
        );

        const estoqueMin = Number(
            prod.estoque_min || 0
        );

        const precoVenda = Number(
            prod.preco_venda || 0
        );

        const id = String(prod.id);

        let status = '';

        if (quantidade <= 0) {

            status = `
                <span class="status-badge danger">
                    Sem estoque
                </span>
            `;

        } else if (quantidade <= estoqueMin) {

            status = `
                <span class="status-badge warning">
                    Estoque baixo
                </span>
            `;

        } else {

            status = `
                <span class="status-badge success">
                    Normal
                </span>
            `;
        }

        const foto = prod.foto
            ? `
                <img
                    src="${escapeHtml(prod.foto)}"
                    alt="Foto da peça"
                    class="product-table-photo"
                >
            `
            : `
                <div class="product-table-photo-placeholder">
                    <i data-lucide="image"></i>
                </div>
            `;

        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>
                ${foto}
            </td>

            <td>
                <div class="produto-nome">
                    <div>
                        <strong>
                            ${escapeHtml(prod.nome || '-')}
                        </strong>

                        <small>
                            ID: ${escapeHtml(id)}
                        </small>
                    </div>
                </div>
            </td>

            <td>
                <span class="code-badge">
                    ${escapeHtml(prod.codigo || '-')}
                </span>
            </td>

            <td>
                <span class="location-badge">
                    <i data-lucide="map-pin"></i>
                    ${escapeHtml(prod.localizacao || '-')}
                </span>
            </td>

            <td>
                <div class="estoque-info">
                    <strong>
                        ${quantidade}
                    </strong>

                    ${status}
                </div>
            </td>

            <td>
                <strong>
                    R$ ${formatarMoeda(precoVenda)}
                </strong>
            </td>

            <td>
                <div class="acoes-estoque">

                    <button
                        type="button"
                        class="btn-edit"
                        data-tooltip="Ver peça"
                        onclick="viewProduct('${escapeHtml(id)}')"
                    >
                        <i data-lucide="eye"></i>
                    </button>

                    <button
                        type="button"
                        class="btn-edit"
                        data-tooltip="Editar peça"
                        onclick="editProduct('${escapeHtml(id)}')"
                    >
                        <i data-lucide="pencil"></i>
                    </button>

                    <button
                        type="button"
                        class="btn-baixa"
                        data-tooltip="Dar baixa"
                        onclick="darBaixaPeca('${escapeHtml(id)}')"
                    >
                        <i data-lucide="arrow-down-to-line"></i>
                    </button>

                    <button
                        type="button"
                        class="btn-delete"
                        data-tooltip="Excluir peça"
                        onclick="deleteProduct('${escapeHtml(id)}')"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>

                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// ==========================================
// VISUALIZAR PEÇA
// ==========================================

function viewProduct(id) {

    const produto = produtosCache.find(
        item => String(item.id) === String(id)
    );

    if (!produto) {
        showToast(
            'Peça não encontrada.',
            'error'
        );
        return;
    }

    let modal = document.getElementById(
        'modalDetalhesProduto'
    );

    if (!modal) {
        modal = document.createElement('div');

        modal.id = 'modalDetalhesProduto';

        modal.className = 'modal-overlay';

        modal.innerHTML = `
            <div class="modal">

                <div class="modal-header">

                    <h2 id="detalhesProdutoTitulo">
                        Informações da Peça
                    </h2>

                    <button
                        type="button"
                        class="btn btn-secondary"
                        onclick="closeProductDetails()"
                    >
                        <i data-lucide="x"></i>
                    </button>

                </div>

                <div id="detalhesProdutoConteudo"></div>

            </div>
        `;

        document.body.appendChild(modal);
    }

    const quantidade = Number(
        produto.quantidade || 0
    );

    const estoqueMin = Number(
        produto.estoque_min || 0
    );

    let statusTexto = '';

    if (quantidade <= 0) {

        statusTexto = 'Sem estoque';

    } else if (quantidade <= estoqueMin) {

        statusTexto = 'Estoque baixo';

    } else {

        statusTexto = 'Estoque normal';

    }

    const foto = produto.foto
        ? `
            <div class="product-details-photo">

                <img
                    src="${escapeHtml(produto.foto)}"
                    alt="Foto da peça"
                >

            </div>
        `
        : `
            <div class="product-details-photo">

                <i data-lucide="image"></i>

                <span>
                    Sem foto cadastrada
                </span>

            </div>
        `;

    const conteudo = document.getElementById(
        'detalhesProdutoConteudo'
    );

    conteudo.innerHTML = `

        <div class="product-details">

            ${foto}

            <div class="product-details-header">

                <h2>
                    ${escapeHtml(
                        produto.nome || 'Sem nome'
                    )}
                </h2>

                <span>
                    ${statusTexto}
                </span>

            </div>


            <div class="product-details-grid">

                <div>
                    <strong>ID</strong>

                    <span>
                        ${escapeHtml(
                            String(produto.id || '-')
                        )}
                    </span>
                </div>


                <div>
                    <strong>Código da Peça</strong>

                    <span>
                        ${escapeHtml(
                            produto.codigo || '-'
                        )}
                    </span>
                </div>


                <div>
                    <strong>Localização</strong>

                    <span>
                        ${escapeHtml(
                            produto.localizacao || '-'
                        )}
                    </span>
                </div>


                <div>
                    <strong>Marca do Carro</strong>

                    <span>
                        ${escapeHtml(
                            produto.marca_carro || '-'
                        )}
                    </span>
                </div>


                <div>
                    <strong>Ano</strong>

                    <span>
                        ${produto.ano_carro || '-'}
                    </span>
                </div>


                <div>
                    <strong>Cor da Peça</strong>

                    <span>
                        ${escapeHtml(
                            produto.cor_peca || '-'
                        )}
                    </span>
                </div>


                <div>
                    <strong>Quantidade</strong>

                    <span>
                        ${quantidade} unidade(s)
                    </span>
                </div>


                <div>
                    <strong>Estoque Mínimo</strong>

                    <span>
                        ${estoqueMin}
                    </span>
                </div>


                <div>
                    <strong>Preço de Custo</strong>

                    <span>
                        R$ ${formatarMoeda(
                            produto.preco_custo
                        )}
                    </span>
                </div>


                <div>
                    <strong>Preço de Venda</strong>

                    <span>
                        R$ ${formatarMoeda(
                            produto.preco_venda
                        )}
                    </span>
                </div>

            </div>


            <div class="product-details-actions">

                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="
                        closeProductDetails();
                        editProduct('${escapeHtml(
                            String(produto.id)
                        )}');
                    "
                >

                    <i data-lucide="pencil"></i>

                    Editar Peça

                </button>


                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="closeProductDetails()"
                >

                    Fechar

                </button>

            </div>

        </div>
    `;

    modal.classList.add('active');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// ==========================================
// FECHAR DETALHES
// ==========================================

function closeProductDetails() {

    const modal =
        document.getElementById(
            'modalDetalhesProduto'
        );


    if (modal) {
        modal.classList.remove('active');
    }
}


// ==========================================
// DAR BAIXA
// ==========================================

async function darBaixaPeca(id, quantidadeInformada = null) {
    const db = getDb();

    if (!db) {
        showToast(
            'Banco não conectado.',
            'error'
        );
        return;
    }

    const produto = produtosCache.find(
        item => String(item.id) === String(id)
    );

    if (!produto) {
        showToast(
            'Peça não encontrada.',
            'error'
        );
        return;
    }

    // ======================================
    // ABRIR MODAL DE VENDA
    // ======================================

    if (quantidadeInformada === null) {
        const modal = document.getElementById('modalVenda');

        const campoId = document.getElementById('vendaProdId');
        const campoNome = document.getElementById('vendaProdNome');
        const campoQtd = document.getElementById('vendaQtd');
        const campoPreco = document.getElementById('vendaPrecoUnitario');
        const campoTotal = document.getElementById('vendaValorTotal');
        const campoObs = document.getElementById('vendaObs');

        if (campoId) {
            campoId.value = produto.id || '';
        }

        if (campoNome) {
            campoNome.value = produto.nome || '';
        }

        if (campoQtd) {
            campoQtd.value = 1;
            campoQtd.max = Number(produto.quantidade || 0);
        }

        if (campoPreco) {
            campoPreco.value = Number(
                produto.preco_venda || 0
            ).toFixed(2);
        }

        if (campoTotal) {
            campoTotal.value =
                `R$ ${formatarMoeda(produto.preco_venda || 0)}`;
        }

        if (campoObs) {
            campoObs.value = '';
        }

        if (modal) {
            modal.classList.add('active');
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        return;
    }

    // ======================================
    // PROCESSAR BAIXA
    // ======================================

    let quantidade = Number(quantidadeInformada);

    if (
        !Number.isInteger(quantidade) ||
        quantidade <= 0
    ) {
        showToast(
            'Digite uma quantidade válida.',
            'error'
        );
        return;
    }

    const estoqueAtual =
        Number(produto.quantidade || 0);

    if (quantidade > estoqueAtual) {
        showToast(
            'A quantidade informada é maior que o estoque.',
            'error'
        );
        return;
    }

    const novoEstoque =
        estoqueAtual - quantidade;

    const valorUnitario =
        Number(produto.preco_venda || 0);

    const valorTotal =
        valorUnitario * quantidade;

    try {
        const {
            error: estoqueError
        } = await db
            .from('produtos')
            .update({
                quantidade: novoEstoque
            })
            .eq('id', produto.id);

        if (estoqueError) {
            throw estoqueError;
        }

        const {
            error: faturamentoError
        } = await db
            .from('faturamentos')
            .insert([{
                data: new Date().toISOString(),
                descricao:
                    `Venda - ${produto.nome} (${quantidade} un.)`,
                valor: valorTotal,
                obs: 'Baixa de estoque'
            }]);

        if (faturamentoError) {
            await db
                .from('produtos')
                .update({
                    quantidade: estoqueAtual
                })
                .eq('id', produto.id);

            throw faturamentoError;
        }

        showToast(
            'Baixa registrada com sucesso!',
            'success'
        );

        await loadDataFromSupabase();

    } catch (error) {
        console.error(
            'Erro ao dar baixa:',
            error
        );

        showToast(
            'Não foi possível registrar a baixa.',
            'error'
        );
    }
}

let produtoParaExcluir = null;

// ==========================================
// EXCLUIR PRODUTO
// ==========================================

function deleteProduct(id) {
    const produto = produtosCache.find(
        item => String(item.id) === String(id)
    );

    if (!produto) {
        showToast(
            'Peça não encontrada.',
            'error'
        );
        return;
    }

    produtoParaExcluir = produto;

    const nome = document.getElementById('confirmItemName');
    const modal = document.getElementById('modalConfirm');

    if (nome) {
        nome.textContent = produto.nome || 'esta peça';
    }

    if (modal) {
        modal.classList.add('active');
    }

    const botaoConfirmar =
        document.getElementById('btnConfirmDelete');

    if (botaoConfirmar) {
        botaoConfirmar.onclick = confirmarExclusaoProduto;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function fecharModalConfirmacao() {
    const modal =
        document.getElementById('modalConfirm');

    if (modal) {
        modal.classList.remove('active');
    }

    produtoParaExcluir = null;
}

async function confirmarExclusaoProduto() {
    if (!produtoParaExcluir) {
        return;
    }

    const produto = produtoParaExcluir;
    const db = getDb();

    if (!db) {
        showToast(
            'Banco não conectado.',
            'error'
        );
        return;
    }

    try {
        const { error } = await db
            .from('produtos')
            .delete()
            .eq('id', produto.id);

        if (error) {
            throw error;
        }

        fecharModalConfirmacao();

        showToast(
            'Peça apagada com sucesso.',
            'success'
        );

        await loadDataFromSupabase();

    } catch (error) {
        console.error(
            'Erro ao apagar produto:',
            error
        );

        showToast(
            'Não foi possível apagar a peça.',
            'error'
        );
    }
}


// ==========================================
// DASHBOARD
// ==========================================

function updateDashboardCards(
    produtos,
    faturamentos
) {

    const totalPecas =
        produtos.length;


    const quantidadeEstoque =
        produtos.reduce(
            (total, produto) =>
                total +
                Number(produto.quantidade || 0),
            0
        );


    const alertas =
        produtos.filter(produto => {

            const quantidade =
                Number(produto.quantidade || 0);

            const minimo =
                Number(produto.estoque_min || 0);

            return quantidade <= minimo;

        }).length;


    const agora =
        new Date();


    const mesAtual =
        agora.getMonth();


    const anoAtual =
        agora.getFullYear();


    const faturamentoMes =
        faturamentos.reduce(
            (total, item) => {

                const data =
                    new Date(
                        item.data ||
                        item.created_at
                    );


                if (
                    data.getMonth() === mesAtual &&
                    data.getFullYear() === anoAtual
                ) {

                    return total +
                        Number(item.valor || 0);
                }


                return total;

            },
            0
        );


    definirTexto(
        'dashTotalPecas',
        totalPecas
    );


    definirTexto(
        'dashQtdEstoque',
        quantidadeEstoque
    );


    definirTexto(
        'dashAlertas',
        alertas
    );


    definirTexto(
        'dashFatMes',
        `R$ ${formatarMoeda(
            faturamentoMes
        )}`
    );
}


// ==========================================
// MOVIMENTAÇÕES
// ==========================================

function renderMovimentacoesTable(
    faturamentos
) {

    const tbody =
        document.getElementById(
            'tableMovimentacoesBody'
        );


    if (!tbody) return;


    tbody.innerHTML = '';


    if (!faturamentos.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Nenhuma movimentação encontrada.
                </td>
            </tr>
        `;

        return;
    }


    faturamentos.forEach(item => {

        const data =
            new Date(
                item.data ||
                item.created_at
            );


        const descricao =
            item.descricao || '-';


        let produtoNome = descricao;
        let quantidade = '-';


        const correspondencia =
            descricao.match(
                /^Venda - (.+) \((\d+) un\.\)$/
            );


        if (correspondencia) {

            produtoNome =
                correspondencia[1];

            quantidade =
                correspondencia[2];
        }


        const tr =
            document.createElement('tr');


        tr.innerHTML = `

            <td>
                ${formatarData(data)}
            </td>

            <td>
                Saída
            </td>

            <td>
                ${escapeHtml(produtoNome)}
            </td>

            <td>
                ${quantidade}
            </td>

            <td>
                ${escapeHtml(item.obs || '-')}
            </td>

        `;


        tbody.appendChild(tr);
    });
}


// ==========================================
// FINANCEIRO
// ==========================================

function renderFinanceiroTable(
    faturamentos
) {

    const tbody =
        document.getElementById(
            'tableFinanceiroBody'
        );


    if (!tbody) return;


    tbody.innerHTML = '';


    if (!faturamentos.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    Nenhum faturamento registrado.
                </td>
            </tr>
        `;

        definirTexto(
            'finFatSemana',
            'R$ 0,00'
        );

        definirTexto(
            'finFatMes',
            'R$ 0,00'
        );

        return;
    }


    faturamentos.forEach(item => {

        const data =
            new Date(
                item.data ||
                item.created_at
            );


        const tr =
            document.createElement('tr');


        tr.innerHTML = `

            <td>
                ${formatarData(data)}
            </td>

            <td>
                ${escapeHtml(
                    item.descricao || '-'
                )}
            </td>

            <td>
                R$ ${formatarMoeda(
                    item.valor
                )}
            </td>

            <td>
                ${escapeHtml(
                    item.obs || '-'
                )}
            </td>

        `;


        tbody.appendChild(tr);
    });


    const agora =
        new Date();


    const inicioSemana =
        new Date(agora);


    inicioSemana.setDate(
        agora.getDate() -
        agora.getDay()
    );


    inicioSemana.setHours(
        0,
        0,
        0,
        0
    );


    const inicioMes =
        new Date(
            agora.getFullYear(),
            agora.getMonth(),
            1
        );


    let totalSemana = 0;
    let totalMes = 0;


    faturamentos.forEach(item => {

        const data =
            new Date(
                item.data ||
                item.created_at
            );


        const valor =
            Number(item.valor || 0);


        if (data >= inicioSemana) {
            totalSemana += valor;
        }


        if (data >= inicioMes) {
            totalMes += valor;
        }
    });


    definirTexto(
        'finFatSemana',
        `R$ ${formatarMoeda(
            totalSemana
        )}`
    );


    definirTexto(
        'finFatMes',
        `R$ ${formatarMoeda(
            totalMes
        )}`
    );
}


// ==========================================
// RELATÓRIOS
// ==========================================

function atualizarRelatorios(produtos) {

    const valorEstoque =
        produtos.reduce(
            (total, produto) => {

                const quantidade =
                    Number(
                        produto.quantidade || 0
                    );

                const custo =
                    Number(
                        produto.preco_custo || 0
                    );

                return total +
                    quantidade * custo;

            },
            0
        );


    definirTexto(
        'relValorEstoque',
        `R$ ${formatarMoeda(
            valorEstoque
        )}`
    );
}


// ==========================================
// PESQUISA RÁPIDA
// ==========================================

function handleGlobalSearch(valor) {

    const busca = String(valor || '')
        .toLowerCase()
        .trim();

    // Se a pesquisa estiver vazia,
    // mostra todas as peças novamente.
    if (!busca) {
        renderProductsTable(produtosCache);
        return;
    }

    // Cria uma lista somente para a pesquisa.
    const resultados = produtosCache.filter(produto => {

        const nome = String(
            produto.nome || ''
        ).toLowerCase();

        const codigo = String(
            produto.codigo || ''
        ).toLowerCase();

        const localizacao = String(
            produto.localizacao || ''
        ).toLowerCase();

        const marcaCarro = String(
            produto.marca_carro || ''
        ).toLowerCase();

        const anoCarro = String(
            produto.ano_carro || ''
        ).toLowerCase();

        const corPeca = String(
            produto.cor_peca || ''
        ).toLowerCase();

        return (
            nome.includes(busca) ||
            codigo.includes(busca) ||
            localizacao.includes(busca) ||
            marcaCarro.includes(busca) ||
            anoCarro.includes(busca) ||
            corPeca.includes(busca)
        );
    });

    // Mostra somente os resultados.
    renderProductsTable(resultados);
}


// ==========================================
// CONFIGURAÇÃO FIREBASE
// ==========================================

function saveFirebaseConfig() {

    showToast(
        'O sistema está usando Supabase. A configuração do Firebase não é necessária.',
        'success'
    );
}


// ==========================================
// UTILITÁRIOS
// ==========================================

function extrairQuantidade(texto) {

    const resultado =
        String(texto).match(/\d+/);


    return resultado
        ? Number(resultado[0])
        : 1;
}


function definirTexto(id, valor) {

    const elemento =
        document.getElementById(id);


    if (elemento) {
        elemento.textContent = valor;
    }
}


function formatarMoeda(valor) {

    return Number(valor || 0)
        .toFixed(2)
        .replace('.', ',');
}


function formatarData(data) {

    if (
        !(data instanceof Date) ||
        isNaN(data.getTime())
    ) {

        return '-';
    }


    return data.toLocaleDateString(
        'pt-BR'
    );
}


// ==========================================
// TOAST
// ==========================================

function showToast(
    mensagem,
    tipo = 'success'
) {

    const container =
        document.getElementById(
            'toastContainer'
        );


    if (container) {

        const toast =
            document.createElement('div');


        toast.className =
            `toast ${tipo}`;


        toast.textContent =
            mensagem;


        container.appendChild(toast);


        setTimeout(() => {

            toast.remove();

        }, 3500);


        return;
    }


    alert(mensagem);
}


// ==========================================
// SEGURANÇA
// ==========================================

function escapeHtml(valor) {

    return String(valor ?? '')
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}


// ==========================================
// MODAL DE VENDA
// ==========================================

function closeVendaModal() {

    const modal =
        document.getElementById(
            'modalVenda'
        );


    if (modal) {
        modal.classList.remove('active');
    }
}


function calcularTotalVenda() {

    const quantidade =
        Number(
            document.getElementById(
                'vendaQtd'
            )?.value || 0
        );


    const preco =
        Number(
            document.getElementById(
                'vendaPrecoUnitario'
            )?.value || 0
        );


    const total =
        quantidade * preco;


    const campo =
        document.getElementById(
            'vendaValorTotal'
        );


    if (campo) {

        campo.value =
            `R$ ${formatarMoeda(total)}`;
    }
}


async function handleVendaSubmit(event) {
    event.preventDefault();

    const id =
        document.getElementById('vendaProdId')?.value;

    const quantidade =
        Number(
            document.getElementById('vendaQtd')?.value || 0
        );

    if (!id || quantidade <= 0) {
        showToast(
            'Dados da venda inválidos.',
            'error'
        );
        return;
    }

    closeVendaModal();

    await darBaixaPeca(
        id,
        quantidade
    );
}


// ==========================================
// MODAL PERSONALIZADO
// ==========================================

function showCustomModal(
    titulo,
    mensagem,
    callback = null
) {

    const confirmar =
        confirm(
            `${titulo}\n\n${mensagem}`
        );


    if (
        confirmar &&
        typeof callback === 'function'
    ) {

        callback();
    }
}