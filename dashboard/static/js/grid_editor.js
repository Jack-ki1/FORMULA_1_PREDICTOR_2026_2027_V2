// Manual grid editor widget - mirrors ManualGridEditor from JSX

class GridEditor {
    constructor(containerId, onSave) {
        this.container = document.getElementById(containerId);
        this.onSave = onSave;
        this.gridPositions = {};
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="grid-editor">
                <h3>Manual Grid Override</h3>
                <div class="grid-inputs" id="grid-inputs"></div>
                <div class="grid-actions">
                    <button id="auto-fill-btn" class="btn btn-secondary">Auto Fill</button>
                    <button id="save-grid-btn" class="btn btn-primary">Save Grid</button>
                    <button id="reset-grid-btn" class="btn btn-secondary">Reset</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('auto-fill-btn').addEventListener('click', () => this.autoFill());
        document.getElementById('save-grid-btn').addEventListener('click', () => this.saveGrid());
        document.getElementById('reset-grid-btn').addEventListener('click', () => this.resetGrid());
        
        this.loadDrivers();
    }
    
    loadDrivers() {
        // Load all drivers for grid editing
        fetch('/h2h/api/drivers')
            .then(response => response.json())
            .then(drivers => {
                this.renderGridInputs(drivers);
            });
    }
    
    renderGridInputs(drivers) {
        const inputsContainer = document.getElementById('grid-inputs');
        if (!inputsContainer) return;
        
        let html = '<div class="grid-rows">';
        
        drivers.forEach((driver, index) => {
            html += `
                <div class="grid-row">
                    <label>${driver.code}</label>
                    <input type="number" 
                           class="grid-input" 
                           data-driver="${driver.code}" 
                           min="1" 
                           max="22" 
                           placeholder="${index + 1}">
                </div>
            `;
        });
        
        html += '</div>';
        inputsContainer.innerHTML = html;
    }
    
    autoFill() {
        // Auto-fill based on some logic (e.g., qualifying simulation)
        const inputs = document.querySelectorAll('.grid-input');
        inputs.forEach((input, index) => {
            input.value = index + 1;
        });
    }
    
    saveGrid() {
        const inputs = document.querySelectorAll('.grid-input');
        this.gridPositions = {};
        
        inputs.forEach(input => {
            const driverCode = input.dataset.driver;
            const position = parseInt(input.value) || (parseInt(input.placeholder) || 1);
            this.gridPositions[driverCode] = position;
        });
        
        if (this.onSave) {
            this.onSave(this.gridPositions);
        }
    }
    
    resetGrid() {
        const inputs = document.querySelectorAll('.grid-input');
        inputs.forEach(input => {
            input.value = '';
        });
        this.gridPositions = {};
    }
    
    getGridPositions() {
        return this.gridPositions;
    }
    
    setGridPositions(positions) {
        this.gridPositions = positions;
        const inputs = document.querySelectorAll('.grid-input');
        
        inputs.forEach(input => {
            const driverCode = input.dataset.driver;
            if (positions[driverCode]) {
                input.value = positions[driverCode];
            }
        });
    }
}
