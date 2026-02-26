import './style.css';

// Importa os Componentes da UI (separação do HTML gigantesco)
import headerHtml from './components/header.html?raw';
import storeHtml from './pages/store.html?raw';
import dashboardHtml from './pages/dashboard.html?raw';
import authModalHtml from './components/modals/auth.html?raw';
import cartDrawerHtml from './components/modals/cart.html?raw';
import checkoutModalHtml from './components/modals/checkout.html?raw';
import productAdminModalHtml from './components/modals/product-admin.html?raw';
import galleryModalHtml from './components/modals/gallery.html?raw';
import dialogModalHtml from './components/modals/dialog.html?raw';
import restockModalHtml from './components/modals/restock.html?raw';
import footerHtml from './components/footer.html?raw';

// Monta a UI sincronicamente na tela ANTES de ligar as regras de negócio
document.getElementById('app').innerHTML = `
  ${headerHtml}
  <main class="app-main">
    ${storeHtml}
    ${dashboardHtml}
  </main>
  ${authModalHtml}
  ${cartDrawerHtml}
  ${checkoutModalHtml}
  ${productAdminModalHtml}
  ${galleryModalHtml}
  ${dialogModalHtml}
  ${restockModalHtml}
  ${footerHtml}
`;

// Conecta Serviços e Módulos do Sistema de volta na DOM recém-nascida
import { setupTheme } from './ui/theme.js';
import { setupAuth } from './services/auth.js';
import { setupCart } from './services/cart.js';
import { setupAdminProducts, renderProducts } from './services/products.js';
import { setupNavigation } from './ui/navigation.js';
import { showDialog } from './ui/dialog.js';
import { setupProfile } from './services/profile.js';

window.showDialog = showDialog;

window.addEventListener('load', () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }, 300);
  }

  const yearElement = document.getElementById('current-year');
  if (yearElement) yearElement.textContent = new Date().getFullYear();

  renderProducts();
});

// Inicializando Subsistemas Modularizados (Regras SOLID e Clean Code)
setupTheme();
setupAuth();
setupCart();
setupAdminProducts();
setupProfile();
setupNavigation();

