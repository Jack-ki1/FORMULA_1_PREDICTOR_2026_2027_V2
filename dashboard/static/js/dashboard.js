// Dashboard JavaScript for F1 Predictor 2026

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initDashboard();
});

function initDashboard() {
    // Target button selection
    const targetButtons = document.querySelectorAll('.target-btn');
    targetButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            targetButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Predict button
    const predictBtn = document.getElementById('predict-btn');
    if (predictBtn) {
        predictBtn.addEventListener('click', generatePredictions);
    }
    
    // Load races on page load
    loadRaces();
}

async function loadRaces() {
    try {
        const races = await fetchAPI('/dashboard/api/races');
        const raceSelect = document.getElementById('race-select');
        
        if (races && raceSelect) {
            // Clear existing options except the first one
            while (raceSelect.options.length > 1) {
                raceSelect.remove(1);
            }
            
            // Add race options
            races.forEach(race => {
                const option = document.createElement('option');
                option.value = race.id;
                option.textContent = `${race.name} (${race.date})`;
                raceSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading races:', error);
    }
}

async function generatePredictions() {
    const raceId = document.getElementById('race-select').value;
    const sessionType = document.getElementById('session-select').value;
    const weather = document.getElementById('weather-select').value;
    const activeTarget = document.querySelector('.target-btn.active');
    const targetId = activeTarget ? activeTarget.dataset.target : 'podium';
    
    if (!raceId) {
        alert('Please select a race');
        return;
    }
    
    const container = document.getElementById('predictions-container');
    container.innerHTML = '<p class="loading">Generating predictions...</p>';
    
    try {
        const result = await fetchAPI('/dashboard/api/predict', {
            method: 'POST',
            body: JSON.stringify({
                race_id: raceId,
                target_id: targetId,
                session_type: sessionType,
                weather: weather,
            }),
        });
        
        if (result.error) {
            container.innerHTML = `<p class="error">${result.error}</p>`;
        } else {
            displayPredictions(result);
        }
    } catch (error) {
        container.innerHTML = `<p class="error">Error generating predictions: ${error.message}</p>`;
    }
}

function displayPredictions(result) {
    const container = document.getElementById('predictions-container');
    
    if (!result.predictions || result.predictions.length === 0) {
        container.innerHTML = '<p class="placeholder">No predictions available</p>';
        return;
    }
    
    let html = '<div class="predictions-list">';
    
    result.predictions.forEach((prediction, index) => {
        const driverCode = prediction.driver_code;
        const probability = prediction.probability;
        const percentage = (probability * 100).toFixed(1);
        
        // Add purple pick badge for top prediction
        const badge = index === 0 ? '<span class="purple-pick">TOP PICK</span>' : '';
        
        html += `
            <div class="prediction-item ${index === 0 ? 'top-prediction' : ''}">
                <div class="prediction-header">
                    <span class="driver-code">${driverCode}</span>
                    ${badge}
                </div>
                <div class="prediction-bar">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="prediction-percentage">${percentage}%</div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add confidence score
    if (result.confidence !== undefined) {
        html += `
            <div class="confidence-section">
                <h3>Confidence Score</h3>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${result.confidence * 100}%"></div>
                </div>
                <p class="confidence-value">${(result.confidence * 100).toFixed(1)}%</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}
