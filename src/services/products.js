import { supabase } from '../lib/supabase.js';
import { addToCart } from './cart.js';
import { showDialog } from '../ui/dialog.js';
import { getProductRating, submitRating } from './reviews.js';

const mockProducts = [
    {
        id: 1,
        name: 'Camisa Polo Premium',
        category: 'Vestuário | Masculino',
        price: 189.90,
        tag: 'Novo',
        image: '/images/vestuario/camisa-polo.jpg'
    },
    {
        id: 2,
        name: 'Blusa de Lã Essential',
        category: 'Vestuário | Feminino',
        price: 249.00,
        tag: 'Oferta',
        image: '/images/vestuario/blusa-la.jpg'
    }
];

export async function renderProducts(categoryFilter = 'todos', tagFilter = null) {
    const container = document.getElementById('featured-products');
    if (!container) return;

    container.innerHTML = `<div class="col-span-full text-center p-8">Carregando ${tagFilter ? 'Ofertas' : 'Produtos'}...</div>`;

    try {
        let query = supabase.from('products').select('*');

        if (categoryFilter !== 'todos') {
            query = query.eq('department', categoryFilter);
        }

        if (tagFilter) {
            query = query.ilike('tag', `%${tagFilter}%`);
        }

        const { data: realProducts, error } = await query.order('created_at', { ascending: false });

        if (error || !realProducts || realProducts.length === 0) {
            console.warn("Nenhum dado real no Supabase ou Erro. Mostrando dados locais provisiorios.");
            const filteredMocks = mockProducts.filter(p => {
                let matchCat = true;
                let matchTag = true;

                if (categoryFilter !== 'todos') {
                    const mockCategoryWord = p.category.split(' ')[0].toLowerCase().trim().replace('ú', 'u').replace('ó', 'o').replace('é', 'e');
                    matchCat = mockCategoryWord === categoryFilter;
                }

                if (tagFilter) {
                    matchTag = p.tag && p.tag.toLowerCase().includes(tagFilter.toLowerCase());
                }

                return matchCat && matchTag;
            });

            if (filteredMocks.length === 0 && tagFilter) {
                container.innerHTML = '<div class="col-span-full text-center p-8">Nenhuma oferta encontrada no momento.</div>';
                return;
            }

            renderCards(container, filteredMocks);
        } else {
            renderCards(container, realProducts);
        }

    } catch (err) {
        console.warn("Erro de Conexão com Supabase:", err);
        renderCards(container, mockProducts);
    }
}

