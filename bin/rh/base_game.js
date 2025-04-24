let cars = [];
let dragging = null;
let dragStart = { x: 0, y: 0, mouse: 0 };
let gameWon = false;
let redCarFree = false;
const gapSize = 0; // Use 10 to match CSS gap

/**
 * @brief Loads and initializes a game level from a map file.
 * Fetches map data, resets game state, parses vehicle data,
 * and initializes the game board.
 * @param {string} mapPath Path to the JSON map file.
 */
async function loadLevel(mapPath) {
    try {
        const response = await fetch(mapPath);
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        const mapData = await response.json();
        let carCounter = 0;

        cars = [];
        gameWon = false;
        redCarFree = false;
        dragging = null;
        document.getElementById('game-board').innerHTML = '';
        const existingOverlay = document.getElementById('win-overlay');
        if (existingOverlay) existingOverlay.classList.remove('show');
        document.querySelectorAll('.car-anim-center').forEach(el => el.remove());

        mapData.vehicles.forEach(vehicle => {
            const dir = vehicle.dir === 'horizontal' ? 'h' : 'v';
            let id;

            if (vehicle.player) {
                id = 'red';
            } else {
                id = `${dir}${++carCounter}`;
            }
            cars.push({
                id: id,
                x: vehicle.pos[0],
                y: vehicle.pos[1],
                length: vehicle.size,
                dir: dir
            });
        });
        initializeGameBoard();
        setupEventListeners();
    } catch (error) {
        console.error("Failed to load level:", error);
    }
}

/**
 * @brief Initializes the visual representation of the game board.
 * Creates the grid container, grid lines (via cells), exit hole,
 * and displays the cars based on the loaded level data.
 */
function initializeGameBoard() {
    const gameBoardElement = document.getElementById('game-board');
    const gridContainer = document.createElement('div');
    const exitHole = document.createElement('div');

    gridContainer.className = "absolute inset-0 grid grid-cols-6 grid-rows-6 gap-[10px]";
    gameBoardElement.appendChild(gridContainer);
    for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
            const cell = document.createElement('div');
            gridContainer.appendChild(cell);
        }
    }
    exitHole.className = "absolute right-[-16px] top-[calc(var(--cell-size)*2 + 10px*2)] w-4 h-[calc(var(--cell-size))] rounded-r-lg border-2 border-transparent";
    gameBoardElement.appendChild(exitHole);
    cars.forEach(car => {
        const carDiv = document.createElement('div');
        carDiv.className = `car`;
        carDiv.style.left = `calc(${car.x} * var(--cell-size) + ${car.x} * ${gapSize}px)`;
        carDiv.style.top = `calc(${car.y} * var(--cell-size) + ${car.y} * ${gapSize}px)`;
        carDiv.style.width = car.dir === 'h' ? `calc(var(--cell-size) * ${car.length} + ${gapSize}px * (${car.length} - 1))` : 'var(--cell-size)';
        carDiv.style.height = car.dir === 'v' ? `calc(var(--cell-size) * ${car.length} + ${gapSize}px * (${car.length} - 1))` : 'var(--cell-size)';
        carDiv.setAttribute('data-id', car.id);
        carDiv.setAttribute('data-dir', car.dir);
        carDiv.setAttribute('data-x', car.x);
        carDiv.setAttribute('data-y', car.y);
        carDiv.setAttribute('data-length', car.length);
        carDiv.setAttribute('draggable', 'false');
        if (car.id === 'red') {
            const label = document.createElement('div');
            label.className = 'red-label';
            label.textContent = '9999';
            carDiv.appendChild(label);
        }
        gameBoardElement.appendChild(carDiv);
    });
    disableImageDragging();
}

/**
 * @brief Calculates the set of occupied cells on the board.
 * Excludes the specified car ID and the exit area for non-player cars.
 * @param {string|null} excludeId The ID of the car to exclude from the set.
 * @returns {Set<string>} A set of strings representing occupied cells ("x,y").
 */
function getOccupiedCells(excludeId = null) {
    const occ = new Set();

    cars.forEach(car => {
        if (car.id === excludeId) return;
        for (let i = 0; i < car.length; i++) {
            const cx = car.x + (car.dir === 'h' ? i : 0);
            const cy = car.y + (car.dir === 'v' ? i : 0);
            if (!(cy === 2 && cx >= 6 && car.id !== 'red')) {
                occ.add(`${cx},${cy}`);
            }
        }
    });
    return occ;
}

/**
 * @brief Clamps a value between a minimum and maximum.
 * @param {number} val The value to clamp.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @returns {number} The clamped value.
 */
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * @brief Updates the position style and data attributes of a car's DOM element.
 * @param {object} car The car object with updated x/y coordinates.
 */
function updateCarDiv(car) {
    const carDiv = document.querySelector(`[data-id="${car.id}"]`);

    if (!carDiv) return;
    carDiv.style.left = `calc(${car.x} * var(--cell-size) + ${car.x} * ${gapSize}px)`;
    carDiv.style.top = `calc(${car.y} * var(--cell-size) + ${car.y} * ${gapSize}px)`;
    carDiv.setAttribute('data-x', car.x);
    carDiv.setAttribute('data-y', car.y);
}

/**
 * @brief Handles the mouse down event on the game board to initiate dragging.
 * Identifies the clicked car and stores initial drag information.
 * @param {MouseEvent} e The mouse down event object.
 */
