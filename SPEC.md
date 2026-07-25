# Spec-Driven Development — Loja Virtus (E-Commerce)

## 1. Visão Geral

**Produto:** Loja Virtus — E-commerce completo para venda de vestuário, acessórios, perfumaria e cosméticos.

**Stack:** Vanilla JS (ES Modules) + Vite + Supabase (PostgreSQL, Auth, Storage, RLS)

**Arquitetura:** SPA com camadas SOLID — UI → Services (regras de negócio) → Repositories (acesso a dados)

### Perfis de Usuário

```mermaid
mindmap
  root((👥 Usuários))
    Comprador
      Ver vitrine
      Comprar produtos
      Avaliar produtos
      Ver minhas compras
      Editar perfil
    Vendedor
      Tudo do Comprador
      Gerenciar produtos
      Gerenciar pedidos
      Ver relatórios
      Ver clientes
      Ver kardex
    Administrador
      Tudo do Vendedor
      Excluir pedidos
      Acesso total RLS
```

---

## 2. Requisitos Funcionais (RF)

### Módulo: Autenticação e Perfil

| ID | Descrição | Prioridade |
|---|---|---|
| RF-01 | Visitante pode criar conta com nome, e-mail e senha | Alta |
| RF-02 | Usuário pode fazer login com e-mail + senha | Alta |
| RF-03 | Usuário pode recuperar senha via Supabase (e-mail) | Média |
| RF-04 | Usuário logado pode editar perfil (nome, telefone, CEP, endereço, cidade) | Alta |
| RF-05 | Perfil criado automaticamente ao cadastrar via trigger no banco (role padrão: `comprador`) | Alta |
| RF-06 | Sistema reconhece 3 roles: `comprador`, `vendedor`, `administrador` | Alta |
| RF-07 | Admin/Vendedor veem painel administrativo; comprador só vê perfil e minhas compras | Alta |
| RF-08 | Botão "Sair" faz logout e redireciona para raiz | Média |

### Módulo: Catálogo de Produtos

| ID | Descrição | Prioridade |
|---|---|---|
| RF-09 | Vitrine exibe grid de produtos com imagem, nome, categoria, preço, tag, nota e botão "Comprar" | Alta |
| RF-10 | Filtro por departamento: `todos`, `vestuario`, `acessorios`, `perfumaria`, `cosmeticos` | Alta |
| RF-11 | Filtro por tag (ex: "Oferta", "Novo", "Destaque") | Média |
| RF-12 | Produto sem estoque aparece com overlay "Esgotado" e botão desabilitado | Alta |
| RF-13 | Galeria de imagens com zoom (mouse hover) e miniaturas clicáveis | Média |
| RF-14 | Sistema de avaliação por estrelas (1-5): usuário logado pode avaliar uma vez por produto | Média |
| RF-15 | Média das avaliações aparece no card do produto | Média |

### Módulo: Carrinho

| ID | Descrição | Prioridade |
|---|---|---|
| RF-16 | Carrinho em drawer lateral com itens, quantidades, controles +/- e remover item | Alta |
| RF-17 | Carrinho é volátil (array em memória, não localStorage) | Média |
| RF-18 | Botão "Comprar" no card adiciona 1 unidade ao carrinho | Alta |
| RF-19 | Validação de estoque: impede adicionar mais que o disponível | Alta |
| RF-20 | Badge no header mostra total de itens no carrinho com animação pulse | Média |

### Módulo: Checkout

