// public/js/dashboard/charts.js

let performanceChart = null;

window.renderPerformanceChart = (data) => {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    if (performanceChart) performanceChart.destroy();

    performanceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: 'Besucher Gesamt',
                data: data.views,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true,
                borderWidth: 2
            }, {
                label: 'Merkliste Gesamt',
                data: data.favs,
                borderColor: '#f59e0b',
                backgroundColor: 'transparent',
                tension: 0.3,
                borderWidth: 2,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#999', font: { family: 'Outfit' } } },
                tooltip: { 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    titleColor: '#fff', 
                    bodyColor: '#ccc',
                    borderColor: '#333',
                    borderWidth: 1
                }
            },
            scales: {
                y: { 
                    grid: { color: '#222' }, 
                    ticks: { color: '#666', font: { family: 'Outfit' } } 
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#666', font: { family: 'Outfit' } } 
                }
            }
        }
    });
};