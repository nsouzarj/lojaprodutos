# 🛍️ Loja de Produtos - E-Commerce Sustentável e Moderno

Um sistema de E-Commerce completo, minimalista e de alta performance desenvolvido inteiramente com **Vanilla JS**, Focado em experiência premium (UI/UX) e carregamento instantâneo. Nascido da necessidade de ter um portal rápido, o ecossistema une beleza visual à estabilidade arquitetural de backend-ass-a-service (BaaS) usando Supabase.

[![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-8A2BE2)](#)
[![Stack](https://img.shields.io/badge/Stack-Vanilla_JS_%7C_Vite_%7C_Supabase-green)](#)

---

## 🎨 O Projeto
A interface da **Loja V8** adere rigorosamente aos princípios de design de *Glassmorphism*, paletas monocromáticas escuras com contrastes vivos (`hsl(var(--accent-color))`), micro-animações dinâmicas e **total responsividade** desde Desktops 4K até os menores smartphones, permitindo tanto que o cliente compre com prazer, quanto o administrador gerencie todo o sistema utilizando apenas os polegares na tela.

### 🌟 Pilares da Experiência
1. **Premium Aesthetics:** Cores vibrantes, sombras difusas e componentes que reagem fisicamente (escala e botões de brilho) à interação do usuário.  
2. **"Single Page" Vibe:** Transições de views feitas via manipulação estrita do DOM, sem reloads (exceto ao finalizar auth para purgar sessões antigas de memória). 
3. **Responsive by Default:** Cada tabela administrativa e grid de compras é adaptável; de grades massivas na web a fichas (Cards) na tela de celular, com o mínimo de confusão visual.

---

## 🛠️ Stack Tecnológica

* **Frontend Engine:** Vanilla JavaScript Puro (ESM Modules). 
* **Marcação e Estilo:** Semantic HTML5 & CSS3 Avançado (Flex, Grid, CSS Variables nativas `hsl` e media queries severas). Sem Bootstrap ou Tailwind para máximo controle de cada pixel renderizado na tela.
* **Componentização UI/UX:** `Flatpickr` (Selecionador inteligente de datas em relatórios gerenciais na Dashboard PT-BR).
* **Backend, Auth & Database:** [Supabase](https://supabase.com) (PostgreSQL gerenciado). Autenticação, Row-Level-Security (RLS), Edge Functions, Webhooks SMTP e Storage Básico de assets.
* **Build Tool:** Vite, configurado no motor ultra-rapide para bundling de produção visando distribuição nativa (`dist/`) com base para subdiretórios Apache. `npm run build` cria versão estática optimizada para Apache/Hostgator.

---

## 🏗️ Estrutura de Pastas e Arquitetura do Frontend

O projeto adere uma hierarquia estrita focada em **Módulos Limpos (Clean Modules)**. Os arquivos de regras de negócio (Serviços) nunca misturam os de Views (Páginas/Modalidades):

```text
/
├── dist/                # Bundle pronto de produção minificado e hasheado gerado pelo Vite. 
├── src/                 # Todo código fonte livre Vanilla.
│   ├── components/      # Pedacinhos de HTML importados e gerenciáveis via DOM.
│   │   ├── modals/      # Auth, Gallery, Product-Admin Injectors.
│   │   ├── footers/     # Rodapé com Links Úteis, Contatos.
│   │   └── headers/     # Header (Nav-bars), Carrinho Dinâmico (Sidebar).
│   ├── lib/             # Scripts 3rd-party ou Engines de conexão (ex: Instância isolada do Supabase).
│   ├── pages/           # Seções massivas do Sistema.
│   │   ├── dashboard.html # Template do Painel de Admin/Meu Perfil com Injections via JS.
│   │   └── store.html   # Template da vitrine com Grade principal.
│   ├── services/        # 🧠 O Cérebro JS. Onde acontecem chamadas assíncronas para o DB.
│   │   ├── auth.js      # Lidando c/ Session Tokens & Supabase-Login.
│   │   ├── cart.js      # Cache Local via LocalStorage e controle estrito de carrinho.
│   │   ├── orders.js    # Fetch MyOrders, Generate Admin Orders e Funil Financeiro e Relatórios (Mais Caro, Total Faturado, etc).
│   │   ├── products.js  # CRUD do Supabase, máscaras BRL de moedas, calculo Custo. 
│   │   └── profile.js   # Controle de Meus Dados Pessoais / Endereço (Profiles System).
│   ├── ui/              # Handlers UI para Dialogos modais customizados que o navegador não faz.
│   ├── main.js          # Cola de Injeção. Sabe como inicializar os modulos injetando todo o HTML assincronamente no body.
│   └── style.css        # Todas Variáveis CSS mestres de Token do Design System. 
├── index.html           # Root Container e ponto de montagem do Vite.
└── vite.config.js       # Regras de build.
```

---

## 🚀 Funcionalidades Chaves (Core Features)

### Para o Comprador 🛒:
- Catálogo Responsivo com Filtros Laterais Inteligentes.
- Carrinho de Compras em modal persistente (usando LocalStorage, não perca nunca seus itens recarregando a página).
- Perfis Integrados com máscaras de CPF / Endereço Completo, e listagem rápida com Rastreamento das `Minhas Compras`.
- Gateway Simulado: Transições fluidas da escolha até o botão mágico do pagamento!

### Para o Administrador/Vendedor 👑:
- **Relatório de Funil Financeiro Exclusivo:** Acesso na Dashboard a Receitas Brutas com filtros por Range de Datas, Mostruário Mais Vendido, Mais Caro, e métricas em tempo real sobre Pedidos Pendentes, Pagos e Enviados. 
- Gestão Simplificada do Catálogo com possibilidade extra: **Inclusão do Preço de Custo Oculto** do seu estoque, que o cliente não vê. Permite ao gerente visualizar o ROI facilmente. 
- Atualização em massa de status (`Aguardando Pagamento` -> `Enviado`) c/ registro de log imediato.
- Visão Responsiva por "Fichas" de Controle no dispositivo Móvel sem rolagem horizontal bizarra. Lê tudo num format "Card-Table!".

---

## 🖥️ Como Executar Localmente (Development)

Siga os passos a seguir usando o Node.js em seu terminal Root. O projeto deve possuir um arquivo `.env` mapeando devidamente para uma base do Supabase com todas as tabelas e schemas presentes nas regras de negócio da pasta de Skills:

1. Clone o projeto e instale os pacotes:
```bash
npm install
```

2. Popule o respectivo arquivo `.env` com a url rest/DB do `Supabase` para desenvolvimento:
```bash
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_secret_aqui
```
*(Nota Técnica: O Vite usa o prefixo estrito `VITE_` para expor variáveis de build na web).*

3. Suba o servidor do HMR (Hot-Module-Replacement):
```bash
npm run dev
```
*(Seu browser local abrirá instantaneamente em http://localhost:5173).*

---

## 🔒 Segurança (RLS e Supabase)

Toda manipulação sensível no banco (como deletar ou apagar produtos, mudar order_status, ou ler Relatórios de Gestão) dependem das `Row Level Security (RLS) policies` ativas no Supabase. Modos de **Admin e Vendedor** controlam o painel, não via Frontend JS hackeáveis, mas pelo Schema restrito associado aos Tokens de Oauth emitidos pelo banco de dados aos Perfis corretos da Loja, validando JWT secretamente! 

O arquivo `services/auth.js` gerencia as sessões persistentes com base neste fluxo restritivo. Dependendo da sua role informada, até a tabela de Produtos retorna informações exclusivas baseadas em seu JWT.