function renderCards(containerElement, productsArray) {
    containerElement.innerHTML = '';

    productsArray.forEach(product => {
        const formattedPrice = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(product.price);

        const catLabel = product.department
            ? `${product.department} | ${product.gender}`
            : product.category;

        const imgUrlStr = product.image_url || product.image || '';
        const imgArray = imgUrlStr.split(',').filter(u => u.trim() !== '');

        // Fallback caso não tenha imagem
        const mainImg = imgArray.length > 0 ? imgArray[0] : 'https://placehold.co/400x400/f8fafc/94a3b8?text=Sem+Foto';

        // Lógica robusta: Se não tiver a propriedade, se for nulo, se for vazio ou se for <= 0, está esgotado.
        const stockValue = parseFloat(product.stock);
        const isOutOfStock = isNaN(stockValue) || stockValue <= 0;

        const card = document.createElement('article');
        card.className = `product-card ${isOutOfStock ? 'out-of-stock' : ''}`;
        card.innerHTML = `
      <div class="product-image bg-contain bg-no-repeat bg-center cursor-pointer ${isOutOfStock ? 'grayscale opacity-70 pointer-events-none' : ''}" style="background-image: url('${mainImg}')" title="${isOutOfStock ? 'Indisponível' : 'Ver fotos'}">
        ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ''}
        ${isOutOfStock ? `<div class="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-extrabold text-[1.2rem] uppercase tracking-widest backdrop-blur-[2px]">Esgotado</div>` : ''}
      </div>
      <div class="product-info">
        <span class="product-category capitalize">${catLabel}</span>
        <h3 class="product-name ${isOutOfStock ? 'text-muted' : ''}">${product.name}</h3>
        
        <div class="product-rating flex items-center gap-[0.3rem] my-[0.3rem] text-[0.85rem] text-yellow-400" id="card-rating-${product.id}">
            <span class="text-muted/30">Carregando notas...</span>
        </div>

        <p class="product-price ${isOutOfStock ? 'line-through opacity-50' : ''}">${formattedPrice}</p>
        <button class="btn btn-primary btn-full btn-add-cart mt-2 ${isOutOfStock ? '!bg-slate-400 cursor-not-allowed transform-none shadow-none' : ''}" 
                data-id="${product.id}" 
                ${isOutOfStock ? 'disabled' : ''}>
          ${isOutOfStock ? 'Indisponível' : 'Comprar'}
        </button>
      </div>
    `;

        const btnAdd = card.querySelector('.btn-add-cart');
        if (!isOutOfStock) {
            btnAdd.addEventListener('click', () => {
                addToCart(product);
            });

            const galleryBtn = card.querySelector('.product-image');
            galleryBtn.addEventListener('click', () => {
                openGalleryModal(imgArray, product.id);
            });
        }

        containerElement.appendChild(card);

        // Dispara a busca da nota média sem travar o carregamento dos cards
        renderCardRating(product.id).catch(e => console.error("Erro na nota do item", e));
    });
}

async function renderCardRating(productId) {
    const ratingContainer = document.getElementById(`card-rating-${productId}`);
    if (!ratingContainer) return;

    const ratingData = await getProductRating(productId);
    const avg = Math.round(ratingData.average);

    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += (i <= avg) ? '<span>★</span>' : '<span class="text-muted/30">★</span>';
    }

    starsHtml += `<span class="text-muted text-[0.75rem] ml-1">(${ratingData.count} avaliações)</span>`;
    ratingContainer.innerHTML = starsHtml;
}

