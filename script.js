// =====================
// Configuration Initiale
// =====================

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextContext = nextCanvas.getContext('2d');
const bannedWords = ['bite', 'pute', 'salope', 'chatte', 'nichon', 'encule', 'enculé', 'hitler', 'adolf', "Zemmour", ]; // Remplacez par les mots interdits réels

canvas.width = 240;
canvas.height = 400;

context.scale(20, 20);  // Échelle mise à jour pour correspondre à la taille du canvas
nextContext.scale(20, 20); // Échelle pour la prochaine pièce

let isPaused = true;
let animationFrameId;
let dropInterval = 1000;
let lastAcceleration = 0;
let timerInterval;
let startTime;
let elapsedTimeBeforePause = 0;
let nextPieceMatrix = null;

const backgroundMusic = document.getElementById('background-music');
backgroundMusic.volume = 0.5;

const wooshSound = document.getElementById('woosh-sound');
const lineClearSound = document.getElementById('line-clear-sound');

const accelIcon = document.getElementById('accel-icon');

function showAccelerationIcon() {
    accelIcon.style.display = 'block';
    setTimeout(() => {
        accelIcon.style.display = 'none';
    }, 5000);
}

function startMusicOnInteraction() {
    backgroundMusic.play().catch(error => {
        console.log('Autoplay was prevented:', error);
    });
    document.removeEventListener('click', startMusicOnInteraction);
    document.removeEventListener('keydown', startMusicOnInteraction);
}

document.addEventListener('click', startMusicOnInteraction);
document.addEventListener('keydown', startMusicOnInteraction);

// =====================
// Gestion du Chronomètre
// =====================

function startTimer() {
    startTime = Date.now() - elapsedTimeBeforePause;
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    document.getElementById('game-timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function resetTimer() {
    clearInterval(timerInterval);
    elapsedTimeBeforePause = 0;
    document.getElementById('game-timer').textContent = '00:00';
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationFrameId);
        clearInterval(timerInterval);
        elapsedTimeBeforePause = Date.now() - startTime;
        showModal("Game Paused");
    } else {
        hideModal();
        startTimer();
        animationFrameId = requestAnimationFrame(update);
    }
}

// =====================
// Gestion des Scores
// =====================

const API_URL = 'https://mygentetrisback-end.onrender.com/scores';

async function saveScore(name, score, character) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, score, character })
        });
        const result = await response.json();
        console.log(result.message);
        displayScores();
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

