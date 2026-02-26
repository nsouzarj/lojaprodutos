import { supabase } from '../lib/supabase.js';
import { loadMyOrders } from './orders.js';
import { showDialog } from '../ui/dialog.js';
import { loadUserProfile } from './profile.js';
import { renderProducts } from './products.js';

export let cart = [];

export function addToCart(product) {
    const existingItem = cart.find(item => item.product.id === product.id);
    const quantityInCart = existingItem ? existingItem.quantity : 0;

    // REGRA DE NEGÓCIO: Verificação de Estoque Real
    if (product.stock <= 0) {
        showDialog("Esgotado", `Lamentamos, mas o produto "${product.name}" não possui mais unidades em estoque no momento.`, true);
        return;
    }

    if (quantityInCart + 1 > product.stock) {
        showDialog("Estoque Insuficiente", `Você já adicionou o limite máximo disponível (${product.stock} un.) para o produto "${product.name}".`, true);
        return;
    }

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ product, quantity: 1 });
    }

    const btnCartBadge = document.querySelector('.cart-badge');
    if (btnCartBadge) {
        btnCartBadge.classList.add('pulse');
        setTimeout(() => btnCartBadge.classList.remove('pulse'), 300);
    }

    updateCartUI();
}

export function removeFromCart(productId, removeAll = false) {
    const itemIndex = cart.findIndex(item => item.product.id === productId);
    if (itemIndex > -1) {
        if (removeAll || cart[itemIndex].quantity === 1) {
            cart.splice(itemIndex, 1);
        } else {
            cart[itemIndex].quantity -= 1;
        }
        updateCartUI();
    }
}