| ID | Descrição | Prioridade |
|---|---|---|
| RF-21 | Checkout exige: usuário logado + telefone + endereço + CEP preenchidos | Alta |
| RF-22 | Formulário de endereço: CEP (com máscara), endereço, cidade | Alta |
| RF-23 | 3 métodos de pagamento: `cartao_credito`, `pix`, `boleto` | Alta |
| RF-24 | Cartão de crédito: campos com máscara (número, validade MM/AA, CVV), bandeiras permitidas, parcelamento | Alta |
| RF-25 | Parcelamento: 1 produto → limite do produto; 2+ unidades → até 12x; boleto → 1x | Alta |
| RF-26 | Preço diferente para crédito (`credit_price`) e à vista (`price`) | Média |
| RF-27 | Boleto: gera data de vencimento (+3 dias úteis), código de barras simulado, abre PDF para impressão | Alta |
| RF-28 | Boleto salva dados no `localStorage` para impressão em template separado | Média |
| RF-29 | PIX: status vai direto para "enviado" (simulação) | Média |
| RF-30 | Cartão: status vai direto para "pago" (simulação) | Média |
| RF-31 | Boleto: status fica "pendente", cancelado automaticamente após 3 dias vencido (função DB) | Alta |

### Módulo: Pedidos (Comprador)

| ID | Descrição | Prioridade |
|---|---|---|
| RF-32 | "Minhas Compras": tabela paginada (5 itens/página) com número, data, endereço, status, total | Alta |
| RF-33 | Modal de detalhes do pedido com itens (foto, nome, qtd, preço unit., subtotal) | Média |
| RF-34 | Cores de status: pendente (laranja), pago (azul), enviado (roxo), entregue (verde), cancelado (vermelho) | Média |

### Módulo: Admin — Produtos

| ID | Descrição | Prioridade |
|---|---|---|
| RF-35 | CRUD de produtos: nome, descrição, preço, preço crédito, custo, departamento, gênero, estoque, parcelas, bandeiras, tag, imagens | Alta |
| RF-36 | Upload de imagens comprimidas (WebP) para Supabase Storage (máx 4 fotos) | Alta |
| RF-37 | Máscara de moeda brasileira (R$ 1.234,56) nos inputs de preço | Alta |
| RF-38 | Tabela paginada (10/página) com busca por nome | Alta |
| RF-39 | Reposição de estoque: adicionar quantidade + atualizar preço de custo | Alta |
| RF-40 | Histórico de movimentação (Kardex) com busca e paginação (10/página) | Alta |
| RF-41 | Tipos de movimentação: VENDA, CANCELAMENTO, ENTRADA_REPOSICAO, REATIVACAO_PEDIDO | Alta |
| RF-42 | Skeleton loader na tabela de produtos enquanto carrega | Média |

### Módulo: Admin — Pedidos

| ID | Descrição | Prioridade |
|---|---|---|
| RF-43 | Tabela de vendas paginada (10/página) com cliente, status, total | Alta |
| RF-44 | Dropdown para alterar status do pedido + botão "Atualizar" | Alta |
| RF-45 | Cancelamento devolve itens ao estoque automaticamente | Alta |
| RF-46 | Reativação de pedido cancelado re-deduz estoque | Média |
| RF-47 | Exclusão permanente de pedidos cancelados (com confirmação) | Média |
| RF-48 | Cards de estatísticas: "Caixa Hoje" (soma total de hoje) e "Pedidos Pendentes" (contagem) | Alta |

### Módulo: Admin — Relatórios

```mermaid
flowchart TD
    subgraph Metrics["📊 Métricas"]
        M1["💰 Receita Total Bruta<br/>filtro por período"]
        M2["📦 Capital imobilizado<br/>em estoque"]
    end
    
    subgraph Cards["📇 Cards por Status"]
        C1["Pendentes: Qtd + Valor"]
        C2["Pagos: Qtd + Valor"]
        C3["Enviados: Qtd + Valor"]
        C4["Entregues: Qtd + Valor"]
        C5["Cancelados: Qtd + Valor"]
    end
    
    subgraph Highlights["🏆 Destaques"]
        H1["Produto mais caro"]
        H2["Produto mais barato"]
        H3["Produto mais vendido"]
    end
    
    subgraph Charts["📈 Gráficos (ApexCharts)"]
        G1["Receita 7 dias<br/>(linha)"]
        G2["Mix por departamento<br/>(donut)"]
        G3["Vendas vs Compras<br/>(barras)"]
    end

    style Charts fill:#f3e5f5,stroke:#7b1fa2
    style Metrics fill:#e3f2fd,stroke:#1565c0
    style Cards fill:#fff3e0,stroke:#e65100
    style Highlights fill:#e8f5e9,stroke:#2e7d32
```

