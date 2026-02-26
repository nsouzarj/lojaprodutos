-- Tabela para rastrear cada entrada e saída de produto
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL, -- Positivo para Entrada, Negativo para Saída
    type TEXT NOT NULL, -- 'VENDA', 'CANCELAMENTO', 'ENTRADA_MANUAL', 'AJUSTE'
    previous_stock INTEGER,
    current_stock INTEGER,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para segurança
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Política de Leitura (Todos podem ler temporariamente para o front ou use role restrita)
DROP POLICY IF EXISTS "Admins can view stock movements" ON stock_movements;
CREATE POLICY "Admins can view stock movements" ON stock_movements
    FOR SELECT USING (true); 

-- Política de Inserção (Qualquer usuário autenticado ou anônimo que gera pedido pode inserir log)
DROP POLICY IF EXISTS "Users can insert movements" ON stock_movements;
CREATE POLICY "Users can insert movements" ON stock_movements
    FOR INSERT WITH CHECK (true);

-- Garantir acesso a Atualização/Remoção irrestrito para admins, ou genérico caso não tenha módulo complexo auth
DROP POLICY IF EXISTS "Admins can manage movements" ON stock_movements;
CREATE POLICY "Admins can manage movements" ON stock_movements
    FOR ALL USING (true);