function openGalleryModal(imgUrls, productId = null) {
    const modal = document.getElementById('gallery-modal');
    const container = document.getElementById('gallery-container');
    const mainImg = document.getElementById('gallery-main-img');
    const btnClose = document.getElementById('btn-close-gallery');
    const viewer = modal.querySelector('.gallery-main-viewer');

    if (!modal || !container || !mainImg || !viewer) return;

    container.innerHTML = '';
    mainImg.src = imgUrls[0];
    mainImg.style.transform = 'scale(1)';

    // Lógica de Lupa (Zoom)
    viewer.addEventListener('mousemove', (e) => {
        const { left, top, width, height } = viewer.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;

        mainImg.style.transformOrigin = `${x}% ${y}%`;
        mainImg.style.transform = 'scale(2.5)';
    });

    viewer.addEventListener('mouseleave', () => {
        mainImg.style.transform = 'scale(1)';
    });

    imgUrls.forEach((url, index) => {
        if (!url.trim()) return;
        const thumb = document.createElement('img');
        thumb.src = url;
        thumb.className = `gallery-thumb ${index === 0 ? 'active' : ''}`;
        thumb.style.width = '80px';
        thumb.style.height = '80px';
        thumb.style.objectFit = 'contain';
        thumb.style.cursor = 'pointer';
        thumb.style.border = index === 0 ? '2px solid hsl(var(--accent-color))' : '2px solid transparent';
        thumb.style.borderRadius = '10px';
        thumb.style.padding = '4px';
        thumb.style.transition = 'var(--transition)';
        thumb.style.backgroundColor = '#fff';

        thumb.addEventListener('click', () => {
            mainImg.src = url;
            mainImg.style.transform = 'scale(1)';

            // Destaca a miniatura ativa
            container.querySelectorAll('img').forEach(img => {
                img.style.borderColor = 'transparent';
            });
            thumb.style.borderColor = 'hsl(var(--accent-color))';
        });

        container.appendChild(thumb);
        container.appendChild(thumb);
    });

    // ==========================================
    // LÓGICA DE AVALIAÇÃO ONDE O ANÔNIMO NÃO PASSA
    // ==========================================
    const ratingWidget = document.getElementById('gallery-rating-widget');
    const ratingStars = document.querySelectorAll('.star-btn');
    const msgElement = document.getElementById('gallery-rating-msg');

    if (ratingWidget && productId) {
        ratingWidget.style.display = 'block';
        msgElement.innerHTML = '';
        msgElement.style.color = 'inherit';

        ratingStars.forEach(star => {
            star.style.color = 'hsl(var(--text-secondary)/0.3)'; // Reset visual

            // Macaquice segura do Vanilla JS para limpar Event Listeners antigos
            const newStar = star.cloneNode(true);
            star.parentNode.replaceChild(newStar, star);

            newStar.addEventListener('click', async (e) => {
                const val = parseInt(e.target.getAttribute('data-val'));
                const allStars = newStar.parentNode.querySelectorAll('.star-btn');

                // Pinta as estrelinhas aé onde ele clicou para feedback imediato
                allStars.forEach((s, idx) => {
                    s.style.color = (idx < val) ? '#fbbf24' : 'hsl(var(--text-secondary)/0.3)';
                });

                msgElement.textContent = 'Enviando...';
                const result = await submitRating(productId, val);

                if (result.error === 'auth_required') {
                    msgElement.style.color = '#f44336';
                    msgElement.textContent = 'Acesso Negado: Entre na conta para avaliar.';
                    // Retira o dourado
                    allStars.forEach(s => s.style.color = 'hsl(var(--text-secondary)/0.3)');

                    // Dispara o modal de login 
                    setTimeout(() => {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                        const authModal = document.getElementById('auth-modal');
                        if (authModal) authModal.classList.add('active');
                    }, 1000);
                } else if (result.error) {
                    msgElement.style.color = '#f44336';
                    msgElement.textContent = 'Erro ao enviar. Tente novamente.';
                } else {
                    msgElement.style.color = '#4caf50';
                    msgElement.textContent = 'Obrigado por avaliar este produto!';
                    // Dispara atualização da média lá da vitrine
                    renderCardRating(productId);
                }
            });
        });

    } else if (ratingWidget) {
        ratingWidget.style.display = 'none'; // Esconde o bloco de avaliação se mock data sem ID real
    }

    modal.style.display = 'flex';
    modal.classList.add('active');

    if (btnClose) {
        btnClose.onclick = () => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }
}

// Paginação de Gestão de Produtos
let adminProductsData = [];
let adminProductsFiltered = [];
let adminProductsPage = 1;
const ADMIN_PRODUCTS_PER_PAGE = 10;