| ID | Descrição | Prioridade |
|---|---|---|
| RF-49 | Receita Total Bruta com filtro por período (Flatpickr pt-BR) | Alta |
| RF-50 | Cards por status: quantidade + valor por status | Alta |
| RF-51 | Produto mais caro e mais barato do catálogo | Média |
| RF-52 | Produto mais vendido geral | Média |
| RF-53 | Capital imobilizado em estoque | Baixa |
| RF-54 | Gráficos ApexCharts: receita 7 dias (linha), mix por departamento (donut), vendas vs compras (barras) | Alta |

### Módulo: Admin — Clientes

| ID | Descrição | Prioridade |
|---|---|---|
| RF-55 | Tabela com todos os usuários cadastrados (nome, telefone, CEP, endereço, cidade, role) | Média |

### Módulo: UI/UX

```mermaid
flowchart LR
    subgraph Theme["🎨 Tema"]
        T1["Claro 🌞"]
        T2["Escuro 🌙"]
        T3["localStorage<br/>persistência"]
        T1 <--> T2
        T2 --> T3
        T1 --> T3
    end
    
    subgraph Responsivo["📱 Responsivo"]
        R1["Desktop 4K 🖥️"]
        R2["Tablet 📱"]
        R3["Smartphone 📱"]
        R1 --> R2 --> R3
    end
    
    subgraph Design["Design System"]
        D1["Glassmorphism"]
        D2["Variáveis CSS"]
        D3["Modais globais"]
    end

    style Theme fill:#e3f2fd,stroke:#1565c0
    style Responsivo fill:#e8f5e9,stroke:#2e7d32
    style Design fill:#fff3e0,stroke:#e65100
```

| ID | Descrição | Prioridade |
|---|---|---|
| RF-56 | Tema claro/escuro com persistência em localStorage | Alta |
| RF-57 | Glassmorphism design system com variáveis CSS | Alta |
| RF-58 | Responsivo: desktop 4K até smartphones | Alta |
| RF-59 | Loading overlay na inicialização com fade out | Média |
| RF-60 | Modal de diálogo global (showDialog) para confirmações e alertas | Alta |
| RF-61 | Navegação entre loja e dashboard via botão único | Alta |

---

## 3. Requisitos Não-Funcionais (RNF)

| ID | Descrição | Prioridade |
|---|---|---|
| RNF-01 | Zero dependências de framework JS (Vanilla puro) — exceto libs gráficas | Alta |
| RNF-02 | Build via Vite 5.x com base path `/lojaprodutos/` | Alta |
| RNF-03 | Supabase como única fonte de dados (PostgreSQL + Storage) | Alta |
| RNF-04 | Row-Level Security (RLS) para todas as tabelas | Alta |
| RNF-05 | CORS e políticas de storage restritas por autenticação | Alta |
| RNF-06 | Tempo de carregamento inicial < 3s (otimizado por Vite) | Média |
| RNF-07 | Compatível com Apache (subdiretório via `.htaccess`) | Média |
| RNF-08 | Código modular: UI / Services / Repositories (SOLID) | Alta |

---

## 4. Regras de Negócio (RN)