function onMouseDown(e) {
    if (gameWon) return;
    const carDiv = e.target.closest('.car');

    if (!carDiv) return;
    e.preventDefault();
    const id = carDiv.getAttribute('data-id');
    const car = cars.find(c => c.id === id);
    if (!car) return;
    dragging = { car, carDiv };
    dragStart.x = car.x;
    dragStart.y = car.y;
    dragStart.mouse = car.dir === 'h' ? e.clientX : e.clientY;
    document.body.style.userSelect = 'none';
}

/**
 * @brief Handles the mouse move event to update the dragged car's position.
 * Calculates the target position based on mouse movement, checks for collisions
 * and boundaries step-by-step, and updates the car's position if valid.
 * @param {MouseEvent} e The mouse move event object.
 */
function onMouseMove(e) {
    if (!dragging || gameWon) return;
    const { car } = dragging;
    const currentCellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
    const totalCellSize = currentCellSize + gapSize;
    const occ = getOccupiedCells(car.id);
    const delta = (car.dir === 'h' ? e.clientX : e.clientY) - dragStart.mouse;
    const cellDelta = Math.round(delta / totalCellSize);
    const startPos = dragStart[car.dir === 'h' ? 'x' : 'y'];
    const currentPos = car[car.dir === 'h' ? 'x' : 'y'];
    const maxGridPos = 6 - car.length;
    const exitRow = 2;
    const exitColStart = 6;
    const min = 0;
    const max = (car.id === 'red' && car.y === exitRow) ? exitColStart : maxGridPos;
    const targetPos = clamp(startPos + cellDelta, min, max);
    let newPos = currentPos;
    const step = targetPos > currentPos ? 1 : (targetPos < currentPos ? -1 : 0);

    if (step !== 0) {
        for (let tempPos = currentPos + step; ; tempPos += step) {
            let blocked = false;

            for (let i = 0; i < car.length; i++) {
                let cx = car.dir === 'h' ? (tempPos + i) : car.x;
                let cy = car.dir === 'v' ? (tempPos + i) : car.y;
                if (occ.has(`${cx},${cy}`)) {
                    blocked = true;
                    break;
                }
            }
            if (tempPos > max) break;
            if (blocked) break;
            newPos = tempPos;
            if (tempPos === targetPos) break;
        }
    }
    if (newPos !== currentPos) {
        if (car.dir === 'h') car.x = newPos;
        else car.y = newPos;
        updateCarDiv(car);
    }
}

/**
 * @brief Handles the mouse up event to finalize dragging and check for win condition.
 * Stops the dragging process and triggers the win animation if applicable.
 */
function onMouseUp() {
    if (!dragging) return;
    const winConditionMet = !gameWon &&
                            dragging.car.id === 'red' &&
                            dragging.car.y === 2 &&
                            dragging.car.x === 6;

    if (winConditionMet) {
        triggerRedCarWin();
    }
    dragging = null;
    document.body.style.userSelect = '';
}

/**
 * @brief Triggers the win animation sequence.
 * Marks the game as won, plays the car exit and center animations,
 * and shows the win overlay.
 */
function triggerRedCarWin() {
    if (gameWon) return;
    gameWon = true;
    const redCarDiv = document.querySelector('[data-id="red"]');
    const overlay = document.getElementById('win-overlay');

    if (!redCarDiv) return;
    void redCarDiv.offsetWidth;
    redCarDiv.classList.add('car-anim-exit');
    if (overlay) overlay.classList.add('show');
    setTimeout(() => {
        redCarDiv.classList.add('car-anim-hide');
        const redCarCenter = redCarDiv.cloneNode(true);
        const originalCarData = cars.find(c => c.id === 'red');

        redCarCenter.className = 'car';
        redCarCenter.classList.add('car-anim-center', 'car-anim-center-hidden');
        redCarCenter.style.backgroundImage = "url('assets/letter.png')";
        if (originalCarData) {
            redCarCenter.style.width = originalCarData.dir === 'h' ? `calc(var(--cell-size) * ${originalCarData.length} + ${gapSize}px * (${originalCarData.length} - 1))` : 'var(--cell-size)';
            redCarCenter.style.height = originalCarData.dir === 'v' ? `calc(var(--cell-size) * ${originalCarData.length} + ${gapSize}px * (${originalCarData.length} - 1))` : 'var(--cell-size)';
        }
        document.body.appendChild(redCarCenter);
        const label = redCarCenter.querySelector('.red-label');
        if (label) label.classList.add('show-label');
        void redCarCenter.offsetWidth;
        redCarCenter.classList.remove('car-anim-center-hidden');
    }, 900);
}

/**
 * @brief Sets up the main event listeners for the game board and window.
 * Cleans up existing listeners before adding new ones.
 */
function setupEventListeners() {
    const gameBoardElement = document.getElementById('game-board');

    gameBoardElement.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    gameBoardElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

/**
 * @brief Disables native image dragging behavior for game elements.
 * Prevents interference with custom drag-and-drop logic.
 */
function disableImageDragging() {
    const allDivs = document.querySelectorAll('#game-board, #game-board .car');

    allDivs.forEach(div => {
        div.setAttribute('draggable', 'false');
        div.addEventListener('dragstart', (e) => e.preventDefault());
    });
}
