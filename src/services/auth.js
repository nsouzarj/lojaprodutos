import { supabase } from '../lib/supabase.js';
import { loadMyOrders } from './orders.js';
import { showDialog } from '../ui/dialog.js';

export async function checkSession() {
    const btnLogin = document.getElementById('btn-login');

    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
        const fullName = session.user.user_metadata?.full_name || 'Minha Conta';
        const firstName = fullName.split(' ')[0];

        // Buscar Role no DB (Profiles)
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const userRole = profile?.role || 'comprador';

        // Preenche o formulário Meu Perfil com os dados atuais
        if (profile) {
            const formName = document.getElementById('prof-name');
            if (formName) {
                formName.value = profile.full_name || '';
                document.getElementById('prof-phone').value = profile.phone || '';
                document.getElementById('prof-zipcode').value = profile.zipcode || '';
                document.getElementById('prof-address').value = profile.address || '';
                document.getElementById('prof-city').value = profile.city || '';
            }
        }

        if (btnLogin) {
            if (document.getElementById('view-dashboard') && document.getElementById('view-dashboard').style.display === 'block') {
                btnLogin.innerHTML = `◀ Voltar <span class="hide-mobile">pra Loja</span> &nbsp;|&nbsp; Sair`;
            } else {
                btnLogin.innerHTML = `👤 <b>${firstName}</b> <span class="hide-mobile">(Painel)</span>`;
            }
        }

        // Popular Info do Dashboard
        const dashUserName = document.getElementById('dash-user-name');
        const dashUserRole = document.getElementById('dash-user-role');

        if (dashUserName) dashUserName.textContent = fullName;
        if (dashUserRole) dashUserRole.textContent = String(userRole).toUpperCase();

        // Reset e Revelar Sessões de Admin/Vendedor dependendo da Role
        const adminContainers = document.querySelectorAll('.admin-only');
        if (userRole === 'administrador' || userRole === 'vendedor') {
            adminContainers.forEach(el => el.style.display = 'block');
        } else {
            adminContainers.forEach(el => el.style.display = 'none');
        }

    } else {
        if (btnLogin) btnLogin.innerHTML = 'Entrar';
        const adminContainers = document.querySelectorAll('.admin-only');
        adminContainers.forEach(el => el.style.display = 'none');
    }

    // Atualiza Histórico da Nova Sessão Ativa ou Inativa
    loadMyOrders();
}