| ID | Descrição |
|---|---|
| RN-01 | Usuário só finaliza compra se tiver telefone + endereço + CEP no perfil |
| RN-02 | Estoque nunca pode ficar negativo: vendas verificam saldo atual do banco |
| RN-03 | Cancelamento de pedido devolve itens ao estoque com movimento CANCELAMENTO |
| RN-04 | Reativação de pedido cancelado re-deduz estoque com movimento REATIVACAO_PEDIDO |
| RN-05 | Boleto vence em 3 dias úteis; cancelado automaticamente após 3 dias corridos de vencido |
| RN-06 | Preço do cartão (`credit_price`) pode diferir do preço à vista (`price`) |
| RN-07 | Parcelamento: 1 unidade → limitado pelo campo `installments` do produto; 2+ → até 12x |
| RN-08 | Boleto é sempre 1x (à vista) |
| RN-09 | Produto com `stock <= 0` é exibido como "Esgotado" e não pode ser comprado |
| RN-10 | Admin/Vendedor veem `cost_price` (preço de custo); comprador nunca vê |
| RN-11 | Relatórios financeiros excluem pedidos cancelados do cômputo |
| RN-12 | Máximo de 4 imagens por produto no upload |
| RN-13 | Uma avaliação por usuário por produto (chave única `product_id + user_id`) |

---

## 5. Arquitetura do Sistema

### 5.1 Diagrama de Camadas

```mermaid
flowchart TB
    subgraph UI["UI Layer (Vanilla JS)"]
        direction TB
        A1["index.html → main.js"] 
        A2["components/<br/>header, footer, modals"]
        A3["pages/<br/>store, dashboard"]
        A4["ui/<br/>dialog, theme, navigation"]
    end
    
    subgraph Services["Service Layer (Regras de Negócio)"]
        direction TB
        B1["auth.js<br/>sessão, login, role"]
        B2["cart.js<br/>carrinho, checkout"]
        B3["products.js<br/>CRUD, kardex, galeria"]
        B4["orders.js<br/>pedidos, relatórios"]
        B5["profile.js<br/>perfil, admin"]
        B6["reviews.js<br/>avaliações"]
    end
    
    subgraph Repositories["Repository Layer (Data Access)"]
        direction TB
        C1["authRepository.js"]
        C2["productRepository.js"]
        C3["orderRepository.js"]
    end
    
    subgraph Supabase["Supabase (BaaS)"]
        direction TB
        D1["PostgreSQL<br/>tables + RLS"]
        D2["Auth<br/>email/password, JWT"]
        D3["Storage<br/>bucket 'produtos'"]
    end

    UI --> Services
    Services --> Repositories
    Repositories --> Supabase
```

### 5.2 Tipos de Pagamento e Fluxo de Status

```mermaid
flowchart LR
    A["🧾 Cartão"] --> B["✅ Pago<br/>(imediato)"]
    C["⚡ PIX"] --> D["📦 Enviado<br/>(imediato)"]
    E["📄 Boleto"] --> F["⏳ Pendente"]
    F --> G["❌ Cancelado<br/>3 dias após vencimento"]
    
    style A fill:#e8f5e9,stroke:#2e7d32
    style C fill:#fff3e0,stroke:#e65100
    style E fill:#e3f2fd,stroke:#1565c0
    style B fill:#c8e6c9,stroke:#2e7d32
    style D fill:#ffe0b2,stroke:#e65100
    style F fill:#fff9c4,stroke:#f9a825
    style G fill:#ffcdd2,stroke:#c62828
```

### 5.3 Ciclo de Vida do Pedido

```mermaid
stateDiagram-v2
    [*] --> Pendente
    Pendente --> Pago: Cartão de crédito
    Pendente --> Enviado: PIX
    Pendente --> Cancelado: Boleto vencido
    Pago --> Enviado: Despachar
    Pago --> Cancelado: Reembolsar
    Enviado --> Entregue: Confirmar entrega
    Enviado --> Cancelado: Cancelar envio
    
    note right of Pendente
        Boleto: status "pendente"
        até 3 dias úteis
    end note
    
    note right of Cancelado
        Estoque devolvido
        automaticamente
    end note
```

