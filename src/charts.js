import { supabase } from './lib/supabase.js';

export async function renderAdminCharts() {
    try {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const textColor = isDark ? '#a59cba' : '#64748b';
        const primaryColor = 'hsl(258, 90%, 66%)';

        // Locales do ApexCharts para pt-br
        const ptbrLocale = {
            name: 'pt-br',
            options: {
                months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                shortMonths: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                days: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                shortDays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                toolbar: {
                    download: 'Baixar SVG',
                    selection: 'Seleção',
                    selectionZoom: 'Zoom de Seleção',
                    zoomIn: 'Aumentar Zoom',
                    zoomOut: 'Diminuir Zoom',
                    pan: 'Mover',
                    reset: 'Zerar Zoom',
                }
            }
        };

        // Config do Gráfico de Receita (Linha Curvada)
        const optionsReceita = {
            series: [{
                name: 'Faturamento',
                data: [310, 400, 280, 510, 420, 1090, 1000]
            }],
            chart: {
                height: 256,
                type: 'area', // Area curve
                fontFamily: 'Outfit, sans-serif',
                toolbar: { show: false },
                background: 'transparent',
                locales: [ptbrLocale],
                defaultLocale: 'pt-br'
            },
            theme: {
                mode: isDark ? 'dark' : 'light'
            },
            colors: [primaryColor],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
            },
            xaxis: {
                categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: { style: { colors: textColor }, formatter: (val) => "R$ " + val }
            },
            grid: {
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                strokeDashArray: 4
            }
        };

        // Config do Gráfico de Produtos (Donut/Pizza)
        const optionsProdutos = {
            series: [44, 55, 13, 33],
            labels: ['Cabelo', 'Pele', 'Maquiagem', 'Acessórios'],
            chart: {
                type: 'donut',
                height: 256,
                fontFamily: 'Outfit, sans-serif',
                background: 'transparent',
                locales: [ptbrLocale],
                defaultLocale: 'pt-br'
            },
            theme: { mode: isDark ? 'dark' : 'light' },
            colors: [primaryColor, '#FF3366', '#00E396', '#FEB019'],
            stroke: { show: false },
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            name: { color: textColor },
                            value: { color: isDark ? '#fff' : '#000', fontSize: '24px', fontWeight: 'bold' }
                        }
                    }
                }
            },
            dataLabels: { enabled: false },
            legend: {
                position: 'bottom',
                labels: { colors: textColor }
            }
        };

        const containerReceita = document.querySelector("#chart-receita");
        const containerProdutos = document.querySelector("#chart-produtos");

        // BUSCA DADOS REAIS DO BANCO PARA O GRÁFICO DE PIZZA (PRODUTOS / DEPARTAMENTOS)
        let dynamicProductsLabels = [];
        let dynamicProductsSeries = [];

        try {
            // Traz apenas itens vendidos de pedidos que EFETIVAMENTE foram pagos/concluídos
            const { data: orderItems, error: itemsErr } = await supabase
                .from('order_items')
                .select(`
                    quantity,
                    products ( department ),
                    orders!inner ( status )
                `)
                .in('orders.status', ['pago', 'enviado', 'entregue']);

            if (!itemsErr && orderItems) {
                // Agrupa as quantidades por departamento
                const deptCounts = {};
                orderItems.forEach(item => {
                    if (item.products && item.products.department) {
                        const dept = item.products.department;
                        deptCounts[dept] = (deptCounts[dept] || 0) + item.quantity;
                    }
                });

                // Converte em Arrays para o ApexCharts
                for (const [dept, qty] of Object.entries(deptCounts)) {
                    // Capitaliza primeira letra do departamento
                    const capitalizedDept = dept.charAt(0).toUpperCase() + dept.slice(1);
                    dynamicProductsLabels.push(capitalizedDept);
                    dynamicProductsSeries.push(qty);
                }
            }
        } catch (e) {
            console.warn("Nao foi possivel carregar dados reais pro grafico de pizza:", e);
        }

        // BUSCA DADOS REAIS DE FATURAMENTO NOS ÚLTIMOS 7 DIAS
        let faturamentoData = [0, 0, 0, 0, 0, 0, 0];
        let faturamentoCategorias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']; // Fallback

        try {
            const today = new Date();
            const last7Days = [];
            faturamentoCategorias = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                last7Days.push(d);
                let diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).split(',')[0];
                faturamentoCategorias.push(diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).replace('.', ''));
            }

            const startDate = new Date(last7Days[0]);
            startDate.setHours(0, 0, 0, 0);

            const { data: salesData } = await supabase
                .from('orders')
                .select('total, created_at')
                .gte('created_at', startDate.toISOString())
                .neq('status', 'cancelado');

            if (salesData) {
                salesData.forEach(sale => {
                    const saleDate = new Date(sale.created_at);
                    const index = last7Days.findIndex(d => d.getDate() === saleDate.getDate() && d.getMonth() === saleDate.getMonth());
                    if (index !== -1) {
                        faturamentoData[index] += parseFloat(sale.total);
                    }
                });
            }
        } catch (e) {
            console.warn("Erro ao buscar dados reais de faturamento", e);
        }

        // Atualiza o gráfico de receitas com os dias calculados
        optionsReceita.series[0].data = faturamentoData;
        optionsReceita.xaxis.categories = faturamentoCategorias;

        // Se falhou ou nao teve vendas, mostra um fallback visual bonitinho
        if (dynamicProductsSeries.length === 0) {
            dynamicProductsLabels = ['Sem Vendas', 'Estoque Parado'];
            dynamicProductsSeries = [1, 1];
        }

        // Sobrescreve as series mockadas pelas reais
        optionsProdutos.labels = dynamicProductsLabels;
        optionsProdutos.series = dynamicProductsSeries;

        // Configuração do Gráfico de Vendas vs Compras (Barras Agrupadas)
        const initBarChart = () => {
            return {
                series: [{
                    name: 'Vendas (Receita)',
                    data: [0, 0, 0, 0]
                }, {
                    name: 'Compras (Reposição)',
                    data: [0, 0, 0, 0]
                }],
                chart: {
                    type: 'bar',
                    height: 350,
                    fontFamily: 'Outfit, sans-serif',
                    toolbar: { show: true }, // Ativado para quem quiser Baixar
                    background: 'transparent',
                    locales: [ptbrLocale],
                    defaultLocale: 'pt-br'
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                colors: [primaryColor, '#FF3366'],
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        endingShape: 'rounded'
                    },
                },
                dataLabels: { enabled: false },
                stroke: { show: true, width: 2, colors: ['transparent'] },
                xaxis: {
                    categories: ['Vestuário', 'Cosméticos', 'Acessórios', 'Perfumaria'],
                    labels: { style: { colors: textColor } }
                },
                yaxis: {
                    labels: { style: { colors: textColor }, formatter: (val) => "R$ " + val.toFixed(2) }
                },
                fill: { opacity: 1 },
                tooltip: {
                    theme: isDark ? 'dark' : 'light',
                    y: { formatter: function (val) { return "R$ " + val.toFixed(2) } }
                },
                grid: {
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    strokeDashArray: 4
                },
                legend: { labels: { colors: textColor } }
            };
        };

        let optionsVendasCompras = initBarChart();
        const containerVendasCompras = document.querySelector("#chart-vendas-compras");
        let chartVendasComprasInfo = null;

        // Função para carregar os dados do gráfico Vendas vs Compras
        const loadVendasComprasData = async (startDate, endDate) => {
            if (!containerVendasCompras) return;

            try {
                // Configuração base (X-axis e totalizadores)
                const deptCategories = ['Vestuario', 'Cosmeticos', 'Acessorios', 'Perfumaria']; // Baseado nas constraints do banco
                let vendasTotais = { 'vestuario': 0, 'cosmeticos': 0, 'acessorios': 0, 'perfumaria': 0 };
                let comprasTotais = { 'vestuario': 0, 'cosmeticos': 0, 'acessorios': 0, 'perfumaria': 0 };

                // 1. Busca VENDAS no período selecionado
                // Usando orders e order_items através de join no select
                const { data: salesData, error: salesErr } = await supabase
                    .from('order_items')
                    .select(`
                        quantity,
                        price_at_time,
                        products ( department ),
                        orders!inner ( status, created_at )
                    `)
                    .in('orders.status', ['pago', 'enviado', 'entregue'])
                    .gte('orders.created_at', startDate.toISOString())
                    .lte('orders.created_at', endDate.toISOString());

                if (!salesErr && salesData) {
                    salesData.forEach(item => {
                        let dept = item.products?.department?.toLowerCase() || '';
                        // Normalização para Cosméticos devido a acentos que possam vir do BD
                        if (dept === 'cosmeticos' || dept === 'cosméticos') dept = 'cosmeticos';

                        const revenue = item.quantity * parseFloat(item.price_at_time);
                        if (vendasTotais.hasOwnProperty(dept)) {
                            vendasTotais[dept] += revenue;
                        }
                    });
                }

                // 2. Busca COMPRAS (Reposições) no período
                const { data: purchasesData, error: purchErr } = await supabase
                    .from('stock_movements')
                    .select(`
                        quantity,
                        type,
                        created_at,
                        products ( department, cost_price )
                    `)
                    .eq('type', 'ENTRADA_REPOSICAO')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString());

                if (!purchErr && purchasesData) {
                    purchasesData.forEach(mov => {
                        let dept = mov.products?.department?.toLowerCase() || '';
                        if (dept === 'cosmeticos' || dept === 'cosméticos') dept = 'cosmeticos';

                        // Custo = Quantidade da Reposição * Preço de Custo atual
                        const costPrice = parseFloat(mov.products?.cost_price || 0);
                        const expense = mov.quantity * costPrice;

                        if (comprasTotais.hasOwnProperty(dept)) {
                            comprasTotais[dept] += expense;
                        }
                    });
                }

                // Atualizar Séries do Gráfico
                const vendasSeries = [vendasTotais['vestuario'], vendasTotais['cosmeticos'], vendasTotais['acessorios'], vendasTotais['perfumaria']];
                const comprasSeries = [comprasTotais['vestuario'], comprasTotais['cosmeticos'], comprasTotais['acessorios'], comprasTotais['perfumaria']];

                chartVendasComprasInfo.updateSeries([
                    { name: 'Vendas (Receita)', data: vendasSeries },
                    { name: 'Compras (Reposição)', data: comprasSeries }
                ]);

            } catch (error) {
                console.error("Erro ao carregar dados do grafico Vendas vs Compras:", error);

                // Em caso de erro, tenta desenhar tudo zerado só pra nao travar tela
                if (chartVendasComprasInfo) {
                    chartVendasComprasInfo.updateSeries([
                        { name: 'Vendas (Receita)', data: [0, 0, 0, 0] },
                        { name: 'Compras (Reposição)', data: [0, 0, 0, 0] }
                    ]);
                }
            }
        };

        // Date utils para semanas
        const getWeekRange = (dateString = null) => {
            // Se dateString for o valor de um input type="week" (ex: "2026-W10")
            let today = new Date();
            if (dateString) {
                const parts = dateString.split('-W');
                const year = parseInt(parts[0], 10);
                const week = parseInt(parts[1], 10);
                // Calcula início da semana usando data auxiliar (Aprox: considerando ISO week)
                const simple = new Date(year, 0, 1 + (week - 1) * 7);
                const dow = simple.getDay();
                const ISOweekStart = simple;
                if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
                else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

                today = ISOweekStart;
            }

            const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
            const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start

            const monday = new Date(today.setDate(diffToMonday));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            return { start: monday, end: sunday };
        };

        // Small timeout to allow DOM to finish painting the `display: block`
        setTimeout(() => {
            if (containerReceita && typeof ApexCharts !== 'undefined') {
                containerReceita.innerHTML = '';
                const chartReceita = new ApexCharts(containerReceita, optionsReceita);
                chartReceita.render();
            } else {
                console.warn("Container Receita ou ApexCharts nao encontrados");
            }

            if (containerProdutos && typeof ApexCharts !== 'undefined') {
                containerProdutos.innerHTML = '';
                const chartProdutos = new ApexCharts(containerProdutos, optionsProdutos);
                chartProdutos.render();
            } else {
                console.warn("Container Produtos ou ApexCharts nao encontrados");
            }

            if (containerVendasCompras && typeof ApexCharts !== 'undefined') {
                containerVendasCompras.innerHTML = '';
                chartVendasComprasInfo = new ApexCharts(containerVendasCompras, optionsVendasCompras);
                chartVendasComprasInfo.render().then(() => {
                    // Carrega os dados da semana atual ao iniciar
                    const { start, end } = getWeekRange();
                    loadVendasComprasData(start, end);

                    // Configura o select no DOM pra mostrar as últimas 12 semanas em Português
                    const weekInput = document.getElementById('chart-week-filter');
                    if (weekInput) {
                        weekInput.innerHTML = '';
                        const current = new Date();

                        for (let i = 0; i < 12; i++) {
                            const dateStr = new Date(current);
                            dateStr.setDate(current.getDate() - (i * 7));

                            // Calcula ISO week aproximada para o option value
                            const target = new Date(dateStr.valueOf());
                            const dayNr = (dateStr.getDay() + 6) % 7;
                            target.setDate(target.getDate() - dayNr + 3);
                            const firstThursday = target.valueOf();
                            target.setMonth(0, 1);
                            if (target.getDay() !== 4) {
                                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                            }
                            const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
                            const year = target.getFullYear();

                            const value = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
                            let label = `Semana ${weekNumber} de ${year}`;

                            if (i === 0) label = "Esta Semana";
                            else if (i === 1) label = "Semana Passada";

                            const option = document.createElement('option');
                            option.value = value;
                            option.textContent = label;
                            weekInput.appendChild(option);
                        }

                        // Seleciona "Esta Semana" por padrão
                        weekInput.value = weekInput.options[0].value;

                        // Remove listeners antigos se houver
                        const newWeekInput = weekInput.cloneNode(true);
                        weekInput.parentNode.replaceChild(newWeekInput, weekInput);

                        newWeekInput.addEventListener('change', (e) => {
                            if (e.target.value) {
                                const { start, end } = getWeekRange(e.target.value);
                                loadVendasComprasData(start, end);
                            }
                        });
                    }
                });
            }
        }, 100);
    } catch (err) {
        console.error("Erro renderizando graficos: ", err);
    }
}
