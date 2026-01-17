const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const app = document.getElementById('app');
const timerBtns = document.querySelectorAll('.timer-btn');
const bossBtns = document.querySelectorAll('.timer-btn.boss');
const editToggle = document.getElementById('edit-mode-btn');
const bossToggle = document.getElementById('boss-mode-btn');
const startGameBtn = document.getElementById('start-game-btn');
const gameTimerDisplay = document.getElementById('game-timer');
const coordsOutput = document.getElementById('coords-output');
const exportBtn = document.getElementById('export-btn');
const importTrigger = document.getElementById('import-trigger');
const importBtn = document.getElementById('import-btn');
const fileControls = document.getElementById('file-controls');

let isEditMode = false;
let isBossMode = false;
let gameInterval = null;
let gameStartTime = null;
let mapDimensions = { width: 0, height: 0 };
let currentConfig = {
    t1: { x: 541, y: 403 },
    t2: { x: 670, y: 401 },
    t3: { x: 543, y: 572 },
    t4: { x: 678, y: 613 },
    t5: { x: 866, y: 370 },
    t6: { x: 996, y: 418 },
    t7: { x: 876, y: 570 },
    t8: { x: 995, y: 568 },
    b1: { x: 400, y: 300 }
};

if (localStorage.getItem('mapTimerConfig')) {
    try {
        const saved = JSON.parse(localStorage.getItem('mapTimerConfig'));
        currentConfig = { ...currentConfig, ...saved };
    } catch (e) {
        console.error("Failed to load config", e);
    }
}

const mapImage = new Image();
mapImage.src = 'map.png';

mapImage.onload = () => {
    canvas.width = mapImage.width;
    canvas.height = mapImage.height;
    mapDimensions.width = mapImage.width;
    mapDimensions.height = mapImage.height;
    
    applyConfig(currentConfig);

    drawMap();
};

function applyConfig(config) {
    timerBtns.forEach(btn => {
        const id = btn.id;
        if (config[id]) {
            const { x, y } = config[id];
            // Convert to percentage
            const leftPercent = (x / mapDimensions.width) * 100;
            const topPercent = (y / mapDimensions.height) * 100;
            btn.style.left = `${leftPercent}%`;
            btn.style.top = `${topPercent}%`;
        }
    });
}

mapImage.onerror = () => {
    canvas.width = 800;
    canvas.height = 600;
    mapDimensions.width = 800;
    mapDimensions.height = 600;
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ccc';
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Map Image Not Found (map.png)', canvas.width/2, canvas.height/2);
};

function drawMap() {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
}

const DURATION = 30;

class Timer {
    constructor(element) {
        this.element = element;
        
        this.element.addEventListener('mousedown', (e) => this.inputStart(e));
        this.element.ondragstart = () => false;

        if (this.element.classList.contains('boss')) return;

        this.intervalId = null;
        this.remainingTime = 0;
        this.isRunning = false;
    }

    inputStart(e) {
        if (isEditMode) {
            this.startDrag(e);
        } else {
            this.toggleTimer();
        }
    }

    toggleTimer() {
        if (this.element.classList.contains('boss')) {
            if (this.element.classList.contains('expired')) {
                this.advanceBossPhase();
            }
            return;
        }

        if (this.isRunning) {
            this.reset();
        } else if (this.element.classList.contains('expired')) {
            this.reset();
        } else {
            this.start();
        }
    }

    advanceBossPhase() {
        let currentIdx = parseInt(this.element.dataset.phaseIndex || 0);
        this.element.dataset.phaseIndex = currentIdx + 1;
        
        this.element.classList.remove('expired');
        this.element.style.background = ''; 
    }

    start() {
        this.isRunning = true;
        this.element.classList.remove('cleared', 'expired');
        this.element.classList.add('running');
        this.remainingTime = DURATION;
        this.updateVisual();

        this.intervalId = setInterval(() => {
            this.remainingTime--;
            if (this.remainingTime <= 0) {
                this.expire();
            } else {
                this.updateVisual();
            }
        }, 1000);
    }
    
    expire() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false; 
        
        this.element.classList.remove('running');
        this.element.classList.add('expired');
        this.element.style.background = '';
        
        const text = "!";
        let span = this.element.querySelector('span');
        if (span) span.textContent = text;
        else this.element.textContent = text;
    }

    reset() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false;
        
        this.element.classList.remove('running', 'expired');
        this.element.classList.add('cleared');
        this.element.textContent = this.element.id.replace('t', ''); 
        this.element.style.background = '';
    }

    updateVisual() {
        if (this.element.classList.contains('boss')) return; 
        
        const text = this.remainingTime.toString();
        
        let span = this.element.querySelector('span');
        if (!span) {
            this.element.innerHTML = `<span>${text}</span>`;
        } else {
            span.textContent = text;
        }

        const degrees = (this.remainingTime / DURATION) * 360;
        
        let color = '#888';
        if (this.element.classList.contains('team-friendly')) {
            color = '#00BFFF';
        } else if (this.element.classList.contains('team-enemy')) {
            color = '#FF4500';
        }

        this.element.style.background = `conic-gradient(${color} ${degrees}deg, #f0f0f0 ${degrees}deg)`;
    }

    startDrag(e) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = this.element.offsetLeft;
        const startTop = this.element.offsetTop;
        const containerRect = app.getBoundingClientRect();

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            // Boundaries
            newLeft = Math.max(0, Math.min(newLeft, containerRect.width));
            newTop = Math.max(0, Math.min(newTop, containerRect.height));

            // Apply as percentage for responsiveness
            const leftPercent = (newLeft / containerRect.width) * 100;
            const topPercent = (newTop / containerRect.height) * 100;

            this.element.style.left = `${leftPercent}%`;
            this.element.style.top = `${topPercent}%`;

            const imgX = Math.round((newLeft / containerRect.width) * mapDimensions.width);
            const imgY = Math.round((newTop / containerRect.height) * mapDimensions.height);

            currentConfig[this.element.id] = { x: imgX, y: imgY };
            localStorage.setItem('mapTimerConfig', JSON.stringify(currentConfig));

            coordsOutput.innerHTML = `Moving ${this.element.id}: X: <strong>${imgX}</strong>, Y: <strong>${imgY}</strong>`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
}

