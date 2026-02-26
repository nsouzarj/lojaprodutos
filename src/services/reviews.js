import { supabase } from '../lib/supabase.js';

export async function submitRating(productId, ratingValue) {
    const { data: { session } } = await supabase.auth.getSession();

    // REGRA DE SEGURANÇA: Bloqueia Anônimos na raça.
    if (!session) {
        return { error: 'auth_required', message: 'Você precisa entrar na sua conta para avaliar produtos.' };
    }

    try {
        const { error } = await supabase.from('product_reviews').upsert({
            product_id: productId,
            user_id: session.user.id,
            rating: ratingValue
        }, { onConflict: 'product_id, user_id' }); // Se a pessoa já votou, ele atualiza a nota dela, não duplica.

        if (error) throw error;

        return { success: true };
    } catch (err) {
        console.error("Erro ao salvar nota:", err);
        return { error: 'database_error', message: err.message };
    }
}

export async function getProductRating(productId) {
    try {
        const { data, error } = await supabase
            .from('product_reviews')
            .select('rating')
            .eq('product_id', productId);

        if (error) throw error;

        if (!data || data.length === 0) return { average: 0, count: 0 };

        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        const average = sum / data.length;

        return { average: parseFloat(average.toFixed(1)), count: data.length };

    } catch (err) {
        console.warn("Nao foi possivel ler os ratings:", err);
        return { average: 0, count: 0 };
    }
}