### 5.4 Fluxo de Checkout

```mermaid
flowchart TD
    Start["🛒 Finalizar Compra"] --> Logged{Usuário logado?}
    Logged -->|Não| Login["🔑 Fazer login"]
    Login --> ProfileOk{Perfil completo?<br/>telefone + endereço + CEP}
    Logged -->|Sim| ProfileOk
    
    ProfileOk -->|Não| EditPerfil["✏️ Completar perfil"]
    EditPerfil --> Payment["💳 Escolher pagamento"]
    ProfileOk -->|Sim| Payment
    
    Payment --> Choice{"Método"}
    
    Choice -->|Cartão| CardForm["Preencher cartão<br/>número, validade CVV, bandeira, parcelas"]
    Choice -->|PIX| PixGenerate["Gerar QR Code PIX"]
    Choice -->|Boleto| BoletoGen["Gerar boleto<br/>vencimento +3 dias úteis"]
    
    CardForm -->|Simula aprovação| Paid["✅ Status: PAGO"]
    PixGenerate -->|Simula confirmação| Sent["✅ Status: ENVIADO"]
    BoletoGen --> Pending["⏳ Status: PENDENTE<br/>Aguardar pagamento"]
    
    Paid --> Stock["📦 Deduzir estoque"]
    Sent --> Stock
    Pending --> Stock
    
    Stock --> ClearCart["🗑️ Esvaziar carrinho"]
    
    subgraph "Validações"
        V1["Estoque disponível?"]
        V2["Parcelamento<br/>1 unidade → limite produto<br/>2+ unidades → até 12x"]
        V3["Boleto → 1x à vista"]
    end
    
    style Start fill:#e8f5e9,stroke:#2e7d32
    style Payment fill:#fff3e0,stroke:#e65100
    style Paid fill:#c8e6c9,stroke:#2e7d32
    style Sent fill:#c8e6c9,stroke:#2e7d32
    style Pending fill:#fff9c4,stroke:#f9a825
```

---

## 6. Modelo de Dados

### 6.0 Relacionamento entre Tabelas (DER)

```mermaid
erDiagram
    profiles ||--o{ orders : "faz"
    profiles ||--o{ product_reviews : "avalia"
    products ||--o{ order_items : "contém"
    products ||--o{ stock_movements : "movimenta"
    products ||--o{ product_reviews : "tem"
    orders ||--o{ order_items : "possui"
    
    profiles {
        uuid id PK
        text full_name
        text phone
        text zipcode
        text address
        text city
        text role "comprador | vendedor | administrador"
        timestamptz created_at
    }
    
    products {
        uuid id PK
        text name
        numeric price
        numeric credit_price
        text department
        integer stock
        integer installments
        text card_brands
        text tag
        numeric cost_price "só admin vê"
    }
    
    orders {
        uuid id PK
        uuid user_id FK
        numeric total
        text status "pendente | pago | enviado | entregue | cancelado"
        text payment_method
        text delivery_address
        date boleto_due_date
        timestamptz created_at
    }
    
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        integer quantity
        numeric price_at_time
    }
    
    stock_movements {
        uuid id PK
        uuid product_id FK
        integer quantity "+/-"
        text type "VENDA | CANCELAMENTO | ENTRADA_REPOSICAO | REATIVACAO_PEDIDO"
        integer previous_stock
        integer current_stock
        uuid order_id FK
        timestamptz created_at
    }
    
    product_reviews {
        uuid id PK
        uuid product_id FK
        uuid user_id FK
        integer rating "1-5"
        timestamptz created_at
    }
```

### 6.1 `profiles`

| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK → auth.users(id) ON DELETE CASCADE |
| full_name | TEXT | NOT NULL |
| phone | TEXT | |
| zipcode | TEXT | |
| address | TEXT | |
| city | TEXT | |
| role | TEXT | CHECK IN ('comprador', 'vendedor', 'administrador') DEFAULT 'comprador' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### 6.2 `products`

| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| name | TEXT | NOT NULL |
| description | TEXT | |
| price | NUMERIC(10,2) | NOT NULL |
| department | TEXT | NOT NULL CHECK ('vestuario','acessorios','perfumaria','cosmeticos') |
| gender | TEXT | CHECK ('masculino','feminino','unissex','infantil') |
| image_url | TEXT | URLs separadas por vírgula |
| stock | INTEGER | DEFAULT 0 |
| credit_price | NUMERIC(10,2) | Preço para cartão |
| installments | INTEGER | DEFAULT 1 |
| card_brands | TEXT | DEFAULT 'VISA, MASTERCARD' |
| tag | TEXT | 'Novo', 'Oferta', 'Destaque', etc. |
| cost_price | NUMERIC(10,2) | Visível apenas admin/vendedor |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### 6.3 `orders`

| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| user_id | UUID | → profiles(id) ON DELETE SET NULL |
| total | NUMERIC(10,2) | NOT NULL |
| status | TEXT | CHECK ('pendente','pago','enviado','entregue','cancelado') DEFAULT 'pendente' |
| payment_method | TEXT | CHECK ('cartao_credito','pix','boleto','deposito_conta') |
| delivery_address | TEXT | |
| boleto_due_date | DATE | |
| boleto_barcode | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### 6.4 `order_items`

| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| order_id | UUID | → orders(id) ON DELETE CASCADE |
| product_id | UUID | → products(id) ON DELETE SET NULL |
| quantity | INTEGER | NOT NULL CHECK (> 0) |
| price_at_time | NUMERIC(10,2) | NOT NULL |

### 6.5 `stock_movements`

| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| product_id | UUID | → products(id) |
| quantity | INTEGER | Positivo = entrada, Negativo = saída |
| type | TEXT | NOT NULL ('VENDA','CANCELAMENTO','ENTRADA_REPOSICAO','ENTRADA_MANUAL','AJUSTE','REATIVACAO_PEDIDO') |
| previous_stock | INTEGER | |
| current_stock | INTEGER | |
| order_id | UUID | → orders(id) (nullable) |
| user_id | UUID | → auth.users(id) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### 6.6 Fluxo de Movimentação de Estoque (Kardex)

```mermaid
flowchart LR
    VENDA --> S1["➖ Saída<br/>stock -= qtd"]
    CANCELAMENTO --> S2["➕ Entrada<br/>stock += qtd"]
    ENTRADA_REPOSICAO --> S3["➕ Entrada<br/>stock += qtd"]
    REATIVACAO_PEDIDO --> S4["➖ Saída<br/>stock -= qtd"]
    
    subgraph Kardex["📋 stock_movements"]
        direction TB
        K1["Registra:<br/>- Produto<br/>- Quantidade (+/-)<br/>- Tipo<br/>- Estoque anterior/atual<br/>- Pedido vinculado<br/>- Usuário<br/>- Data/hora"]
    end
    
    S1 --> Kardex
    S2 --> Kardex
    S3 --> Kardex
    S4 --> Kardex
    
    style VENDA fill:#ffcdd2,stroke:#c62828
    style CANCELAMENTO fill:#c8e6c9,stroke:#2e7d32
    style ENTRADA_REPOSICAO fill:#c8e6c9,stroke:#2e7d32
    style REATIVACAO_PEDIDO fill:#ffcdd2,stroke:#c62828
```

### 6.7 `product_reviews`

| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| product_id | UUID | → products(id) |
| user_id | UUID | → auth.users(id) |
| rating | INTEGER | CHECK (1-5) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| UNIQUE | (product_id, user_id) | |

---

## 7. Especificação de Rotas (Navegação SPA)

Não há rotas URL — a navegação é feita por exibição/ocultação de views:

```mermaid
flowchart TD
    Start["🏠 Visitante"] --> Store["🛍️ Vitrine<br/>(view-store)"]
    
    Store --> Login["🔑 Login / Cadastro"]
    Login --> Dashboard{"📊 Dashboard<br/>role?"}
    
    Dashboard -->|"comprador"| Compras["📦 Minhas Compras"]
    Dashboard --> Perfil["👤 Meu Perfil"]
    
    Dashboard -->|"admin/vendedor"| AdminProd["📋 Produtos<br/>CRUD + Kardex"]
    Dashboard --> AdminVendas["💰 Vendas<br/>Gerenciar pedidos"]
    Dashboard --> AdminRelat["📈 Relatórios<br/>Gráficos + Métricas"]
    Dashboard --> AdminClientes["👥 Clientes"]
    Dashboard --> AdminKardex["📜 Kardex<br/>Histórico estoque"]
    
    AdminProd --> Restock["📦 Repor Estoque"]
    
    Store --> Cart["🛒 Carrinho"]
    Cart --> Checkout["💳 Checkout"]
    Checkout -->|"PIX"| Sent["✅ Pedido enviado"]
    Checkout -->|"Cartão"| Paid["✅ Pedido pago"]
    Checkout -->|"Boleto"| Pending["⏳ Pedido pendente"]
    
    Dashboard -->|"Voltar pra Loja"| Store
    
    style Start fill:#e8f5e9,stroke:#2e7d32
    style Store fill:#e3f2fd,stroke:#1565c0
    style Dashboard fill:#f3e5f5,stroke:#7b1fa2
    style Checkout fill:#fff3e0,stroke:#e65100
```

| View | Elemento | Trigger |
|---|---|---|
| Vitrine | `#view-store` | Default / "Voltar pra Loja" |
| Dashboard | `#view-dashboard` | Clique no nome do usuário logado |
| Aba Perfil | `#dash-perfil` | Botão no dashboard |
| Aba Compras | `#dash-compras` | Botão no dashboard |
| Aba Admin Produtos | `#dash-produtos` | Botão no dashboard (admin/vendedor) |
| Aba Admin Vendas | `#dash-vendas` | Botão no dashboard (admin/vendedor) |
| Aba Admin Relatórios | `#dash-relatorios` | Botão no dashboard (admin/vendedor) |
| Aba Admin Clientes | `#dash-clientes` | Botão no dashboard (admin/vendedor) |
| Aba Admin Kardex | `#dash-kardex` | Botão no dashboard (admin/vendedor) |

---

## 8. User Stories e Critérios de Aceitação

### US-01: Comprador navega e compra

```
Dado que sou um visitante na vitrine
Quando clico em "Comprar" em um produto com estoque
Então ele é adicionado ao carrinho
E o badge do carrinho atualiza

Dado que tenho itens no carrinho
E estou logado com perfil completo
Quando finalizo a compra via cartão de crédito
Então o pedido é criado com status "pago"
E o estoque é deduzido
E o carrinho é esvaziado
```

### US-02: Admin gerencia estoque

```
Dado que sou administrador
Quando acesso o painel de produtos
E clico em "Repor" em um produto
E informo quantidade e novo preço de custo
Então o estoque é incrementado
E o movimento é registrado no Kardex
```

### US-03: Cancelamento devolve estoque

```
Dado que sou administrador
Quando mudo o status de um pedido para "cancelado"
Então todos os itens retornam ao estoque
E um movimento CANCELAMENTO é registrado
E o estoque final reflete a devolução
```

### US-04: Boleto vencido é cancelado

```
Dado que um boleto está pendente há mais de 3 dias após o vencimento
Quando a função cancel_expired_boletos() é executada
Então o pedido muda para "cancelado"
E os itens retornam ao estoque
```

---

## 9. Estrutura de Arquivos (Spec)

