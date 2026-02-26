import { supabase } from './lib/supabase.js';

export async function renderAdminCharts() {
    try {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const textColor = isDark ? '#a59cba' : '#64748b';
        const primaryColor = 'hsl(258, 90%, 66%)';

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
                background: 'transparent'
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
                background: 'transparent'
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
            // Traz todos os itens vendidos junto com os dados do produto (para ler o departamento)
            const { data: orderItems, error: itemsErr } = await supabase
                .from('order_items')
                .select(`
                    quantity,
                    products ( department )
                `);

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

        // Se falhou ou nao teve vendas, mostra um fallback visual bonitinho
        if (dynamicProductsSeries.length === 0) {
            dynamicProductsLabels = ['Sem Vendas', 'Estoque Parado'];
            dynamicProductsSeries = [1, 1];
        }

        // Sobrescreve as series mockadas pelas reais
        optionsProdutos.labels = dynamicProductsLabels;
        optionsProdutos.series = dynamicProductsSeries;

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
        }, 100);
    } catch (err) {
        console.error("Erro renderizando graficos: ", err);
    }
}
