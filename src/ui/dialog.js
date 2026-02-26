export function showDialog(title, message, isError = false, onConfirm = null) {
    const dialogModal = document.getElementById('global-dialog-modal');
    if (!dialogModal) return;

    const dialogTitle = document.getElementById('global-dialog-title');
    const dialogMsg = document.getElementById('global-dialog-msg');
    const dialogIcon = document.getElementById('global-dialog-icon');
    const btnOk = document.getElementById('global-dialog-ok');
    const btnCancel = document.getElementById('global-dialog-cancel');

    // Personaliza a Cor/Ícone de Sucesso vs Erro
    if (isError) {
        dialogIcon.textContent = '❌';
        dialogIcon.style.color = 'var(--accent)';
    } else {
        dialogIcon.textContent = '✅';
        dialogIcon.style.color = 'var(--primary)';
    }

    dialogTitle.textContent = title;
    dialogMsg.textContent = message;

    // Se houver callback de confirmação, mostra botão cancelar
    if (onConfirm) {
        btnCancel.style.display = 'block';
        btnOk.textContent = 'Confirmar';
    } else {
        btnCancel.style.display = 'none';
        btnOk.textContent = 'Entendido';
    }

    dialogModal.style.display = 'flex';
    setTimeout(() => dialogModal.classList.add('active'), 10);

    const closeModal = () => {
        dialogModal.classList.remove('active');
        setTimeout(() => {
            dialogModal.style.display = 'none';
        }, 300);
    };

    btnOk.onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };

    btnCancel.onclick = closeModal;
}
