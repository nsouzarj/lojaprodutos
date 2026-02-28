import { supabase } from '../lib/supabase.js';
import { showDialog } from '../ui/dialog.js';

// Paginação Minhas Compras (Usuário)
let myOrdersData = [];
let myOrdersPage = 1;
const MY_ORDERS_PER_PAGE = 5;

function renderMyOrdersTable() {
    const tableBody = document.getElementById('my-orders-table');
    if (!tableBody) return;

    if (!myOrdersData || myOrdersData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Nenhum pedido realizado ainda.</td></tr>';
        const paginationContainer = document.getElementById('my-orders-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(myOrdersData.length / MY_ORDERS_PER_PAGE);
    if (myOrdersPage > totalPages) myOrdersPage = totalPages;
    if (myOrdersPage < 1) myOrdersPage = 1;

    const startIdx = (myOrdersPage - 1) * MY_ORDERS_PER_PAGE;
    const endIdx = startIdx + MY_ORDERS_PER_PAGE;
    const paginatedItems = myOrdersData.slice(startIdx, endIdx);

    tableBody.innerHTML = '';

    paginatedItems.forEach(order => {
        const dateFmt = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(order.created_at));

        const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total);

        let statusClass = 'text-muted';
        if (order.status.toLowerCase() === 'pendente') statusClass = 'text-orange-500';
        if (order.status.toLowerCase() === 'pago') statusClass = 'text-blue-500';
        if (order.status.toLowerCase() === 'enviado') statusClass = 'text-purple-500';
        if (order.status.toLowerCase() === 'entregue') statusClass = 'text-green-500';
        if (order.status.toLowerCase() === 'cancelado') statusClass = 'text-red-500';

        tableBody.innerHTML += `
         <tr class="admin-product-row border-b border-[hsl(var(--text-secondary)/0.1)]">
            <td data-label="Nº Pedido" class="py-[0.8rem] font-mono">#${order.id.toString().substring(0, 8)}</td>
            <td data-label="Data" class="py-[0.8rem]">${dateFmt}</td>
            <td data-label="Destino" class="py-[0.8rem] text-[0.85rem] max-w-[250px]">${order.delivery_address || 'Endereço não cadastrado'}</td>
            <td data-label="Status" class="py-[0.8rem] font-bold capitalize ${statusClass}">${order.status}</td>
            <td data-label="Total" class="py-[0.8rem]">${priceFmt}</td>
            <td data-label="Ação" class="py-[0.8rem] flex justify-end">
               <button onclick="window.viewOrderDetails('${order.id}')" class="btn btn-icon btn-sm p-1 px-2 text-xs border-0 bg-transparent text-primary" title="Ver Detalhes do Pedido">
                   <span class="material-symbols-outlined text-[20px]">visibility</span>
               </button>
            </td>
         </tr>
      `;
    });

    let paginationContainer = document.getElementById('my-orders-pagination');
    if (!paginationContainer) {
        const tableWrapper = tableBody.closest('.overflow-x-auto');
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'my-orders-pagination';
        paginationContainer.className = 'flex justify-between items-center p-4 border-t border-border-dynamic/30';
        tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }

    paginationContainer.innerHTML = `
        <span class="text-[0.85rem] text-muted">Página ${myOrdersPage} de ${totalPages}</span>
        <div class="flex gap-2">
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeMyOrdersPage(-1)" ${myOrdersPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Anterior</button>
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeMyOrdersPage(1)" ${myOrdersPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Próxima</button>
        </div>
    `;
}

window.changeMyOrdersPage = function (direction) {
    myOrdersPage += direction;
    renderMyOrdersTable();
};

/**
 * Carrega o histórico de pedidos do usuário logado (Perfil Comprador)
 */