```
/ (raiz)
├── index.html                    # Ponto de entrada SPA
├── src/
│   ├── main.js                   # Orquestrador: monta HTML + inicializa módulos
│   ├── style.css                 # Design system (variáveis CSS, glassmorphism)
│   ├── charts.js                 # ApexCharts: 3 gráficos do dashboard
│   ├── lib/
│   │   └── supabase.js           # Singleton do cliente Supabase
│   ├── components/
│   │   ├── header.html           # Nav superior: logo, categorias, tema, login, carrinho
│   │   ├── footer.html           # Rodapé simples com copyright
│   │   └── modals/
│   │       ├── auth.html         # Login / Cadastro
│   │       ├── cart.html         # Drawer do carrinho
│   │       ├── checkout.html     # Checkout completo
│   │       ├── dialog.html       # Modal de diálogo genérico
│   │       ├── gallery.html      # Galeria com zoom + avaliação
│   │       ├── product-admin.html # Formulário de produto (add/edit)
│   │       └── restock.html      # Modal de reposição de estoque
│   ├── pages/
│   │   ├── store.html            # Vitrine: hero + grid de produtos
│   │   └── dashboard.html        # Dashboard completo (perfil, admin, relatórios)
│   ├── services/
│   │   ├── auth.js               # Sessão, login, registro, role switching
│   │   ├── cart.js               # Carrinho, checkout, boleto, pagamento
│   │   ├── products.js           # CRUD produtos, galeria, kardex, avaliação
│   │   ├── orders.js             # Pedidos (comprador + admin), relatórios
│   │   ├── profile.js            # Perfil do usuário, admin clientes
│   │   └── reviews.js            # Submissão e consulta de avaliações
│   ├── repositories/
│   │   ├── authRepository.js     # Chamadas Supabase: auth + profiles
│   │   ├── productRepository.js  # Chamadas Supabase: products + stock + storage
│   │   └── orderRepository.js    # Chamadas Supabase: orders + order_items + reports
│   └── ui/
│       ├── dialog.js             # Função showDialog global
│       ├── navigation.js         # Filtros de categoria e navegação dashboard
│       └── theme.js              # Toggle claro/escuro
├── schema.sql                    # DDL completo + RLS + triggers
├── vite.config.js                # Build config
├── tailwind.config.js            # Tailwind custom tokens
└── postcss.config.js             # PostCSS plugins
```

---

## 10. Dependências Externas

| Biblioteca | Versão | Uso |
|---|---|---|
| `@supabase/supabase-js` | ^2.39.0 | Cliente Supabase (CRUD + Auth + Storage) |
| `apexcharts` | (CDN) | Gráficos do dashboard |
| `flatpickr` | (CDN) | Date picker pt-BR nos relatórios |
| `tailwindcss` | ^3.4.19 | Utilitários CSS |
| `vite` | ^5.x | Bundler dev/prod |

---

## 11. Segurança (RLS)

| Tabela | Regra |
|---|---|
| products | SELECT público; INSERT/UPDATE autenticado |
| profiles | SELECT/UPDATE próprio perfil apenas |
| orders | SELECT própria; admin/vendedor veem todas |
| order_items | SELECT via própria order; admin/vendedor veem todos |
| stock_movements | INSERT público autenticado |
| product_reviews | SELECT público; INSERT/UPDATE próprio; admin modera |
| storage.produtos | SELECT público; INSERT/UPDATE/DELETE autenticado |

---

## 12. Glossário

| Termo | Definição |
|---|---|
| Kardex | Histórico de movimentação de estoque (entradas e saídas) |
| RLS | Row-Level Security — políticas de segurança por linha no PostgreSQL |
| SPA | Single Page Application — aplicação de página única |
| Glassmorphism | Estilo de design com vidro fosco, blur e transparência |
| PIX | Método de pagamento instantâneo brasileiro |
| Boleto | Método de pagamento com boleto bancário impresso |