function renderAdminProductsTable() {
    const tableBody = document.getElementById('admin-products-table');
    if (!tableBody) return;

    if (!adminProductsFiltered || adminProductsFiltered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">Nenhum produto cadastrado/encontrado.</td></tr>';
        const paginationContainer = document.getElementById('admin-products-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(adminProductsFiltered.length / ADMIN_PRODUCTS_PER_PAGE);
    if (adminProductsPage > totalPages) adminProductsPage = totalPages;
    if (adminProductsPage < 1) adminProductsPage = 1;

    const startIdx = (adminProductsPage - 1) * ADMIN_PRODUCTS_PER_PAGE;
    const endIdx = startIdx + ADMIN_PRODUCTS_PER_PAGE;
    const paginatedItems = adminProductsFiltered.slice(startIdx, endIdx);

    tableBody.innerHTML = '';

    paginatedItems.forEach(prod => {
        const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price);
        const costFmt = prod.cost_price
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.cost_price)
            : '<span class="text-muted text-[0.8rem]">Não info.</span>';

        const prodDataStr = encodeURIComponent(JSON.stringify(prod));
        const mainImg = (prod.image_url || '').split(',')[0] || 'https://placehold.co/400x400/f8fafc/94a3b8?text=Sem+Foto';

        tableBody.innerHTML += `
         <tr class="admin-product-row border-b border-[hsl(var(--text-secondary)/0.1)]">
            <td data-label="Foto" class="py-2">
               <img src="${mainImg}" class="w-10 h-10 rounded object-contain bg-white" />
            </td>
            <td data-label="Nome" class="prod-search-name py-2 font-bold">${prod.name}</td>
            <td data-label="Departamento" class="py-2 capitalize">${prod.department}</td>
            <td data-label="Gênero" class="py-2 capitalize">${prod.gender}</td>
            <td data-label="Venda" class="py-2">${priceFmt}</td>
            <td data-label="Custo" class="py-2 text-[#4caf50]">${costFmt}</td>
            <td data-label="Estoque" class="py-2 text-[0.85rem]">Estoque: ${prod.stock}</td>
            <td data-label="Ações" class="py-2 text-right flex gap-2 justify-end">
               <button class="btn btn-outline btn-restock-product px-2 py-1 text-[0.8rem]" data-prod="${prodDataStr}" title="Reposição de Estoque">📦 Repor</button>
               <button class="btn btn-outline btn-edit-product px-2 py-1 text-[0.8rem]" data-prod="${prodDataStr}">Editar</button>
            </td>
         </tr>
      `;
    });

    const editBtns = tableBody.querySelectorAll('.btn-edit-product');
    editBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prodData = JSON.parse(decodeURIComponent(e.currentTarget.getAttribute('data-prod')));
            openProductModal(prodData);
        });
    });

    const restockBtns = tableBody.querySelectorAll('.btn-restock-product');
    restockBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prodData = JSON.parse(decodeURIComponent(e.currentTarget.getAttribute('data-prod')));
            openRestockModal(prodData);
        });
    });

    let paginationContainer = document.getElementById('admin-products-pagination');
    if (!paginationContainer) {
        const tableWrapper = tableBody.closest('.overflow-x-auto');
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin-products-pagination';
        paginationContainer.className = 'flex justify-between items-center p-4 border-t border-border-dynamic/30';
        tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }

    paginationContainer.innerHTML = `
        <span class="text-[0.85rem] text-muted">Página ${adminProductsPage} de ${totalPages} (Total: ${adminProductsFiltered.length})</span>
        <div class="flex gap-2">
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminProductsPage(-1)" ${adminProductsPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Anterior</button>
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminProductsPage(1)" ${adminProductsPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Próxima</button>
        </div>
    `;
}

window.changeAdminProductsPage = function (direction) {
    adminProductsPage += direction;
    renderAdminProductsTable();
};

export async function loadAdminProducts() {
    const tableBody = document.getElementById('admin-products-table');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4">Carregando dados reais do Banco...</td></tr>';

    try {
        const { data: adminProducts, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!adminProducts || adminProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">Nenhum produto cadastrado ainda.</td></tr>';
            return;
        }

        adminProductsData = adminProducts || [];
        adminProductsFiltered = [...adminProductsData];
        adminProductsPage = 1;
        renderAdminProductsTable();

        const searchInput = document.getElementById('admin-search-product');
        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);

            newSearchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                adminProductsFiltered = adminProductsData.filter(prod => {
                    return prod.name.toLowerCase().includes(term);
                });
                adminProductsPage = 1;
                renderAdminProductsTable();
            });
        }

    } catch (err) {
        console.error("Erro ao puxar catálogo:", err);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-red-500">Erro ao buscar catálogo.</td></tr>';
    }
}

