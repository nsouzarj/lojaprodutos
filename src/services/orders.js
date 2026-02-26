import { supabase } from '../lib/supabase.js';
import { showDialog } from '../ui/dialog.js';

/**
 * Carrega o histórico de pedidos do usuário logado (Perfil Comprador)
 */
export async function loadMyOrders() {
    const tableBody = document.getElementById('my-orders-table');
    if (!tableBody) return;

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Faça login para ver suas compras.</td></tr>';
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Carregando histórico...</td></tr>';

    try {
        const { data: myOrders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (myOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:hsl(var(--text-secondary)); padding: 1rem;">Nenhum pedido realizado ainda.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';

        myOrders.forEach(order => {
            const dateFmt = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).format(new Date(order.created_at));

            const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total);

            let statusColor = 'hsl(var(--text-secondary))';
            if (order.status.toLowerCase() === 'pendente') statusColor = 'orange';
            if (order.status.toLowerCase() === 'pago') statusColor = 'blue';
            if (order.status.toLowerCase() === 'enviado') statusColor = 'purple';
            if (order.status.toLowerCase() === 'entregue') statusColor = 'green';
            if (order.status.toLowerCase() === 'cancelado') statusColor = 'red';

            tableBody.innerHTML += `
             <tr class="admin-product-row" style="border-bottom: 1px solid hsl(var(--text-secondary)/0.1);">
                <td data-label="Nº Pedido" style="padding: 0.8rem 0; font-family: monospace;">#${order.id.toString().substring(0, 8)}</td>
                <td data-label="Data" style="padding: 0.8rem 0;">${dateFmt}</td>
                <td data-label="Destino" style="padding: 0.8rem 0; font-size: 0.85rem; max-width: 250px;">${order.delivery_address || 'Endereço não cadastrado'}</td>
                <td data-label="Status" style="padding: 0.8rem 0; font-weight: bold; color: ${statusColor}; text-transform: capitalize;">${order.status}</td>
                <td data-label="Total" style="padding: 0.8rem 0;">${priceFmt}</td>
                <td data-label="Ação" style="padding: 0.8rem 0; display: flex; justify-content: flex-end;">
                   <button onclick="window.viewOrderDetails('${order.id}')" class="btn btn-icon btn-sm" title="Ver Detalhes do Pedido" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border: none; background: transparent; color: hsl(var(--primary-color));">
                       <span class="material-symbols-outlined" style="font-size: 20px;">visibility</span>
                   </button>
                </td>
             </tr>
          `;
        });
    } catch (err) {
        console.error("Erro ao puxar histórico de pedidos:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding: 1rem;">
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
            const prodImg = item.products && item.products.image_url ? item.products.image_url : '/not-found.jpg';
            const unitPrice = item.price_at_time;
            const subtotal = unitPrice * item.quantity;

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid hsl(var(--text-secondary)/0.1);">
                    <td data-label="Produto" style="padding: 1rem 0;">
                        <div class="flex items-center gap-3">
                            <img src="${prodImg}" alt="${prodName}" class="w-10 h-10 object-cover rounded shadow-sm bg-border-dynamic" onerror="this.src='https://via.placeholder.com/40?text=S/Foto'">
                            <span class="font-medium">${prodName}</span>
                        </div>
                    </td>
                    <td data-label="Qtd" style="padding: 1rem 0;" class="text-center">${item.quantity}un</td>
                    <td data-label="Preço Unit." style="padding: 1rem 0;" class="text-right">${priceFmt(unitPrice)}</td>
                    <td data-label="Subtotal" style="padding: 1rem 0; font-weight: bold;" class="text-right text-primary">${priceFmt(subtotal)}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Erro ao carregar detalhes do pedido:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Erro: ${err.message || 'Falha ao buscar detalhes'}</td></tr>`;
    }
}

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
            if (!allOrders || allOrders.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma venda registrada.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            allOrders.forEach(order => {
                const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total);

                const row = document.createElement('tr');
                row.className = 'admin-product-row';
                row.style.borderBottom = '1px solid hsl(var(--text-secondary)/0.1)';
                row.innerHTML = `
                    <td data-label="Nº Pedido" style="padding: 0.8rem 0; font-family: monospace; font-size: 0.75rem;">#${order.id.toString().substring(0, 8)}</td>
                    <td data-label="Cliente" style="padding: 0.8rem 0;">${order.profiles ? order.profiles.full_name : 'Anônimo'}</td>
                    <td data-label="Status" style="padding: 0.8rem 0;">
                        <select id="status-select-${order.id}" style="padding: 0.3rem; border-radius: 4px; border: 1px solid hsl(var(--text-secondary)/0.3); background: transparent; color: inherit; font-size: 0.85rem;">
                            <option value="pendente" ${order.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="pago" ${order.status === 'pago' ? 'selected' : ''}>Pago</option>
                            <option value="enviado" ${order.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                            <option value="entregue" ${order.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                            <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </td>
                    <td data-label="Total" style="padding: 0.8rem 0; font-weight: bold;">${priceFmt}</td>
                    <td data-label="Ações" style="padding: 0.8rem 0; display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
                        <button onclick="window.viewOrderDetails('${order.id}')" class="btn btn-icon btn-sm" title="Ver Detalhes do Pedido" style="padding: 0.3rem; border: none; background: transparent; color: hsl(var(--primary-color)); font-size: 0.75rem;"><span class="material-symbols-outlined" style="font-size: 20px;">visibility</span></button>
                        <button onclick="window.updateOrderStatus('${order.id}', this)" class="btn btn-outline btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Atualizar</button>
                        ${order.status === 'cancelado' ? `<button onclick="window.deleteOrder('${order.id}', this)" class="btn btn-icon btn-sm" style="background: rgba(255, 51, 102, 0.1); color: #ff3366; border: none; padding: 0.3rem;" title="Excluir Pedido"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>` : ''}
                    </td>
                `;
                tableBody.appendChild(row);
            });

            console.log("[ADMIN] Tabela de pedidos carregada com", allOrders.length, "itens.");
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

    const select = document.getElementById(`status - select - ${idDoPedido}`);
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

        // Fetch Itens para descobrir o Produto Mais Vendido
        const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity');
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
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                
                <div class="flex flex-col sm:flex-row items-center gap-3 bg-surface-dynamic p-3 rounded-xl border border-border-dynamic/30 w-full max-w-2xl justify-between">
                    <label class="text-sm text-muted font-medium w-full sm:w-auto mb-1 sm:mb-0">Período:</label>
                    
                    <div class="flex items-center gap-2 w-full justify-between sm:w-auto flex-1">
                        <input type="text" id="report-start-date" value="${startDate}" class="w-full px-3 py-2 rounded-lg border border-border-dynamic/50 bg-transparent text-main text-sm text-center focus:outline-none focus:border-primary transition-colors" placeholder="Início">
                        <span class="text-muted text-sm">até</span>
                        <input type="text" id="report-end-date" value="${endDate}" class="w-full px-3 py-2 rounded-lg border border-border-dynamic/50 bg-transparent text-main text-sm text-center focus:outline-none focus:border-primary transition-colors" placeholder="Fim">
                    </div>
                    
                    <div class="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button id="btn-filter-reports" class="btn btn-outline btn-sm flex-1 sm:flex-none" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Filtrar</button>
                        ${(startDate || endDate) ? `<button id="btn-clear-reports" class="btn btn-sm" style="padding: 0.5rem; color: #ff3366; background: rgba(255, 51, 102, 0.1); border: none;" title="Limpar Filtro">✕</button>` : ''}
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div class="glass-card" style="padding: 1.5rem; text-align: center; border-bottom: 4px solid hsl(var(--accent-color));">
                    <p style="color: hsl(var(--text-secondary)); font-size: 0.85rem; text-transform: uppercase;">Receita Total Bruta</p>
                    <h3 style="font-size: 1.5rem; margin-top: 0.5rem; color: hsl(var(--accent-color));">${priceFmt(totalSalesRevenue)}</h3>
                    ${(startDate || endDate) ? `<small style="color: hsl(var(--text-secondary));">No período filtrado</small>` : ''}
                </div>
                <div class="glass-card" style="padding: 1.5rem; text-align: center; border-bottom: 4px solid hsl(var(--accent-color));">
                    <p style="color: hsl(var(--text-secondary)); font-size: 0.85rem; text-transform: uppercase;">Pedidos Validados</p>
                    <h3 style="font-size: 1.5rem; margin-top: 0.5rem;">${totalOrdersCount}</h3>
                </div>
                <div class="glass-card" style="padding: 1.5rem; text-align: center; border-bottom: 4px solid #ff9800;">
                    <p style="color: hsl(var(--text-secondary)); font-size: 0.85rem; text-transform: uppercase;">Mais Vendido Geral</p>
                    <h3 style="font-size: 1rem; margin-top: 0.5rem;">${bestSellingProduct.name}</h3>
                    <small style="color: hsl(var(--text-secondary));">${bestSellingProduct.qtd} unid. escoadas</small>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Visão Financeira por Status (Funil)</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
                    <div class="glass-card" style="padding: 1rem; text-align: center; border-left: 4px solid orange;">
                        <span style="color: hsl(var(--text-secondary)); font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Pendente</span>
                        <h3 style="margin-top: 0.5rem; font-size: 1.25rem;">${statusCounts.pendente}</h3>
                        <p style="font-size: 0.85rem; font-weight: bold; margin-top: 0.3rem; color: orange;">${priceFmt(statusTotals.pendente)}</p>
                    </div>
                    <div class="glass-card" style="padding: 1rem; text-align: center; border-left: 4px solid #2196F3;">
                        <span style="color: hsl(var(--text-secondary)); font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Pago</span>
                        <h3 style="margin-top: 0.5rem; font-size: 1.25rem;">${statusCounts.pago}</h3>
                        <p style="font-size: 0.85rem; font-weight: bold; margin-top: 0.3rem; color: #2196F3;">${priceFmt(statusTotals.pago)}</p>
                    </div>
                    <div class="glass-card" style="padding: 1rem; text-align: center; border-left: 4px solid #9C27B0;">
                        <span style="color: hsl(var(--text-secondary)); font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Enviado</span>
                        <h3 style="margin-top: 0.5rem; font-size: 1.25rem;">${statusCounts.enviado}</h3>
                        <p style="font-size: 0.85rem; font-weight: bold; margin-top: 0.3rem; color: #9C27B0;">${priceFmt(statusTotals.enviado)}</p>
                    </div>
                    <div class="glass-card" style="padding: 1rem; text-align: center; border-left: 4px solid #4CAF50;">
                        <span style="color: hsl(var(--text-secondary)); font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Entregue</span>
                        <h3 style="margin-top: 0.5rem; font-size: 1.25rem;">${statusCounts.entregue}</h3>
                        <p style="font-size: 0.85rem; font-weight: bold; margin-top: 0.3rem; color: #4CAF50;">${priceFmt(statusTotals.entregue)}</p>
                    </div>
                    <div class="glass-card" style="padding: 1rem; text-align: center; border-left: 4px solid #F44336;">
                        <span style="color: hsl(var(--text-secondary)); font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Cancelado</span>
                        <h3 style="margin-top: 0.5rem; font-size: 1.25rem;">${statusCounts.cancelado}</h3>
                        <p style="font-size: 0.85rem; font-weight: bold; margin-top: 0.3rem; color: #F44336;">${priceFmt(statusTotals.cancelado)}</p>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
                <div class="glass-card" style="padding: 1.5rem; border-left: 4px solid #f44336;">
                    <strong style="color: hsl(var(--text-secondary)); font-size: 0.8rem; text-transform: uppercase;">Mais Caro (Catálogo)</strong>
                    <h3 style="margin-top: 0.5rem; font-size: 1.1rem;">${mostExpensive.name}</h3>
                    <p style="font-size: 1.2rem; font-weight: bold;">${priceFmt(mostExpensive.price)}</p>
                </div>
                <div class="glass-card" style="padding: 1.5rem; border-left: 4px solid #4caf50;">
                    <strong style="color: hsl(var(--text-secondary)); font-size: 0.8rem; text-transform: uppercase;">Mais Barato (Catálogo)</strong>
                    <h3 style="margin-top: 0.5rem; font-size: 1.1rem;">${cheapest.name}</h3>
                    <p style="font-size: 1.2rem; font-weight: bold;">${priceFmt(cheapest.price)}</p>
                </div>
            </div>
            
            <div class="glass-card" style="padding: 1.5rem; margin-top: 1rem;">
                <h3>Resumo Financeiro do Estoque</h3>
                <p style="margin-top: 0.5rem; color: hsl(var(--text-secondary));">Total de produtos cadastrados: <strong style="color: hsl(var(--text-primary));">${products.length}</strong></p>
                <p style="color: hsl(var(--text-secondary));">Capital imobilizado (Estoque Físico): <strong style="color: hsl(var(--text-primary));">${priceFmt(products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0))}</strong></p>
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
        reportPanel.innerHTML = '<h2>Relatórios</h2><p style="color:red;">Erro ao processar dados de venda. Verifique a base de dados.</p>';
    }
}