// Initialize Timers
const timers = [];
timerBtns.forEach(btn => {
    if (!btn.classList.contains('boss')) {
        timers.push(new Timer(btn));
    } else {
        new Timer(btn);
    }
});

// Boss Mode Toggle
bossToggle.addEventListener('click', () => {
    isBossMode = !isBossMode;
    bossToggle.classList.toggle('active', isBossMode);
    
    bossBtns.forEach(btn => {
        if (isBossMode) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
});

// Game Start Logic
startGameBtn.addEventListener('click', () => {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
        startGameBtn.textContent = "Start Game";
        startGameBtn.classList.remove('active');
        gameTimerDisplay.textContent = "00:00";
        
        bossBtns.forEach(btn => {
            btn.classList.remove('running', 'expired', 'cleared');
            const schedule = btn.dataset.schedule.split(',');
            btn.dataset.phaseIndex = 0;
            btn.innerHTML = `${schedule[0]}m`;
            btn.style.background = '';
            btn.style.color = '';
            btn.style.textShadow = '';
        });
    } else {
        gameStartTime = Date.now();
        gameInterval = setInterval(updateGameTimer, 1000);
        startGameBtn.textContent = "Stop Game";
        startGameBtn.classList.add('active');
        
        bossBtns.forEach(btn => {
            btn.classList.remove('expired', 'cleared');
            btn.classList.add('running');
            btn.dataset.phaseIndex = 0;
            updateBossVisual(btn, 0);
        });
    }
});

function updateGameTimer() {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000);
    
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    gameTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    bossBtns.forEach(btn => updateBossVisual(btn, elapsedSeconds));
}

function updateBossVisual(btn, elapsedSeconds) {
    if (btn.classList.contains('expired')) return;
    
    const schedule = btn.dataset.schedule.split(',').map(m => parseInt(m));
    const phaseIndex = parseInt(btn.dataset.phaseIndex || 0);
    
    if (phaseIndex >= schedule.length) {
        btn.classList.remove('running');
        btn.classList.add('cleared');
        btn.innerHTML = "DONE";
        btn.style.background = '#333';
        return;
    }

    const targetMinutes = schedule[phaseIndex];
    const targetSeconds = targetMinutes * 60;
    const remaining = targetSeconds - elapsedSeconds;
    
    const prevTargetMinutes = phaseIndex > 0 ? schedule[phaseIndex - 1] : 0;
    const prevTargetSeconds = prevTargetMinutes * 60;
    
    if (remaining <= 0) {
        btn.classList.remove('running');
        btn.classList.add('expired');
        btn.innerHTML = `SPWN`;
        btn.style.background = '';
    } else {
        const rMins = Math.floor(remaining / 60);
        const rSecs = remaining % 60;
        
        const text = `${rMins}:${rSecs.toString().padStart(2, '0')}`;
        
        const legDuration = targetSeconds - prevTargetSeconds;
        const legRemaining = remaining;
        
        const degrees = (legRemaining / legDuration) * 360;

        btn.innerHTML = `<span>${text}</span>`;
        
        const color = '#9C27B0';
        btn.style.background = `conic-gradient(${color} ${degrees}deg, #f0f0f0 ${degrees}deg)`;
        
        btn.style.color = '';
        btn.style.textShadow = '';
    }
}

// Edit Mode Toggle
editToggle.addEventListener('click', (e) => {
    isEditMode = !isEditMode;
    editToggle.classList.toggle('active', isEditMode);

    if (isEditMode) {
        document.body.classList.add('edit-mode');
        if(fileControls) fileControls.style.display = 'flex';
        coordsOutput.textContent = "Drag buttons to see coordinates";
    } else {
        document.body.classList.remove('edit-mode');
        if(fileControls) fileControls.style.display = 'none';
        coordsOutput.textContent = "";
    }
});

exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "map_timer_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

importTrigger.addEventListener('click', () => {
    importBtn.click();
});

importBtn.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            currentConfig = { ...currentConfig, ...config };
            localStorage.setItem('mapTimerConfig', JSON.stringify(currentConfig));
            applyConfig(currentConfig);
            alert('Configuration loaded!');
        } catch (err) {
            console.error(err);
            alert('Error parsing JSON file');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
});