function openRestockModal(product) {
    const modal = document.getElementById('restock-modal');
    if (!modal) return;

    document.getElementById('restock-prod-id').value = product.id;
    document.getElementById('restock-product-name').textContent = product.name;
    document.getElementById('restock-current-stock').textContent = product.stock;
    document.getElementById('restock-qty').value = '';

    // Mostra o preço de custo formatado (puxando da base) se houver, se não deixa vazio
    if (product.cost_price) {
        const costStr = (product.cost_price).toFixed(2);
        let costValue = costStr.replace(".", ",");
        costValue = costValue.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        document.getElementById('restock-new-cost').value = "R$ " + costValue;
    } else {
        document.getElementById('restock-new-cost').value = "";
    }

    modal.classList.add('active');
}

function openProductModal(productToEdit = null) {
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const title = document.getElementById('modal-product-title');
    const subtitle = document.getElementById('modal-product-subtitle');
    const btnSubmit = document.getElementById('btn-submit-product');

    productForm.reset(); // Limpa estado

    if (productToEdit) {
        title.textContent = "Editar Produto";
        subtitle.textContent = "Modifique os dados do item selecionado";
        btnSubmit.textContent = "Salvar Alterações";

        document.getElementById('prod-id').value = productToEdit.id;
        document.getElementById('prod-name').value = productToEdit.name;

        // Aplicar formatação artificial no preço ao exibir
        const priceStr = (productToEdit.price).toFixed(2);
        let value = priceStr.replace(".", ",");
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        document.getElementById('prod-price').value = "R$ " + value;

        document.getElementById('prod-stock').value = productToEdit.stock;
        document.getElementById('prod-dept').value = productToEdit.department;
        document.getElementById('prod-gender').value = productToEdit.gender;
        document.getElementById('prod-tag').value = productToEdit.tag || '';

        if (productToEdit.credit_price) {
            const cpStr = (productToEdit.credit_price).toFixed(2);
            let cpValue = cpStr.replace(".", ",");
            cpValue = cpValue.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
            document.getElementById('prod-credit-price').value = "R$ " + cpValue;
        } else {
            document.getElementById('prod-credit-price').value = "";
        }

        if (productToEdit.cost_price) {
            const costStr = (productToEdit.cost_price).toFixed(2);
            let costValue = costStr.replace(".", ",");
            costValue = costValue.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
            document.getElementById('prod-cost-price').value = "R$ " + costValue;
        } else {
            document.getElementById('prod-cost-price').value = "";
        }

        document.getElementById('prod-installments').value = productToEdit.installments || 1;
        document.getElementById('prod-card-brands').value = productToEdit.card_brands || 'VISA, MASTERCARD';

        // Emulando Edição de Imagem
        document.getElementById('prod-image-url').value = productToEdit.image_url;
        document.getElementById('prod-image-file').value = '';
        document.getElementById('prod-image-file').required = false; // Não obriga re-selecionar

        document.getElementById('prod-desc').value = productToEdit.description;

    } else {
        title.textContent = "Novo Produto";
        document.getElementById('modal-product-subtitle').textContent = "Adicione um item ao catálogo da loja";
        document.getElementById('btn-submit-product').textContent = "Adicionar ao Catálogo";
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-tag').value = '';
        document.getElementById('prod-cost-price').value = '';
        document.getElementById('prod-image-url').value = '';
        document.getElementById('prod-image-file').required = true;
    }

    productModal.classList.add('active');
}

// Função auxiliar para comprimir imagem no lado do Cliente (Browser)
async function compressImage(file, maxWidth = 1000, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: 'image/webp',
                        lastModified: Date.now()
                    }));
                }, 'image/webp', quality);
            };
        };
    });
}

// Função para fazer upload direto para o Supabase Storage
async function uploadToSupabase(files, department) {
    const uploadedUrls = [];

    for (const file of files) {
        const compressed = await compressImage(file);
        const fileExt = compressed.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${department}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('produtos')
            .upload(filePath, compressed);

        if (error) throw error;

        // Pegar a URL pública do arquivo
        const { data: { publicUrl } } = supabase.storage
            .from('produtos')
            .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
    }

    return uploadedUrls.join(',');
}