async function displayScores() {
    try {
        const response = await fetch(API_URL);
        const scores = await response.json();
        const scoreList = document.getElementById('score-list');
        scoreList.innerHTML = '';
        scores.forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${score.name} (${score.character}): ${score.score}`;
            scoreList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching scores:', error);
    }
}

// =====================
// Gestion de l'Arène et des Pièces
// =====================

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

// =====================
// Fonctions de Dessin
// =====================

function drawMatrix(matrix, offset, ctx, isNextPiece = false) {
    if (isNextPiece) {
        ctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    }
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 }, context);
    drawMatrix(player.matrix, player.pos, context);
}

// =====================
// Mécaniques du Jeu
// =====================

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (nextPieceMatrix === null) {
        player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    } else {
        player.matrix = nextPieceMatrix;
    }
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    nextPieceMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    drawMatrix(nextPieceMatrix, { x: 2, y: 2 }, nextContext, true);

    if (collide(arena, player)) {
        showGameOverModal();
        saveScore(player.name, player.score, player.character);
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
        resetTimer();
        dropInterval = 1000;
        lastAcceleration = 0;
        nextPieceMatrix = null;
    }
}

function arenaSweep() {
    let rowCount = 0;
    const rowsToRemove = [];

    // Identifier les lignes complètes
    outer: for (let y = arena.length - 1; y > 0; --y) {
        let isComplete = true;
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                isComplete = false;
                break;
            }
        }

        if (isComplete) {
            rowsToRemove.push(y);
            // Jouer le son de validation de ligne
            lineClearSound.play();

            // Ajouter une classe d'animation à chaque cellule de la ligne complète
            for (let x = 0; x < arena[y].length; ++x) {
                let cell = document.createElement('div');
                cell.style.position = 'absolute';
                cell.style.width = '30px';  // Ajusté pour correspondre à l'échelle
                cell.style.height = '30px'; // Ajusté pour correspondre à l'échelle
                cell.style.left = `${x * 30}px`;
                cell.style.top = `${y * 30}px`;
                cell.style.backgroundColor = colors[arena[y][x]];
                cell.classList.add('blink');
                cell.style.zIndex = 1000;  // Assurez-vous que les divs sont au-dessus du canvas
                canvas.parentElement.appendChild(cell);

                // Retirer l'animation après un court délai
                setTimeout(() => {
                    canvas.parentElement.removeChild(cell);
                }, 600);
            }
        }
    }

    // Retirer les lignes complètes après l'animation
    setTimeout(() => {
        for (let i = rowsToRemove.length - 1; i >= 0; i--) {
            const row = arena.splice(rowsToRemove[i], 1)[0].fill(0);
            arena.unshift(row);
        }

        if (rowsToRemove.length > 0) {
            let scoreMultiplier = 1;
            let comboText = "";
            switch (rowsToRemove.length) {
                case 1:
                    scoreMultiplier = 1;
                    break;
                case 2:
                    scoreMultiplier = 1.5;
                    comboText = "Combo x1.5";
                    break;
                case 3:
                    scoreMultiplier = 3;
                    comboText = "Combo x3";
                    break;
                case 4:
                    scoreMultiplier = 5;
                    comboText = "Combo x5";
                    break;
            }
            player.score += 10 * rowsToRemove.length * scoreMultiplier;
            updateScore();
            if (rowsToRemove.length > 1) {
                showCombo(comboText, scoreMultiplier); // Afficher l'animation de combo avec la taille et le volume appropriés
            }
        }
    }, 600);
}

// Fonction pour afficher l'animation de combo
function showCombo(text, multiplier) {
    const comboDisplay = document.getElementById('combo-display');
    comboDisplay.textContent = text;
    
    let fontSize;
    let volume;
    
    switch(multiplier) {
        case 1.5:
            fontSize = '1.5em';
            volume = 0.5;
            break;
        case 3:
            fontSize = '2em';
            volume = 0.7;
            break;
        case 5:
            fontSize = '3em';
            volume = 1.0;
            break;
        default:
            fontSize = '1em';
            volume = 0.3;
    }
    
    comboDisplay.style.fontSize = fontSize;
    lineClearSound.volume = volume;
    lineClearSound.play();
    
    comboDisplay.classList.add('combo-show');
    setTimeout(() => {
        comboDisplay.classList.remove('combo-show');
    }, 1000);
}

// Fonction pour afficher l'écran "Game Over"
function showGameOverModal() {
    const gameoverModal = document.getElementById('gameover-modal');
    gameoverModal.style.display = 'flex';
    isPaused = true;
    cancelAnimationFrame(animationFrameId);
    clearInterval(timerInterval);
}

// Fonction pour redémarrer le jeu après "Game Over"
function restartGame() {
    hideGameOverModal();
    resetGame();
}

// Fonction pour cacher l'écran "Game Over"
function hideGameOverModal() {
    const gameoverModal = document.getElementById('gameover-modal');
    gameoverModal.style.display = 'none';
}

// =====================
// Contrôles du Joueur
// =====================

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    wooshSound.play(); // Jouer le son de rotation
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

// =====================
// Boucle de Jeu
// =====================

let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
    if (isPaused) {
        return;
    }

    const deltaTime = time - lastTime;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    const elapsedTime = Date.now() - startTime;
    if (elapsedTime - lastAcceleration > 60000) {
        lastAcceleration = elapsedTime;
        dropInterval *= 0.8;
        showAccelerationIcon();
    }

    lastTime = time;

    draw();
    animationFrameId = requestAnimationFrame(update);
}

// =====================
// Affichage et Animation
// =====================

function showAccelerationIcon() {
    accelIcon.style.display = 'block';
    accelIcon.classList.add('accel-blink');
    setTimeout(() => {
        accelIcon.style.display = 'none';
        accelIcon.classList.remove('accel-blink');
    }, 5000);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

// =====================
// Couleurs et Arène
// =====================

const colors = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF',
];

const arena = createMatrix(12, 20);

// =====================
// Objet Joueur
// =====================

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    name: 'Player 1',
    character: null
};

// =====================
// Gestion des Interactions Utilisateur
// =====================

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 87) {
        playerRotate(-1);
    } else if (event.keyCode === 88) {
        playerRotate(1);
    } else if (event.keyCode === 80) {
        togglePause();
    }
});

document.querySelectorAll('.player-button').forEach(button => {
    button.addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value;
        if (playerName === 'Player 1' || playerName.trim() === '') {
            showNameModal();
            return;
        }
        if (containsBannedWord(playerName)) {
            showBannedWordModal();
            return;
        }
        player.character = button.dataset.player;
        player.name = playerName;
        resetGame();
        hideModal();
        showModal(`<p>${button.dataset.player}</p><p>T'y as changé le kimono !</p>`);
        changeBackground(button.dataset.player);
    });
});

document.getElementById('player-name').addEventListener('input', event => {
    player.name = event.target.value;
});

