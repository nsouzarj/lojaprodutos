-- Tabela de Avaliações de Produtos
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, user_id) -- Impede que um mesmo usuário vote 2x no mesmo produto
);

-- Habilitar a segurança RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- QUALQUER PESSOA PODE LER AS NOTAS (Vitrine Pública)
DROP POLICY IF EXISTS "Anyone can view ratings" ON product_reviews;
CREATE POLICY "Anyone can view ratings" ON product_reviews
    FOR SELECT USING (true);

-- APENAS PESSOAS LOGADAS PODEM AVALIAR (INSERT E UPDATE DA SUA PRÓPRIA NOTA)
DROP POLICY IF EXISTS "Users can manage their own ratings" ON product_reviews;
CREATE POLICY "Users can manage their own ratings" ON product_reviews
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Opcional: Admins têm poder para moderar e apagar comentários vazios/ruins
DROP POLICY IF EXISTS "Admins can manage ratings" ON product_reviews;
CREATE POLICY "Admins can manage ratings" ON product_reviews
    FOR ALL USING (true);