export function setupAdminProducts() {
    const productModal = document.getElementById('product-modal');
    const btnOpenProductModal = document.getElementById('btn-open-product-modal');
    const btnCloseProductModal = document.getElementById('btn-close-product-modal');
    const productForm = document.getElementById('product-form');

    if (btnOpenProductModal && productModal) {
        btnOpenProductModal.addEventListener('click', () => {
            openProductModal(null); // NULL significa modo criação
        });
    }

    if (btnCloseProductModal && productModal) {
        btnCloseProductModal.addEventListener('click', () => {
            productModal.classList.remove('active');
        });
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) productModal.classList.remove('active');
        });
    }

    const priceInput = document.getElementById('prod-price');
    const creditPriceInput = document.getElementById('prod-credit-price');
    const costPriceInput = document.getElementById('prod-cost-price');

    function maskBRL(e) {
        let value = e.target.value;
        value = value.replace(/\D/g, "");
        if (value.length === 0) {
            e.target.value = '';
            return;
        }
        value = (parseInt(value, 10) / 100).toFixed(2);
        value = value.replace(".", ",");
        value = value.replace(/(\d)(?=(\d{3})+(!=\d))/g, "$1.");
        e.target.value = "R$ " + value;
    }

    if (priceInput) priceInput.addEventListener('input', maskBRL);
    if (creditPriceInput) creditPriceInput.addEventListener('input', maskBRL);
    if (costPriceInput) costPriceInput.addEventListener('input', maskBRL);

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSubmit = document.getElementById('btn-submit-product');
            const name = document.getElementById('prod-name').value;

            // Re-conversão da Máscara BRL
            const rawPrice = document.getElementById('prod-price').value;
            const parsedPriceStr = rawPrice.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
            const price = parseFloat(parsedPriceStr) || 0;

            const rawCredit = document.getElementById('prod-credit-price').value;
            const parsedCreditStr = rawCredit.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
            let credit_price = parseFloat(parsedCreditStr) || null;
            if (!credit_price) credit_price = price;

            const rawCost = document.getElementById('prod-cost-price').value;
            const parsedCostStr = rawCost.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
            let cost_price = parseFloat(parsedCostStr) || null;

            const installments = parseInt(document.getElementById('prod-installments').value) || 1;
            const card_brands = document.getElementById('prod-card-brands').value || 'VISA, MASTERCARD';
            const stock = parseInt(document.getElementById('prod-stock').value) || 0;
            const department = document.getElementById('prod-dept').value;
            const gender = document.getElementById('prod-gender').value;
            const tag = document.getElementById('prod-tag').value;
            const description = document.getElementById('prod-desc').value;
            const fileInput = document.getElementById('prod-image-file');
            let image_url = document.getElementById('prod-image-url').value;

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Tratando Imagem...';

            const productId = document.getElementById('prod-id').value;

            try {
                // 1. Processo de Upload DIRETO para o Supabase
                if (fileInput.files.length > 0) {
                    if (fileInput.files.length > 4) {
                        showDialog("Excesso de Fotos", "Ops! Máximo de 4 imagens permitidas.", true);
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = productId ? 'Salvar Alterações' : 'Adicionar ao Catálogo';
                        return;
                    }

                    btnSubmit.textContent = 'Otimizando e Enviando para Nuvem...';
                    image_url = await uploadToSupabase(fileInput.files, department);
                } else if (!productId && !image_url) {
                    showDialog("Falta de Imagem", "Você não selecionou nenhuma foto válida!", true);
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Adicionar ao Catálogo';
                    return;
                }

                btnSubmit.textContent = 'Salvando Registro no Banco...';

                let errorResp;
                if (productId) {
                    const { error } = await supabase.from('products').update({
                        name, price, stock, department, gender, image_url, description, credit_price, installments, card_brands, tag, cost_price
                    }).eq('id', productId);
                    errorResp = error;
                } else {
                    const { error } = await supabase.from('products').insert([{
                        name, price, stock, department, gender, image_url, description, credit_price, installments, card_brands, tag, cost_price
                    }]);
                    errorResp = error;
                }

                if (errorResp) throw errorResp;

                showDialog("Sucesso", productId ? 'Produto Editado!' : 'Produto Inserido!', false);
                productForm.reset();
                loadAdminProducts();
                renderProducts();

                setTimeout(() => {
                    productModal.classList.remove('active');
                }, 1500);

            } catch (err) {
                console.error(err);
                showDialog("Erro no Processo", err.message, true);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = productId ? 'Salvar Alterações' : 'Adicionar ao Catálogo';
            }
        });
    }

    // LÓGICA DO MODAL DE REPOSIÇÃO (RESTOCK)
    const restockModal = document.getElementById('restock-modal');
    const btnCloseRestockModal = document.getElementById('btn-close-restock-modal');
    const restockForm = document.getElementById('restock-form');

    if (btnCloseRestockModal && restockModal) {
        btnCloseRestockModal.addEventListener('click', () => {
            restockModal.classList.remove('active');
        });
        restockModal.addEventListener('click', (e) => {
            if (e.target === restockModal) restockModal.classList.remove('active');
        });
    }

    const restockCostInput = document.getElementById('restock-new-cost');
    if (restockCostInput) restockCostInput.addEventListener('input', maskBRL);

    if (restockForm) {
        restockForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSubmit = document.getElementById('btn-submit-restock');
            const productId = document.getElementById('restock-prod-id').value;
            const qtyToAdd = parseInt(document.getElementById('restock-qty').value);

            const rawCost = document.getElementById('restock-new-cost').value;
            const parsedCostStr = rawCost.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
            const newCost = parseFloat(parsedCostStr) || null;

            if (!productId || isNaN(qtyToAdd) || qtyToAdd <= 0) {
                showDialog("Dados Inválidos", "A quantidade de reposição deve ser maior que zero.", true);
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Processando Reposição...';

            try {
                // 1. Puxar estoque atual direto do banco para evitar conflitos
                const { data: pData, error: pError } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', productId)
                    .single();

                if (pError) throw pError;

                const currentStock = pData.stock || 0;
                const finalStock = currentStock + qtyToAdd;

                // 2. Atualizar Produto (Estoque Novo + Custo Novo)
                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        stock: finalStock,
                        cost_price: newCost
                    })
                    .eq('id', productId);

                if (updateError) throw updateError;

                // 3. Gravar no Histórico (Kardex)
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                await supabase.from('stock_movements').insert([{
                    product_id: productId,
                    quantity: qtyToAdd, // Entrada positiva
                    type: 'ENTRADA_REPOSICAO',
                    previous_stock: currentStock,
                    current_stock: finalStock,
                    user_id: userId
                }]);

                showDialog("Reposição Sucesso 📦", `Adicionado ${qtyToAdd} un. ao estoque!`, false);
                restockModal.classList.remove('active');

                // Recarregar tabelas e vitrines
                loadAdminProducts();
                renderProducts();

            } catch (err) {
                console.error("Erro na Reposição:", err);
                showDialog("Erro de Banco", err.message, true);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Confirmar Entrada de Estoque';
            }
        });
    }
}

