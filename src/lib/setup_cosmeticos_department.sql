-- Update the database constraint for products_department_check
-- This allows the new 'cosmeticos' department to be inserted into the products table
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_department_check;
ALTER TABLE products ADD CONSTRAINT products_department_check CHECK (department IN ('vestuario', 'acessorios', 'perfumaria', 'cosmeticos'));
