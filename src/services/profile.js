import { supabase } from '../lib/supabase.js';
import { showDialog } from '../ui/dialog.js';

export async function loadUserProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Erro ao puxar perfil:", err);
        return null;
    }
}

export async function setupProfile() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    // Máscara Telefone
    const profPhone = document.getElementById('prof-phone');
    if (profPhone) {
        profPhone.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }

    // Máscara CEP 
    const profZip = document.getElementById('prof-zipcode');
    if (profZip) {
        profZip.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,5})(\d{0,3})/);
            e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
        });
    }

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btn-submit-profile');

        const full_name = document.getElementById('prof-name').value;
        const phone = document.getElementById('prof-phone').value;
        const zipcode = document.getElementById('prof-zipcode').value;
        const address = document.getElementById('prof-address').value;
        const city = document.getElementById('prof-city').value;

        btnSubmit.classList.add('btn-loading');
        btnSubmit.disabled = true;

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            showDialog("Erro de Acesso", "Você foi deslogado. Relogue e tente novamente.", true);
            return;
        }

        try {
            const { error } = await supabase.from('profiles').update({
                full_name,
                phone,
                zipcode,
                address,
                city
            }).eq('id', session.user.id);

            if (error) throw error;

            showDialog("Sucesso", "Suas informações foram atualizadas com sucesso!", false);

            // Re-update dashboard name
            const dashName = document.getElementById('dash-user-name');
            if (dashName) dashName.textContent = full_name;

        } catch (err) {
            console.error("Update profile error", err);
            showDialog("Erro ao Salvar", "Não foi possível atualizar: " + err.message, true);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('btn-loading');
        }
    });
}

// Paginação de Usuários Admin
let adminUsersData = [];
let adminUsersPage = 1;
const ADMIN_USERS_PER_PAGE = 10;

function renderAdminUsersTable() {
    const tableBody = document.getElementById('admin-users-table');
    if (!tableBody) return;

    if (!adminUsersData || adminUsersData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">Nenhum usuário encontrado.</td></tr>';
        const paginationContainer = document.getElementById('admin-users-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(adminUsersData.length / ADMIN_USERS_PER_PAGE);
    if (adminUsersPage > totalPages) adminUsersPage = totalPages;
    if (adminUsersPage < 1) adminUsersPage = 1;

    const startIdx = (adminUsersPage - 1) * ADMIN_USERS_PER_PAGE;
    const endIdx = startIdx + ADMIN_USERS_PER_PAGE;
    const paginatedItems = adminUsersData.slice(startIdx, endIdx);

    tableBody.innerHTML = '';

    paginatedItems.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'admin-product-row border-b border-[hsl(var(--text-secondary)/0.1)]';

        const addressDisplay = user.address
            ? `${user.address}${user.zipcode ? `, CEP: ${user.zipcode}` : ''}${user.city ? ` - ${user.city}` : ''}`
            : '<span class="text-muted/50">Não informado</span>';

        const roleLabel = user.role === 'administrador'
            ? '<span class="product-tag static bg-[hsl(var(--text-primary))] text-[hsl(var(--bg-primary))]">Admin</span>'
            : (user.role === 'vendedor' ? '<span class="product-tag static bg-[hsl(var(--accent-color))] text-white">Vendedor</span>' : 'Comprador');

        row.innerHTML = `
            <td data-label="Nome do Cliente" class="py-[0.8rem] font-semibold">${user.full_name}</td>
            <td data-label="Telefone" class="py-[0.8rem]">${user.phone || ' - '}</td>
            <td data-label="Endereço Completo" class="py-[0.8rem] text-[0.9rem] max-w-[300px]">${addressDisplay}</td>
            <td data-label="Tipo" class="py-[0.8rem]">${roleLabel}</td>
        `;
        tableBody.appendChild(row);
    });

    let paginationContainer = document.getElementById('admin-users-pagination');
    if (!paginationContainer) {
        const tableWrapper = tableBody.closest('.overflow-x-auto');
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin-users-pagination';
        paginationContainer.className = 'flex justify-between items-center p-4 border-t border-border-dynamic/30';
        tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }

    paginationContainer.innerHTML = `
        <span class="text-[0.85rem] text-muted">Página ${adminUsersPage} de ${totalPages} (Total: ${adminUsersData.length})</span>
        <div class="flex gap-2">
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminUsersPage(-1)" ${adminUsersPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Anterior</button>
            <button class="btn btn-outline btn-sm px-3 py-1 text-[0.8rem]" onclick="window.changeAdminUsersPage(1)" ${adminUsersPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Próxima</button>
        </div>
    `;
}

window.changeAdminUsersPage = function (direction) {
    adminUsersPage += direction;
    renderAdminUsersTable();
};

export async function loadAdminUsers() {
    const tableBody = document.getElementById('admin-users-table');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Carregando usuários...</td></tr>';

    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        if (!users || users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        adminUsersData = users || [];
        adminUsersPage = 1;
        renderAdminUsersTable();

    } catch (err) {
        console.error("Erro ao carregar usuários admin:", err);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 p-4">Erro ao buscar dados. Tente novamente.</td></tr>';
    }
}