// Paginação de Histórico de Estoque (Kardex)
let adminKardexData = [];
let adminKardexFiltered = [];
let adminKardexPage = 1;
const ADMIN_KARDEX_PER_PAGE = 10;

function renderAdminKardexTable() {
    const tableBody = document.getElementById('admin-kardex-table');
    if (!tableBody) return;

    if (!adminKardexFiltered || adminKardexFiltered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada.</td></tr>';
        const paginationContainer = document.getElementById('admin-kardex-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(adminKardexFiltered.length / ADMIN_KARDEX_PER_PAGE);
    if (adminKardexPage > totalPages) adminKardexPage = totalPages;
    if (adminKardexPage < 1) adminKardexPage = 1;

    const startIdx = (adminKardexPage - 1) * ADMIN_KARDEX_PER_PAGE;
    const endIdx = startIdx + ADMIN_KARDEX_PER_PAGE;
    const paginatedItems = adminKardexFiltered.slice(startIdx, endIdx);

    tableBody.innerHTML = '';

    paginatedItems.forEach(mov => {
        const dateFmt = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(mov.created_at));

        let colorClass = '';
        let sign = '';
        if (mov.quantity > 0) {
            colorClass = 'text-[#4caf50] font-bold'; // Verde
            sign = '+';
        } else if (mov.quantity < 0) {
            colorClass = 'text-[#f44336] font-bold'; // Vermelho
        }

        const prodName = mov.products ? mov.products.name : 'Produto Excluído';

        tableBody.innerHTML += `
         <tr class="kardex-row border-b border-[hsl(var(--text-secondary)/0.1)]">
            <td data-label="Data Hora" class="py-[0.8rem] text-[0.85rem]">${dateFmt}</td>
            <td data-label="Referência" class="kardex-search-name py-[0.8rem] font-bold">${prodName}</td>
            <td data-label="Natureza Fiscal" class="py-[0.8rem] text-[0.85rem]">
               <span class="bg-[hsl(var(--text-secondary)/0.1)] px-2 py-1 rounded">${mov.type.replace('_', ' ')}</span>
            </td>
            <td data-label="Qtd (Movimento)" class="py-[0.8rem] ${colorClass}">${sign}${mov.quantity}</td>
            <td data-label="Balanço Final" class="py-[0.8rem] text-[0.9rem]">
               <span class="text-muted text-[0.75rem]">(${mov.previous_stock} &rarr;)</span> 
               <strong>${mov.current_stock}</strong>
            </td>
         </tr>
      `;
    });

    let paginationContainer = document.getElementById('admin-kardex-pagination');
    if (!paginationContainer) {
        const tableWrapper = tableBody.closest('.overflow-x-auto');
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin-kardex-pagination';
        paginationContainer.className = 'flex justify-between items-center p-4 border-t border-border-dynamic/30';
        tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }

    paginationContainer.innerHTML = `
        <span class="text-[0.85rem] text-muted">Página ${adminKardexPage} de ${totalPages} (Total: ${adminKardexFiltered.length})</span>
        <div class="flex gap-2">
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminKardexPage(-1)" ${adminKardexPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Anterior</button>
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminKardexPage(1)" ${adminKardexPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Próxima</button>
        </div>
    `;
}

window.changeAdminKardexPage = function (direction) {
    adminKardexPage += direction;
    renderAdminKardexTable();
};

export async function loadKardex() {
    const tableBody = document.getElementById('admin-kardex-table');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Carregando histórico...</td></tr>';

    try {
        const { data: movements, error } = await supabase
            .from('stock_movements')
            .select(`
                *,
                products ( name )
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        if (!movements || movements.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada.</td></tr>';
            return;
        }

        adminKardexData = movements || [];
        adminKardexFiltered = [...adminKardexData];
        adminKardexPage = 1;
        renderAdminKardexTable();

        const searchInput = document.getElementById('admin-search-kardex');
        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);

            newSearchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                adminKardexFiltered = adminKardexData.filter(mov => {
                    const prodName = mov.products ? mov.products.name.toLowerCase() : 'produto excluído';
                    return prodName.includes(term);
                });
                adminKardexPage = 1;
                renderAdminKardexTable();
            });
        }

    } catch (err) {
        console.error("Erro Kardex:", err);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-[#f44336]">Erro ao buscar histórico.</td></tr>';
    }
}
