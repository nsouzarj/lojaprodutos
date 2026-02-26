import { renderProducts, loadAdminProducts, loadKardex } from '../services/products.js';
import { loadAdminUsers } from '../services/profile.js';
import { checkSession } from '../services/auth.js';
import { loadMyOrders, loadAdminOrders, loadAdminReports } from '../services/orders.js';
import { renderAdminCharts } from '../charts.js';

export function setupNavigation() {
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    const mainNav = document.querySelector('.main-nav');

    if (btnMobileMenu && mainNav) {
        btnMobileMenu.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // Funcionalidades dos Botões do Hero
    const btnExplore = document.getElementById('btn-explore');
    const btnOffers = document.getElementById('btn-offers');

    if (btnExplore) {
        btnExplore.addEventListener('click', () => {
            const productsSection = document.querySelector('.products-section');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (btnOffers) {
        btnOffers.addEventListener('click', () => {
            const productsSection = document.querySelector('.products-section');
            const sectionTitle = document.querySelector('.section-title');

            if (sectionTitle) sectionTitle.textContent = "Ofertas Imperdíveis";

            renderProducts('todos', 'Oferta');

            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    const categoryLinks = document.querySelectorAll('.nav-link[data-category]');
    if (categoryLinks) {
        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const viewStore = document.getElementById('view-store');
                const viewDash = document.getElementById('view-dashboard');
                const iconCart = document.getElementById('btn-cart');

                if (viewStore && viewStore.style.display === 'none') {
                    viewStore.style.display = 'block';
                    viewDash.style.display = 'none';
                    if (iconCart) iconCart.style.display = 'inline-flex';
                    checkSession(); // Recupera o botao nome logado corretamente
                }

                categoryLinks.forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');

                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                }

                const selectedCategory = e.currentTarget.getAttribute('data-category');

                // Esconder ou Revelar Header principal (Hero Section) baseando na aba
                const heroSection = document.querySelector('.hero-section');
                if (heroSection) {
                    if (selectedCategory === 'todos') {
                        heroSection.style.display = 'block';
                    } else {
                        heroSection.style.display = 'none';
                    }
                }

                const sectionTitle = document.querySelector('.section-title');
                if (sectionTitle) {
                    if (selectedCategory === 'todos') sectionTitle.textContent = "Lançamentos da Semana";
                    else if (selectedCategory === 'vestuario') sectionTitle.textContent = "Sessão Vestuário";
                    else if (selectedCategory === 'acessorios') sectionTitle.textContent = "Sessão Acessórios";
                    else if (selectedCategory === 'perfumaria') sectionTitle.textContent = "Sessão Perfumaria";
                    else if (selectedCategory === 'cosmeticos') sectionTitle.textContent = "Sessão Cosméticos";
                }

                renderProducts(selectedCategory);
            });
        });
    }

    // Dashboard Tabs
    const dashBtns = document.querySelectorAll('.dash-btn');
    const dashPanels = document.querySelectorAll('.dash-panel');

    if (dashBtns) {
        dashBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.getAttribute('data-target');

                dashBtns.forEach(b => b.classList.remove('active'));
                dashPanels.forEach(p => p.style.display = 'none');

                e.currentTarget.classList.add('active');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.style.display = 'block';

                    if (targetId === 'dash-produtos') {
                        loadAdminProducts();
                    } else if (targetId === 'dash-clientes') {
                        loadAdminUsers();
                    } else if (targetId === 'dash-vendas') {
                        loadAdminOrders();
                    } else if (targetId === 'dash-relatorios') {
                        loadAdminReports();
                        renderAdminCharts();
                    } else if (targetId === 'dash-movimentacoes') {
                        loadKardex();
                    } else if (targetId === 'dash-pedidos') {
                        loadMyOrders();
                    }
                }
            });
        });
    }
}

