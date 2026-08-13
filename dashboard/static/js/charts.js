// Chart.js wiring for F1 Predictor 2026
// This handles the JS equivalent of the JSX's Recharts layer

// Initialize Chart.js instances
let charts = {};

// Create a bar chart
function createBarChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };
    
    const config = {
        type: 'bar',
        data: data,
        options: { ...defaultOptions, ...options }
    };
    
    // Chart.js would be loaded here
    // charts[canvasId] = new Chart(ctx, config);
    
    return config;
}

// Create a line chart
function createLineChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };
    
    const config = {
        type: 'line',
        data: data,
        options: { ...defaultOptions, ...options }
    };
    
    // charts[canvasId] = new Chart(ctx, config);
    
    return config;
}

// Create a pie chart
function createPieChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'right'
            }
        }
    };
    
    const config = {
        type: 'pie',
        data: data,
        options: { ...defaultOptions, ...options }
    };
    
    // charts[canvasId] = new Chart(ctx, config);
    
    return config;
}

// Destroy a chart
function destroyChart(canvasId) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        delete charts[canvasId];
    }
}

// Update chart data
function updateChart(canvasId, newData) {
    if (charts[canvasId]) {
        charts[canvasId].data = newData;
        charts[canvasId].update();
    }
}

// Export chart as image
function exportChartAsImage(canvasId, filename = 'chart.png') {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}
