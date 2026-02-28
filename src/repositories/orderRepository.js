import { supabase } from '../lib/supabase.js';

export async function insertOrder(data) {
    return await supabase.from('orders').insert([data]).select().single();
}

export async function insertOrderItems(data) {
    return await supabase.from('order_items').insert(data);
}

export async function fetchUserOrders(userId) {
    return await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
}

export async function fetchOrderDetails(orderId) {
    return await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
}

export async function fetchOrderItems(orderId) {
    return await supabase
        .from('order_items')
        .select(`
            id, 
            quantity, 
            price_at_time,
            products:product_id (name, image_url)
        `)
        .eq('order_id', orderId);
}

export async function getDashboardTodayOrders(todayISO) {
    return await supabase
        .from('orders')
        .select('total')
        .gte('created_at', todayISO)
        .neq('status', 'cancelado');
}

export async function countPendingOrders() {
    return await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
}

export async function fetchAllOrdersAdmin() {
    return await supabase
        .from('orders')
        .select(`*, profiles: user_id(full_name)`)
        .order('created_at', { ascending: false });
}

export async function updateOrderStatus(orderId, novoStatus) {
    return await supabase
        .from('orders')
        .update({ status: novoStatus })
        .eq('id', orderId)
        .select();
}

export async function checkOrderStatus(orderId) {
    return await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
}

export async function fetchOrderItemsForStockUpdate(orderId) {
    return await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);
}

export async function getProductStock(productId) {
    return await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
}

export async function updateProductStock(productId, newStock) {
    return await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);
}

export async function addStockMovement(data) {
    return await supabase
        .from('stock_movements')
        .insert([data]);
}

export async function deleteOrderItems(orderId) {
    return await supabase.from('order_items').delete().eq('order_id', orderId);
}

export async function deleteOrder(orderId) {
    return await supabase.from('orders').delete().eq('id', orderId);
}

// Relatórios
export async function loadProductsForReports() {
    return await supabase.from('products').select('*');
}

export async function fetchFilteredSales(startDate, endDate) {
    let salesQuery = supabase.from('orders').select('total, status, created_at');

    if (startDate) {
        salesQuery = salesQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
        salesQuery = salesQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    return await salesQuery;
}

export async function fetchBestSellingItems() {
    return await supabase
        .from('order_items')
        .select('product_id, quantity, orders!inner(status)')
        .in('orders.status', ['pago', 'enviado', 'entregue']);
}