export async function loadMyOrders() {
    const tableBody = document.getElementById('my-orders-table');
    if (!tableBody) return;

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Faça login para ver suas compras.</td></tr>';
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Carregando histórico...</td></tr>';

    try {
        const { data: myOrders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (myOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Nenhum pedido realizado ainda.</td></tr>';
            return;
        }

        myOrdersData = myOrders || [];
        myOrdersPage = 1;
        renderMyOrdersTable();

    } catch (err) {
        console.error("Erro ao puxar histórico de pedidos:", err);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 p-4">
            <strong>Erro ao carregar:</strong><br>
            <small>${err.message || 'Erro desconhecido'}</small>
        </td></tr>`;
    }
}

/**
 * Visualiza detalhes de um pedido na área do cliente
 */
window.viewOrderDetails = async function (orderId) {
    const modal = document.getElementById('order-details-modal');
    if (!modal) return;

    // Abrir o modal com loading state
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');

    const tbody = document.getElementById('modal-order-items');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-muted">Buscando itens do pedido...</td></tr>';

    document.getElementById('modal-order-id').innerText = `Pedido #${orderId.substring(0, 8)}`;
    document.getElementById('modal-order-date').innerText = "Carregando...";
    document.getElementById('modal-order-total').innerText = "R$ 0,00";

    try {
        // Busca o pedido pai
        const { data: order, error: errO } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (errO) throw errO;

        // Formata data e total
        const dateFmt = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(order.created_at));

        const priceFmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        document.getElementById('modal-order-date').innerText = `Realizado em: ${dateFmt}`;
        document.getElementById('modal-order-total').innerText = priceFmt(order.total);

        // Busca os itens vinculados e produtos
        const { data: items, error: errI } = await supabase
            .from('order_items')
            .select(`
                id, 
                quantity, 
                price_at_time,
                products:product_id (name, image_url)
            `)
            .eq('order_id', orderId);

        if (errI) throw errI;

        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-muted">Nenhum item encontrado para este pedido.</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        items.forEach(item => {
            const prodName = item.products ? item.products.name : 'Produto Indisponível';

            // Trata caso a imagem seja uma Galeria (urls separadas por vírgula)
            let prodImg = '/not-found.jpg';
            if (item.products && item.products.image_url) {
                const imgStr = String(item.products.image_url);
                const imgArray = imgStr.split(',').filter(url => url.trim() !== '');
                if (imgArray.length > 0) {
                    prodImg = imgArray[0].trim();
                }
            }

            const unitPrice = item.price_at_time;
            const subtotal = unitPrice * item.quantity;

            tbody.innerHTML += `
                <tr class="border-b border-[hsl(var(--text-secondary)/0.1)]">
                    <td data-label="Produto" class="py-4">
                        <div class="flex items-center gap-3">
                            <img src="${prodImg}" alt="${prodName}" class="w-10 h-10 object-contain rounded shadow-sm bg-white" onerror="this.onerror=null; this.src='https://placehold.co/40x40/f1f5f9/94a3b8?text=Sem+Foto'">
                            <span class="font-medium">${prodName}</span>
                        </div>
                    </td>
                    <td data-label="Qtd" class="py-4 text-center">${item.quantity}un</td>
                    <td data-label="Preço Unit." class="py-4 text-right">${priceFmt(unitPrice)}</td>
                    <td data-label="Subtotal" class="py-4 font-bold text-right text-primary">${priceFmt(subtotal)}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Erro ao carregar detalhes do pedido:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Erro: ${err.message || 'Falha ao buscar detalhes'}</td></tr>`;
    }
}

// Variáveis globais para paginação das vendas do Admin
let adminOrdersData = [];
let adminOrdersPage = 1;
const ADMIN_ORDERS_PER_PAGE = 10;

/**
 * Renderiza uma página específica da tabela de pedidos do Admin
 */
function renderAdminOrdersTable() {
    const tableBody = document.getElementById('admin-sales-table');
    if (!tableBody) return;

    if (!adminOrdersData || adminOrdersData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma venda registrada.</td></tr>';

        const paginationContainer = document.getElementById('admin-sales-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(adminOrdersData.length / ADMIN_ORDERS_PER_PAGE);
    if (adminOrdersPage > totalPages) adminOrdersPage = totalPages;
    if (adminOrdersPage < 1) adminOrdersPage = 1;

    const startIdx = (adminOrdersPage - 1) * ADMIN_ORDERS_PER_PAGE;
    const endIdx = startIdx + ADMIN_ORDERS_PER_PAGE;
    const paginatedItems = adminOrdersData.slice(startIdx, endIdx);

    tableBody.innerHTML = '';

    paginatedItems.forEach(order => {
        const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total);

        const row = document.createElement('tr');
        row.className = 'admin-product-row border-b border-[hsl(var(--text-secondary)/0.1)]';
        row.innerHTML = `
            <td data-label="Nº Pedido" class="py-[0.8rem] font-mono text-[0.75rem]">#${order.id.toString().substring(0, 8)}</td>
            <td data-label="Cliente" class="py-[0.8rem]">${order.profiles ? order.profiles.full_name : 'Anônimo'}</td>
            <td data-label="Status" class="py-[0.8rem]">
                <select id="status-select-${order.id}" class="p-1 rounded bg-transparent text-inherit text-[0.85rem] border border-[hsl(var(--text-secondary)/0.3)]">
                    <option value="pendente" ${order.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="pago" ${order.status === 'pago' ? 'selected' : ''}>Pago</option>
                    <option value="enviado" ${order.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="entregue" ${order.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                    <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td data-label="Total" class="py-[0.8rem] font-bold">${priceFmt}</td>
            <td data-label="Ações" class="py-[0.8rem] flex gap-2 justify-end items-center flex-wrap">
                <button onclick="window.viewOrderDetails('${order.id}')" class="btn btn-icon btn-sm p-1 border-0 bg-transparent text-primary text-[0.75rem]" title="Ver Detalhes do Pedido"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
                <button onclick="window.updateOrderStatus('${order.id}', this)" class="btn btn-outline btn-sm p-1 px-2 text-[0.75rem]">Atualizar</button>
                ${order.status === 'cancelado' ? `<button onclick="window.deleteOrder('${order.id}', this)" class="btn btn-icon btn-sm p-1 border-0 text-[#ff3366] bg-[#ff3366]/10" title="Excluir Pedido"><span class="material-symbols-outlined text-[18px]">delete</span></button>` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Renderiza Controles de Paginação
    let paginationContainer = document.getElementById('admin-sales-pagination');
    if (!paginationContainer) {
        // Criação dinâmica da div de paginação logo abaixo da tabela
        const tableWrapper = tableBody.closest('.overflow-x-auto');
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin-sales-pagination';
        paginationContainer.className = 'flex justify-between items-center p-4 border-t border-border-dynamic/30';
        tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }

    paginationContainer.innerHTML = `
        <span class="text-[0.85rem] text-muted">Página ${adminOrdersPage} de ${totalPages} (Total: ${adminOrdersData.length})</span>
        <div class="flex gap-2">
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminOrdersPage(-1)" ${adminOrdersPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Anterior</button>
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminOrdersPage(1)" ${adminOrdersPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Próxima</button>
        </div>
    `;
}

window.changeAdminOrdersPage = function (direction) {
    adminOrdersPage += direction;
    renderAdminOrdersTable();
};

/**
 * Carrega a listagem geral de pedidos para o Administrador
 */
export async function loadAdminOrders() {
    const dashVendas = document.getElementById('dash-vendas');
    if (!dashVendas) return;

    const caixaHojeEl = dashVendas.querySelector('.stat-card:nth-child(1) h3');
    const pedidosPendentesEl = dashVendas.querySelector('.stat-card:nth-child(2) h3');
    const tableBody = document.getElementById('admin-sales-table');

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Buscar Estatísticas
        const { data: todayOrders } = await supabase
            .from('orders')
            .select('total')
            .gte('created_at', today.toISOString())
            .neq('status', 'cancelado');

        if (todayOrders) {
            const totalCaixa = todayOrders.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
            if (caixaHojeEl) caixaHojeEl.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCaixa);
        }

        const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pendente');

        if (count !== null && pedidosPendentesEl) {
            pedidosPendentesEl.textContent = count;
        }

        // 2. Buscar Todos os Pedidos
        const { data: allOrders, error: errorOrders } = await supabase
            .from('orders')
            .select(`*, profiles: user_id(full_name)`)
            .order('created_at', { ascending: false });

        if (errorOrders) throw errorOrders;

        if (tableBody) {
            adminOrdersData = allOrders || [];
            adminOrdersPage = 1; // Reseta sempre pra pag. 1 ao recarregar a tela
            renderAdminOrdersTable();
            console.log("[ADMIN] Tabela de pedidos carregada com", adminOrdersData.length, "itens.");
        }
    } catch (err) {
        console.error("Erro ao carregar Dashboard Admin:", err);
    }
}

/**
 * Atualiza o status de UM pedido específico
 */
window.updateOrderStatus = async function (idDoPedido, botao) {
    if (!idDoPedido) {
        alert("Erro: ID do pedido não identificado.");
        return;
    }

    const select = document.getElementById(`status-select-${idDoPedido}`);
    if (!select) return;

    const novoStatus = select.value;
    const textoOriginal = botao.textContent;

    // Bloqueia e sinaliza processamento
    botao.classList.add('btn-loading');
    botao.disabled = true;

    console.log(`[BANCO] Solicitando alteração: Pedido ${idDoPedido} -> Novo Status: ${novoStatus}`);

    try {
        // 1. BUSCA ESTADO ATUAL (Para regra de estoque)
        const { data: currentOrder, error: fetchError } = await supabase
            .from('orders')
            .select('status')
            .eq('id', idDoPedido)
            .single();

        if (fetchError) throw fetchError;
        const statusAnterior = currentOrder.status;

        // 2. OPERAÇÃO DE ATUALIZAÇÃO NO BANCO
        const { error, data } = await supabase
            .from('orders')
            .update({ status: novoStatus })
            .eq('id', idDoPedido)
            .select();

        if (error) {
            console.error("Erro no Supabase:", error);
            showDialog("Erro no Banco", error.message, true);
            botao.disabled = false;
            botao.classList.remove('btn-loading');
        } else if (!data || data.length === 0) {
            console.warn("[AVISO] Nenhuma linha alterada. Verifique as permissões RLS.");
            showDialog("Acesso Negado", "O Banco de Dados não permitiu a alteração.", true);
            botao.disabled = false;
            botao.classList.remove('btn-loading');
        } else {
            console.log("[SUCESSO] Pedido atualizado:", data);

            // 3. REGRA DE NEGÓCIO: MOVIMENTAÇÃO DE ESTOQUE
            // Se mudou para CANCELADO (e não era), devolve ao estoque
            if (novoStatus === 'cancelado' && statusAnterior !== 'cancelado') {
                const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', idDoPedido);
                if (items) {
                    for (const item of items) {
                        const { data: p } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                        if (p) {
                            const newStock = p.stock + item.quantity;
                            await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);

                            // HISTÓRICO: DEVOLUÇÃO
                            await supabase.from('stock_movements').insert([{
                                product_id: item.product_id,
                                quantity: item.quantity,
                                type: 'CANCELAMENTO',
                                previous_stock: p.stock,
                                current_stock: newStock,
                                order_id: idDoPedido
                            }]);
                        }
                    }
                }
            }
            else if (statusAnterior === 'cancelado' && novoStatus !== 'cancelado') {
                const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', idDoPedido);
                if (items) {
                    for (const item of items) {
                        const { data: p } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                        if (p) {
                            const newStock = Math.max(0, p.stock - item.quantity);
                            await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);

                            // HISTÓRICO: RE-RETIRADA
                            await supabase.from('stock_movements').insert([{
                                product_id: item.product_id,
                                quantity: -item.quantity,
                                type: 'REATIVAÇÃO_PEDIDO',
                                previous_stock: p.stock,
                                current_stock: newStock,
                                order_id: idDoPedido
                            }]);
                        }
                    }
                }
            }

            const pedidoNum = idDoPedido.substring(0, 8);
            showDialog("Sucesso", `O pedido #${pedidoNum} foi atualizado para: ${novoStatus.toUpperCase()}`, false);
            loadAdminOrders();
        }
    } catch (err) {
        console.error("Erro fatal no Update:", err);
        showDialog("Erro de Conexão", "Não foi possível conectar ao servidor.", true);
        botao.disabled = false;
        botao.classList.remove('btn-loading');
    }
};

/**
 * Exclui um pedido permanentemente (Apenas pedidos cancelados)
 */
window.deleteOrder = async function (idDoPedido, botao) {
    const pedidoNum = idDoPedido.substring(0, 8);

    showDialog(
        "Confirmar Exclusão",
        `Deseja realmente excluir permanentemente o pedido #${pedidoNum} ? Esta ação não pode ser desfeita.`,
        true, // Mostra como 'erro/atenção'
        async () => {
            // Callback após confirmação
            botao.disabled = true;
            botao.style.opacity = '0.5';

            try {
                // Remove itens do pedido primeiro (devido a foreign keys)
                await supabase.from('order_items').delete().eq('order_id', idDoPedido);

                const { error } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', idDoPedido);

                if (error) throw error;

                showDialog("Excluído", `Pedido #${pedidoNum} removido com sucesso.`, false);
                loadAdminOrders();
            } catch (err) {
                console.error("Erro ao excluir pedido:", err);
                showDialog("Erro na Exclusão", err.message || "Erro desconhecido ao tentar excluir.", true);
                botao.disabled = false;
                botao.style.opacity = '1';
            }
        }
    );
};

/**
 * Gera relatórios de inventário e vendas
 */
export async function loadAdminReports(startDate = '', endDate = '') {
    const reportPanel = document.getElementById('admin-report-content');
    if (!reportPanel) return;

    reportPanel.innerHTML = '<p class="text-muted animate-pulse">Processando dados financeiros...</p>';

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*');

        if (error) throw error;
        if (!products || products.length === 0) {
            reportPanel.innerHTML = '<h2>Relatórios</h2><p>Nenhum produto cadastrado.</p>';
            return;
        }

        const mostExpensive = products.reduce((prev, current) => (prev.price > current.price) ? prev : current);
        const cheapest = products.reduce((prev, current) => (prev.price < current.price) ? prev : current);
        const priceFmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        // Fetch Sales/Pedidos
        let salesQuery = supabase.from('orders').select('total, status, created_at');

        // Aplica Filtros de Data
        if (startDate) {
            salesQuery = salesQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
            salesQuery = salesQuery.lte('created_at', `${endDate}T23: 59: 59.999Z`);
        }

        const { data: sales, error: salesError } = await salesQuery;

        if (salesError) throw salesError;

        // Remove vendas canceladas do cômputo
        const validSales = sales.filter(s => s.status !== 'cancelado');
        const totalSalesRevenue = validSales.reduce((acc, sale) => acc + parseFloat(sale.total), 0);
        const totalOrdersCount = validSales.length;

        // Fetch de totais e valores por status
        const statusCounts = { pendente: 0, pago: 0, enviado: 0, entregue: 0, cancelado: 0 };
        const statusTotals = { pendente: 0, pago: 0, enviado: 0, entregue: 0, cancelado: 0 };

        sales.forEach(s => {
            const st = s.status ? s.status.toLowerCase() : '';
            if (statusCounts[st] !== undefined) {
                statusCounts[st]++;
                statusTotals[st] += parseFloat(s.total) || 0;
            }
        });

        // Fetch Itens para descobrir o Produto Mais Vendido (Apenas vendas firmes)
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity, orders!inner(status)')
            .in('orders.status', ['pago', 'enviado', 'entregue']);
        let bestSellingProduct = { name: 'Sem Vendas', qtd: 0 };

        if (orderItems && orderItems.length > 0) {
            const counts = {};
            orderItems.forEach(item => {
                counts[item.product_id] = (counts[item.product_id] || 0) + item.quantity;
            });
            let bestProductId = null;
            let maxCount = 0;
            for (const [pId, qty] of Object.entries(counts)) {
                if (qty > maxCount) {
                    maxCount = qty;
                    bestProductId = pId;
                }
            }
            if (bestProductId) {
                const bestProd = products.find(p => p.id === bestProductId);
                if (bestProd) {
                    bestSellingProduct = { name: bestProd.name, qtd: maxCount };
                }
            }
        }

        reportPanel.innerHTML = `
            <div class="flex justify-end items-center mb-6 flex-wrap gap-4">
                
                <div class="flex flex-col sm:flex-row items-center gap-3 bg-surface-dynamic p-3 rounded-xl border border-border-dynamic/30 w-full max-w-2xl justify-between">
                    <label class="text-sm text-muted font-medium w-full sm:w-auto mb-1 sm:mb-0">Período:</label>
                    
                    <div class="flex items-center gap-2 w-full justify-between sm:w-auto flex-1">
                        <input type="text" id="report-start-date" value="${startDate}" class="w-full px-3 py-2 rounded-lg border border-border-dynamic/50 bg-transparent text-main text-sm text-center focus:outline-none focus:border-primary transition-colors" placeholder="Início">
                        <span class="text-muted text-sm">até</span>
                        <input type="text" id="report-end-date" value="${endDate}" class="w-full px-3 py-2 rounded-lg border border-border-dynamic/50 bg-transparent text-main text-sm text-center focus:outline-none focus:border-primary transition-colors" placeholder="Fim">
                    </div>
                    
                    <div class="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button id="btn-filter-reports" class="btn btn-outline btn-sm flex-1 sm:flex-none px-4 py-2 text-[0.85rem]">Filtrar</button>
                        ${(startDate || endDate) ? `<button id="btn-clear-reports" class="btn btn-sm p-2 text-[#ff3366] bg-[#ff3366]/10 border-0" title="Limpar Filtro">✕</button>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <div class="glass-card p-6 text-center border-b-4 border-[hsl(var(--accent-color))]">
                    <p class="text-muted text-[0.85rem] uppercase">Receita Total Bruta</p>
                    <h3 class="text-[1.5rem] mt-2 text-[hsl(var(--accent-color))]">${priceFmt(totalSalesRevenue)}</h3>
                    ${(startDate || endDate) ? `<small class="text-muted">No período filtrado</small>` : ''}
                </div>
                <div class="glass-card p-6 text-center border-b-4 border-[hsl(var(--accent-color))]">
                    <p class="text-muted text-[0.85rem] uppercase">Pedidos Validados</p>
                    <h3 class="text-[1.5rem] mt-2">${totalOrdersCount}</h3>
                </div>
                <div class="glass-card p-6 text-center border-b-4 border-[#ff9800]">
                    <p class="text-muted text-[0.85rem] uppercase">Mais Vendido Geral</p>
                    <h3 class="text-[1rem] mt-2">${bestSellingProduct.name}</h3>
                    <small class="text-muted">${bestSellingProduct.qtd} unid. escoadas</small>
                </div>
            </div>

            <div class="mt-8">
                <h3 class="mb-4">Visão Financeira por Status</h3>
                <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
                    <div class="glass-card p-4 text-center border-l-4 border-orange-500">
                        <span class="text-muted text-[0.75rem] uppercase font-bold">Pendente</span>
                        <h3 class="mt-2 text-[1.25rem]">${statusCounts.pendente}</h3>
                        <p class="text-[0.85rem] font-bold mt-1 text-orange-500">${priceFmt(statusTotals.pendente)}</p>
                    </div>
                    <div class="glass-card p-4 text-center border-l-4 border-blue-500">
                        <span class="text-muted text-[0.75rem] uppercase font-bold">Pago</span>
                        <h3 class="mt-2 text-[1.25rem]">${statusCounts.pago}</h3>
                        <p class="text-[0.85rem] font-bold mt-1 text-blue-500">${priceFmt(statusTotals.pago)}</p>
                    </div>
                    <div class="glass-card p-4 text-center border-l-4 border-purple-500">
                        <span class="text-muted text-[0.75rem] uppercase font-bold">Enviado</span>
                        <h3 class="mt-2 text-[1.25rem]">${statusCounts.enviado}</h3>
                        <p class="text-[0.85rem] font-bold mt-1 text-purple-500">${priceFmt(statusTotals.enviado)}</p>
                    </div>
                    <div class="glass-card p-4 text-center border-l-4 border-green-500">
                        <span class="text-muted text-[0.75rem] uppercase font-bold">Entregue</span>
                        <h3 class="mt-2 text-[1.25rem]">${statusCounts.entregue}</h3>
                        <p class="text-[0.85rem] font-bold mt-1 text-green-500">${priceFmt(statusTotals.entregue)}</p>
                    </div>
                    <div class="glass-card p-4 text-center border-l-4 border-red-500">
                        <span class="text-muted text-[0.75rem] uppercase font-bold">Cancelado</span>
                        <h3 class="mt-2 text-[1.25rem]">${statusCounts.cancelado}</h3>
                        <p class="text-[0.85rem] font-bold mt-1 text-red-500">${priceFmt(statusTotals.cancelado)}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mt-6">
                <div class="glass-card p-6 border-l-4 border-[#f44336]">
                    <strong class="text-muted text-[0.8rem] uppercase">Mais Caro (Catálogo)</strong>
                    <h3 class="mt-2 text-[1.1rem]">${mostExpensive.name}</h3>
                    <p class="text-[1.2rem] font-bold">${priceFmt(mostExpensive.price)}</p>
                </div>
                <div class="glass-card p-6 border-l-4 border-[#4caf50]">
                    <strong class="text-muted text-[0.8rem] uppercase">Mais Barato (Catálogo)</strong>
                    <h3 class="mt-2 text-[1.1rem]">${cheapest.name}</h3>
                    <p class="text-[1.2rem] font-bold">${priceFmt(cheapest.price)}</p>
                </div>
            </div>
            
            <div class="glass-card p-6 mt-4">
                <h3>Resumo Financeiro do Estoque</h3>
                <p class="mt-2 text-muted">Total de produtos cadastrados: <strong class="text-primary">${products.length}</strong></p>
                <p class="text-muted">Capital imobilizado (Estoque Físico): <strong class="text-primary">${priceFmt(products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0))}</strong></p>
            </div>
        `;

        // Inicializa o Flatpickr (Calendário Premium/PT-BR) nos campos
        const fpConfig = {
            dateFormat: "Y-m-d", // Formato interno para o banco
            altInput: true,
            altFormat: "d/m/Y", // Formato de exibição para o usuário
            locale: "pt"
        };

        if (window.flatpickr) {
            window.flatpickr('#report-start-date', fpConfig);
            window.flatpickr('#report-end-date', fpConfig);
        }

        // Event Listeners para os botões de Filtro de Data
        const btnFilter = document.getElementById('btn-filter-reports');
        const btnClear = document.getElementById('btn-clear-reports');

        if (btnFilter) {
            btnFilter.addEventListener('click', () => {
                const sDate = document.getElementById('report-start-date').value || document.querySelector('#report-start-date').getAttribute('value') || '';
                const eDate = document.getElementById('report-end-date').value || document.querySelector('#report-end-date').getAttribute('value') || '';
                loadAdminReports(sDate, eDate);
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                loadAdminReports('', ''); // Recarrega sem filtros
            });
        }

    } catch (err) {
        console.error("Erro ao gerar relatórios corporativos:", err);
        reportPanel.innerHTML = '<h2 class="text-2xl font-bold">Relatórios</h2><p class="text-red-500 mt-2">Erro ao processar dados de venda. Verifique a base de dados.</p>';
    }
}
