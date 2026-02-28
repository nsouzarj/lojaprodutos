import { supabase } from '../lib/supabase.js';

export async function fetchProducts(categoryFilter = 'todos', tagFilter = null) {
    let query = supabase.from('products').select('*');

    if (categoryFilter !== 'todos') {
        query = query.eq('department', categoryFilter);
    }

    if (tagFilter) {
        query = query.ilike('tag', `%${tagFilter}%`);
    }

    return await query.order('created_at', { ascending: false });
}

export async function submitProductRating(productId, userId, ratingValue) {
    return await supabase.from('product_reviews').upsert({
        product_id: productId,
        user_id: userId,
        rating: ratingValue
    }, { onConflict: 'product_id, user_id' });
}

export async function getProductRating(productId) {
    return await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);
}

export async function fetchAllProducts() {
    return await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
}

export async function fetchProductStock(productId) {
    return await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
}

export async function updateProduct(productId, data) {
    return await supabase.from('products').update(data).eq('id', productId);
}

export async function insertProduct(data) {
    return await supabase.from('products').insert([data]);
}

export async function registerStockMovement(data) {
    return await supabase.from('stock_movements').insert([data]);
}

export async function uploadProductImage(filePath, file) {
    return await supabase.storage.from('produtos').upload(filePath, file);
}

export function getPublicUrl(filePath) {
    return supabase.storage.from('produtos').getPublicUrl(filePath);
}