export function setupAuth() {
    const btnLogin = document.getElementById('btn-login');
    const authModal = document.getElementById('auth-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Abrir Modal ou Visualizar Dashboard
    if (btnLogin && authModal) {
        btnLogin.addEventListener('click', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Em vez de só sair, se a pessoa clicar no proprio nome a gente abre o Dashboard
                const viewStore = document.getElementById('view-store');
                const viewDash = document.getElementById('view-dashboard');
                const iconCart = document.getElementById('btn-cart');

                if (viewStore.style.display !== 'none') {
                    // Muda pra painel
                    viewStore.style.display = 'none';
                    if (iconCart) iconCart.style.display = 'none';
                    viewDash.style.display = 'block';
                    btnLogin.innerHTML = `◀ Voltar <span class="hide-mobile">pra Loja</span> &nbsp;|&nbsp; <span id="btn-real-logout" style="cursor:pointer; color:red;">Sair</span>`;

                    // Adiciona listening no botao sair vermelho
                    setTimeout(() => {
                        const btnRealLogout = document.getElementById('btn-real-logout');
                        if (btnRealLogout) {
                            btnRealLogout.addEventListener('click', (ev) => {
                                ev.stopPropagation(); // Evitar duplo click
                                supabase.auth.signOut().then(() => {
                                    window.location.href = import.meta.env.BASE_URL || '/';
                                });
                            });
                        }
                    }, 50);

                } else {
                    // Clicou no botão global para "Voltar para Loja"
                    viewStore.style.display = 'block';
                    if (iconCart) iconCart.style.display = 'inline-flex';
                    viewDash.style.display = 'none';
                    checkSession(); // Recupera Header Original
                }
                return;
            }

            // Caso contrário (deslogado)
            if (btnLogin.textContent.trim() === 'Sair') {
                supabase.auth.signOut().then(() => {
                    window.location.href = import.meta.env.BASE_URL || '/';
                });
                return;
            }
            authModal.classList.add('active');
        });
    }

    if (btnCloseModal && authModal) {
        btnCloseModal.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
            }
        });
    }

    // Lógica para visualizar/ocultar senha
    const togglePasswordBtns = document.querySelectorAll('.btn-toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    btn.textContent = '🙈'; // Ícone de "esconder"
                } else {
                    passwordInput.type = 'password';
                    btn.textContent = '👁️'; // Ícone de "mostrar"
                }
            }
        });
    });

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const linkToRegister = document.getElementById('link-to-register');
    const linkToLogin = document.getElementById('link-to-login');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    function switchAuthForm(toRegister = false) {
        if (toRegister) {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            authTitle.textContent = "Crie sua Conta";
            authSubtitle.textContent = "Preencha seus dados para continuar";
        } else {
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
            authTitle.textContent = "Bem-vindo(a)";
            authSubtitle.textContent = "Acesso rápido com seu e-mail";
        }
    }

    if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); switchAuthForm(true); });
    if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); switchAuthForm(false); });

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-register');
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            btnSubmit.classList.add('btn-loading');
            btnSubmit.disabled = true;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name, }
                }
            });

            btnSubmit.disabled = false;
            btnSubmit.classList.remove('btn-loading');

            if (error) {
                showDialog("Erro no Cadastro", error.message, true);
            } else {
                showDialog("Sucesso", "Conta criada com sucesso! Faça login.", false);
                setTimeout(() => switchAuthForm(false), 2000);
                registerForm.reset();
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-login');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            btnSubmit.classList.add('btn-loading');
            btnSubmit.disabled = true;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            btnSubmit.disabled = false;
            btnSubmit.classList.remove('btn-loading');

            if (error) {
                showDialog("Falha no Login", "Email ou senha incorretos!", true);
            } else {
                loginForm.reset();
                authModal.classList.remove('active');

                // Redirecionamento Inteligente de Pós-Login
                const viewStore = document.getElementById('view-store');
                const viewDash = document.getElementById('view-dashboard');
                const iconCart = document.getElementById('btn-cart');

                // Checa se é comprador novo sem pedidos
                const { count: ordersCount } = await supabase.from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', data.user.id);

                const { data: profileObj } = await supabase.from('profiles')
                    .select('role, phone, address')
                    .eq('id', data.user.id)
                    .single();

                const role = profileObj?.role || 'comprador';
                const hasCompletedProfile = profileObj && profileObj.phone && profileObj.address;

                if (viewStore && viewDash) {
                    if (role === 'administrador' || role === 'vendedor') {
                        // Admin/Vendedor sempre pro painel
                        viewStore.style.display = 'none';
                        if (iconCart) iconCart.style.display = 'none';
                        viewDash.style.display = 'block';
                    } else if (!hasCompletedProfile) {
                        // COMPRADOR INCOMPLETO -> Vai pro Dashboard "Meu Perfil"
                        viewStore.style.display = 'none';
                        if (iconCart) iconCart.style.display = 'none';
                        viewDash.style.display = 'block';

                        // Força exibição da aba de perfil
                        const dashBtns = document.querySelectorAll('.dash-btn');
                        const dashPanels = document.querySelectorAll('.dash-panel');
                        dashBtns.forEach(b => b.classList.remove('active'));
                        dashPanels.forEach(p => p.style.display = 'none');

                        const dashPerfilBtn = Array.from(dashBtns).find(btn => btn.getAttribute('data-target') === 'dash-perfil');
                        const dashPerfilPanel = document.getElementById('dash-perfil');
                        if (dashPerfilBtn) dashPerfilBtn.classList.add('active');
                        if (dashPerfilPanel) dashPerfilPanel.style.display = 'block';

                        showDialog("Complete seu Cadastro 👋", "Por favor, preencha seus dados de Endereço e Telefone antes de ir para a vitrine para garantirmos a sua entrega.", false);
                    } else if (ordersCount && ordersCount > 0) {
                        // Comprador com hitórico -> Painel de Pedidos
                        viewStore.style.display = 'none';
                        if (iconCart) iconCart.style.display = 'none';
                        viewDash.style.display = 'block';
                    } else {
                        // Novo comprador já completinho: fica diretamente na Vitrine!
                        viewStore.style.display = 'block';
                        if (iconCart) iconCart.style.display = 'inline-flex';
                        viewDash.style.display = 'none';
                    }
                }

                checkSession();
            }
        });
    }

    // Set initial state
    checkSession();

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            checkSession();
        }
    });

}