document.querySelectorAll('.startup-player-button').forEach(button => {
    button.addEventListener('click', () => {
        const playerName = document.getElementById('startup-player-name').value;
        if (playerName === 'Player 1' || playerName.trim() === '') {
            showNameModal();
            return;
        }
        if (containsBannedWord(playerName)) {
            showBannedWordModal();
            return;
        }
        player.character = button.dataset.player;
        player.name = playerName;
        document.getElementById('player-name').value = playerName;
        hideStartupModal();
        resetGame();
        showModal(`<p>${button.dataset.player}</p><p>T'y as mis le kimono !</p>`);
        changeBackground(button.dataset.player);
    });
});


// =====================
// Gestion des mots interdits
// =====================

// Fonction pour vérifier les mots interdits
function containsBannedWord(name) {
    return bannedWords.some(word => name.toLowerCase().includes(word));
}

// Fonction pour afficher le message "You are better than this"
function showBannedWordModal() {
    const bannedWordModal = document.getElementById('banned-word-modal');
    bannedWordModal.style.display = 'flex';
}



// =====================
// Gestion de la Boîte Modale
// =====================

function showModal(message) {
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    modalMessage.textContent = message;
    modalMessage.innerHTML = message; // Utilisation de innerHTML pour définir le contenu HTM
    modal.style.display = 'flex';
    isPaused = true;
    cancelAnimationFrame(animationFrameId);
    clearInterval(timerInterval);
    modal.addEventListener('click', hideModal);
}

function hideModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    modal.removeEventListener('click', hideModal);
    if (player.character) {
        isPaused = false;
        animationFrameId = requestAnimationFrame(update);
        startTimer();
    }
}

function showStartupModal() {
    const modal = document.getElementById('startup-modal');
    modal.style.display = 'flex';
    clearInterval(timerInterval);
}

function hideStartupModal() {
    const modal = document.getElementById('startup-modal');
    modal.style.display = 'none';
    if (player.character) {
        startTimer();
    }
}

document.getElementById('name-modal-close').addEventListener('click', hideNameModal);

function showNameModal() {
    const nameModal = document.getElementById('name-modal');
    nameModal.style.display = 'flex';
}

function hideNameModal() {
    const nameModal = document.getElementById('name-modal');
    nameModal.style.display = 'none';
}

function hideBannedWordModal() {
    const bannedWordModal = document.getElementById('banned-word-modal');
    bannedWordModal.style.display = 'none';
}

document.getElementById('banned-word-modal-close').addEventListener('click', hideBannedWordModal);

// =====================
// Gestion de l'Arrière-plan
// =====================

function changeBackground(player) {
    const tetrisContainer = document.querySelector('.tetris-container');
    switch(player) {
        case 'La D':
            tetrisContainer.style.backgroundImage = "url('images/La_D.jpg')";
            break;
        case 'La N':
            tetrisContainer.style.backgroundImage = "url('images/La_N.jpg')";
            break;
        case 'Le L':
            tetrisContainer.style.backgroundImage = "url('images/Le_L.jpg')";
            break;
        case 'Le M':
            tetrisContainer.style.backgroundImage = "url('images/Le_M.jpg')";
            break;
        case 'Le R':
            tetrisContainer.style.backgroundImage = "url('images/Le_R.jpg')";
            break;
        case 'Le S':
            tetrisContainer.style.backgroundImage = "url('images/Le_N.jpg')";
            break;
        case 'Le Gouss':
            tetrisContainer.style.backgroundImage = "url('images/Le_Gouss.jpg')";
            break;
        default:
            tetrisContainer.style.backgroundImage = 'none';
    }
    tetrisContainer.style.backgroundSize = 'cover';
    tetrisContainer.style.backgroundPosition = 'center';
}

// =====================
// Initialisation
// =====================

document.addEventListener('DOMContentLoaded', () => {
    showStartupModal();
    displayScores();
    update();
});

// Fonction pour réinitialiser le jeu
function resetGame() {
    arena.forEach(row => row.fill(0));
    playerReset();
    updateScore();
    resetTimer(); // Réinitialiser le chronomètre
    dropCounter = 0;
    isPaused = false;
    dropInterval = 1000; // Réinitialiser l'intervalle de chute
    lastAcceleration = 0; // Réinitialiser le temps de la dernière accélération
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(update);
    startTimer(); // Démarrer le chronomètre
}


document.addEventListener('DOMContentLoaded', () => {
    const openModalButton = document.getElementById('open-modal-button');
    const playerSelectModal = document.getElementById('startup-modal');

    openModalButton.addEventListener('click', () => {
        playerSelectModal.style.display = 'flex';
        document.querySelector('.home-page').style.display = 'none';
    });

    displayScores();
    update();
});