export function updateCartUI() {
    const cartContainer = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');
    const badgeEl = document.querySelector('.cart-badge');

    if (!cartContainer || !totalPriceEl) return;

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (badgeEl) badgeEl.textContent = totalItems;

    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
        totalPriceEl.textContent = 'R$ 0,00';
        return;
    }

    let totalValue = 0;

    cart.forEach(item => {
        totalValue += (item.product.price * item.quantity);

        const currentPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity);
        const imgUrlStr = item.product.image_url || item.product.image || '';
        const mainImg = imgUrlStr.split(',')[0] || 'https://placehold.co/400x400/f8fafc/94a3b8?text=Sem+Foto';

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
      <div class="cart-item-img" style="background-image: url('${mainImg}')"></div>
      <div class="cart-item-details">
         <h4>${item.product.name}</h4>
         <p>${currentPrice}</p>
         <div class="cart-qty-ctrl">
            <button class="qty-btn btn-minus" data-id="${item.product.id}">-</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn btn-plus" data-id="${item.product.id}">+</button>
         </div>
      </div>
      <button class="cart-item-remove" data-id="${item.product.id}" aria-label="Remover do Carrinho">✕</button>
    `;

        cartContainer.appendChild(itemEl);
    });

    cartContainer.querySelectorAll('.btn-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const foundItem = cart.find(c => String(c.product.id) === String(id));
            if (foundItem) addToCart(foundItem.product);
        });
    });

    cartContainer.querySelectorAll('.btn-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeFromCart(id, false);
        });
    });

    cartContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeFromCart(id, true);
        });
    });

    totalPriceEl.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue);
}

export function setupCart() {
    const btnCart = document.getElementById('btn-cart');
    const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
    const btnCloseCart = document.getElementById('btn-close-cart');

    if (btnCart && cartDrawerOverlay) {
        btnCart.addEventListener('click', (e) => {
            e.preventDefault();
            cartDrawerOverlay.classList.add('active');
        });
    }

    if (btnCloseCart && cartDrawerOverlay) {
        btnCloseCart.addEventListener('click', () => {
            cartDrawerOverlay.classList.remove('active');
        });

        cartDrawerOverlay.addEventListener('click', (e) => {
            if (e.target === cartDrawerOverlay) {
                cartDrawerOverlay.classList.remove('active');
            }
        });
    }

    const btnCheckout = document.getElementById('btn-checkout');
    const checkoutModal = document.getElementById('checkout-modal');
    const btnCloseCheckout = document.getElementById('btn-close-checkout');
    const paymentMethodSelect = document.getElementById('payment-method');
    const btnConfirmPayment = document.getElementById('btn-confirm-payment');

    if (checkoutModal && btnCloseCheckout) {
        btnCloseCheckout.addEventListener('click', () => checkoutModal.classList.remove('active'));
    }

    if (checkoutModal) {
        checkoutModal.addEventListener('click', (e) => {
            if (e.target === checkoutModal) checkoutModal.classList.remove('active');
        });
    }

    // Alternar campos de pagamento e atualizar valor cobrado
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('credit-card-details').style.display = 'none';
            document.getElementById('pix-details').style.display = 'none';
            document.getElementById('boleto-details').style.display = 'none';

            if (val === 'cartao_credito') document.getElementById('credit-card-details').style.display = 'block';
            if (val === 'pix') document.getElementById('pix-details').style.display = 'block';
            if (val === 'boleto') document.getElementById('boleto-details').style.display = 'block';

            // Atualiza o display real do Header The Checkout Baseado no Preço PIX x Preço Cartão
            const totalPix = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
            const totalCredit = cart.reduce((acc, item) => acc + ((item.product.credit_price || item.product.price) * item.quantity), 0);

            const totalToPay = (val === 'cartao_credito') ? totalCredit : totalPix;
            document.getElementById('checkout-total-price').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalToPay);
        });
    }

    // Máscara pro CEP no modal de carrinho
    const checkoutZip = document.getElementById('checkout-zipcode');
    if (checkoutZip) {
        checkoutZip.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,5})(\d{0,3})/);
            e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
        });
    }

    // Máscaras de Cartão de Crédito
    const ccNum = document.getElementById('cc-number');
    if (ccNum) ccNum.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : `${x[1]} ${x[2]}` + (x[3] ? ` ${x[3]}` : '') + (x[4] ? ` ${x[4]}` : '');
    });

    const ccVal = document.getElementById('cc-validity');
    if (ccVal) ccVal.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,2})/);
        e.target.value = !x[2] ? x[1] : `${x[1]}/${x[2]}`;
    });

    const ccCvv = document.getElementById('cc-cvv');
    if (ccCvv) ccCvv.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // Botão Principal do Carrinho, apenas ABRIR O MODAL
    if (btnCheckout && checkoutModal) {
        btnCheckout.addEventListener('click', async () => {
            if (cart.length === 0) {
                cartDrawerOverlay.classList.remove('active');
                showDialog("Carrinho Vazio", "Opa! Seu carrinho está vazio pra gente processar uma Venda.", true);
                return;
            }

            // Checa Usuário Logado
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                showDialog("Restrito", "Você precisa fazer Login antes de finalizar a compra!", true);
                cartDrawerOverlay.classList.remove('active');

                // Abre aba de login
                const btnLogin = document.getElementById('btn-login');
                if (btnLogin) btnLogin.click();
                return;
            }

            // Exibir Valor Total Formatado no Modal (Leva em conta primeira seleção = cartao_credito)
            const isCreditFirst = paymentMethodSelect.value === 'cartao_credito';
            const totalPixValue = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
            const totalCreditValue = cart.reduce((acc, item) => acc + ((item.product.credit_price || item.product.price) * item.quantity), 0);

            const firstActiveValue = isCreditFirst ? totalCreditValue : totalPixValue;
            document.getElementById('checkout-total-price').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(firstActiveValue);

            // Nova Regra de Parcelamento:
            // - 1 unidade (produto único): limite igual ao cadastro do produto
            // - 2 ou mais unidades (independente de ser 1 ou mais tipos de produto): limite de até 12x
            const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
            let maxInstallmentsAllowed = (totalItemsCount >= 2) ? 12 : (cart[0].product.installments || 1);

            let collectedBrands = new Set();

            cart.forEach(item => {
                if (item.product.card_brands) {
                    item.product.card_brands.split(',').forEach(b => collectedBrands.add(b.trim()));
                }
            });

            const selectInstalments = document.getElementById('cc-installments');
            selectInstalments.innerHTML = '';
            for (let i = 1; i <= maxInstallmentsAllowed; i++) {
                const instalmentValue = totalCreditValue / i;
                const formattedInst = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(instalmentValue);
                const desc = i === 1 ? '1x (À vista)' : `${i}x de ${formattedInst} sem juros`;
                selectInstalments.innerHTML += `<option value="${i}">${desc}</option>`;
            }

            const ccBrandsEl = document.getElementById('cc-allowed-brands');
            if (ccBrandsEl) {
                ccBrandsEl.textContent = Array.from(collectedBrands).join(', ') || 'Nenhuma restrição';
            }

            // Auto-Preenchimento Se Houver Endereço Salvo no Perfil
            const profile = await loadUserProfile();
            if (profile) {
                document.getElementById('checkout-zipcode').value = profile.zipcode || '';
                document.getElementById('checkout-address').value = profile.address || '';
                document.getElementById('checkout-city').value = profile.city || '';
            }

            cartDrawerOverlay.classList.remove('active');
            checkoutModal.classList.add('active');
        });
    }

    // O Verdadeiro Processamento Financeiro
    if (btnConfirmPayment) {
        btnConfirmPayment.addEventListener('click', async () => {
            btnConfirmPayment.classList.add('btn-loading');
            btnConfirmPayment.disabled = true;

            const { data: { session } } = await supabase.auth.getSession();
            const method = document.getElementById('payment-method').value;

            const totalPix = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
            const totalCredit = cart.reduce((acc, item) => acc + ((item.product.credit_price || item.product.price) * item.quantity), 0);
            const finalComputedValue = method === 'cartao_credito' ? totalCredit : totalPix;

            const zip = document.getElementById('checkout-zipcode').value;
            const address = document.getElementById('checkout-address').value;
            const city = document.getElementById('checkout-city').value;

            if (!zip || !address || !city) {
                showDialog("Endereço Incompleto", "Por favor, preencha todos os campos do endereço de entrega.", true);
                btnConfirmPayment.disabled = false;
                btnConfirmPayment.classList.remove('btn-loading');
                return;
            }

            const fullAddress = `CEP: ${zip} | ${address} | ${city}`;

            try {
                // 1. Gera o Pedido Principal, injetando status dinâmico com base no método falso aprovado
                let finalStatus = 'pendente';
                if (method === 'cartao_credito') finalStatus = 'pago'; // Se for cartão, mockamos como aprovado de imeadiato :)
                if (method === 'pix') finalStatus = 'enviado'; // PIX despacha na hora, conforme solicitado pelo lojista

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert([{
                        user_id: session.user.id,
                        total: finalComputedValue,
                        status: finalStatus,
                        payment_method: method,
                        delivery_address: fullAddress
                    }])
                    .select()
                    .single();

                if (orderError) throw orderError;

                // 2. Amarramos os Produtos Específicos do Carrinho
                const orderItems = cart.map(item => ({
                    order_id: orderData.id,
                    product_id: item.product.id,
                    quantity: item.quantity,
                    price_at_time: item.product.price
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItems);

                if (itemsError) throw itemsError;

                // 3. ATUALIZAÇÃO DE ESTOQUE (Baixa Automática com Saldo Atualizado)
                for (const item of cart) {
                    // Busca o estoque MAIS RECENTE do banco de dados (evita usar o cache do carrinho)
                    const { data: p } = await supabase
                        .from('products')
                        .select('stock')
                        .eq('id', item.product.id)
                        .single();

                    if (p) {
                        const newStock = Math.max(0, p.stock - item.quantity);
                        await supabase
                            .from('products')
                            .update({ stock: newStock })
                            .eq('id', item.product.id);

                        // REGISTRO DE HISTÓRICO
                        await supabase.from('stock_movements').insert([{
                            product_id: item.product.id,
                            quantity: -item.quantity, // Negativo pois é saída
                            type: 'VENDA',
                            previous_stock: p.stock,
                            current_stock: newStock,
                            order_id: orderData.id,
                            user_id: session.user.id
                        }]);
                    }
                }

                showDialog("Compra Finalizada! 🎉", "Obrigado! Seu pedido de número #" + orderData.id.split('-')[0] + " foi processado com sucesso!");

                // Trato Front e Encerramento
                cart.length = 0;
                updateCartUI();
                renderProducts(); // Atualiza a vitrine para mostrar se esgotou
                loadMyOrders(); // Recarrega Painel
                checkoutModal.classList.remove('active');

                // Abre miniatura aba minhs compras
                const btnPanel = document.getElementById('btn-login');
                if (btnPanel && finalStatus === 'pago') btnPanel.click();

            } catch (err) {
                console.error("Erro na Venda: ", err);
                showDialog("Ops, Erro de Faturamento ❌", "Ocorreu um erro interno: " + err.message, true);
            } finally {
                btnConfirmPayment.disabled = false;
                btnConfirmPayment.classList.remove('btn-loading');
            }
        });
    }

    updateCartUI();
}
