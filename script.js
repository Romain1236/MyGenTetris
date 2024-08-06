// Sélectionne le canvas et son contexte pour le rendu 2D
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextContext = nextCanvas.getContext('2d');

// Ajustez les dimensions du canvas
canvas.width = 360;  // Correspond à la nouvelle largeur du conteneur
canvas.height = 600; // Correspond à la nouvelle hauteur du conteneur

context.scale(30, 30);  // Echelle
nextContext.scale(15, 15); // Echelle pour la prochaine pièce (ajusté pour mieux rentrer dans le canvas)

// Variables pour gérer l'état du jeu
let isPaused = true;
let animationFrameId;
let dropInterval = 1000;
let lastAcceleration = 0;
let timerInterval;
let startTime;
let elapsedTimeBeforePause = 0; // Nouvelle variable pour le temps écoulé avant la pause

let nextPieceMatrix = null; // Nouvelle variable pour stocker la prochaine pièce

// Lecture de la musique de fond
const backgroundMusic = document.getElementById('background-music');
backgroundMusic.volume = 0.5; // Réduire le volume à 50%

// Bruitage
const wooshSound = document.getElementById('woosh-sound');
const lineClearSound = document.getElementById('line-clear-sound');

//Icone accélération
const accelIcon = document.createElement('img');
accelIcon.src = 'images/Accel.webp';
accelIcon.style.position = 'absolute';
accelIcon.style.top = '50%';
accelIcon.style.left = '51%';
accelIcon.style.transform = 'translate(-50%, -50%)';
accelIcon.style.width = '210px'; // Ajuster la largeur de l'icône
accelIcon.style.height = '210px'; // Ajuster la hauteur de l'icône
accelIcon.style.zIndex = '1001';
accelIcon.style.display = 'none';
document.body.appendChild(accelIcon);


// Fonction pour démarrer la musique à la première interaction utilisateur
function startMusicOnInteraction() {
    backgroundMusic.play().catch(error => {
        console.log('Autoplay was prevented:', error);
    });
    document.removeEventListener('click', startMusicOnInteraction);
    document.removeEventListener('keydown', startMusicOnInteraction);
}

// Ajout des écouteurs d'événements pour démarrer la musique
document.addEventListener('click', startMusicOnInteraction);
document.addEventListener('keydown', startMusicOnInteraction);

// Fonction pour démarrer le chronomètre
function startTimer() {
    startTime = Date.now() - elapsedTimeBeforePause; // Ajuster startTime pour tenir compte du temps écoulé avant la pause
    timerInterval = setInterval(updateTimer, 1000);
}

// Fonction pour mettre à jour le chronomètre
function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    document.getElementById('game-timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Fonction pour réinitialiser le chronomètre
function resetTimer() {
    clearInterval(timerInterval);
    elapsedTimeBeforePause = 0; // Réinitialiser le temps écoulé avant la pause
    document.getElementById('game-timer').textContent = '00:00';
}

// Fonction pour mettre en pause le jeu
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationFrameId);
        clearInterval(timerInterval); // Arrêter le chronomètre lorsque le jeu est en pause
        elapsedTimeBeforePause = Date.now() - startTime; // Enregistrer le temps écoulé avant la pause
        showModal("Game Paused");
    } else {
        hideModal();
        startTimer(); // Redémarrer le chronomètre lorsque le jeu reprend
        animationFrameId = requestAnimationFrame(update);
    }
}

// Fonction pour nettoyer l'arène des lignes complètes avec animation de clignotement et comptage des combos
function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        let isComplete = true;
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                isComplete = false;
                break;
            }
        }

        if (isComplete) {
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

            // Retirer la ligne complète après l'animation
            setTimeout(() => {
                const row = arena.splice(y, 1)[0].fill(0);
                arena.unshift(row);
                ++y;
                rowCount++;
                if (rowCount > 0) {
                    let scoreMultiplier = 1;
                    let comboText = "";
                    switch (rowCount) {
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
                    player.score += 10 * rowCount * scoreMultiplier;
                    updateScore();
                    if (rowCount > 1) {
                        showCombo(comboText, scoreMultiplier); // Afficher l'animation de combo avec la taille et le volume appropriés
                    }
                }
            }, 600);
        }
    }
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
// Les autres fonctions restent inchangées

// Fonction pour vérifier les collisions entre l'arène et le joueur
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; m[y][x] !== undefined; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Fonction pour créer une matrice de l'arène avec des dimensions spécifiées
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// Fonction pour créer une pièce de Tetris en fonction du type
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

// Fonction pour dessiner une matrice sur le canvas
function drawMatrix(matrix, offset, ctx, isNextPiece = false) {
    if (isNextPiece) {
        ctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height); // Effacer le canvas avant de dessiner
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

// Fonction pour dessiner le jeu (arène et joueur)
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 }, context); // Dessiner l'arène en premier
    drawMatrix(player.matrix, player.pos, context); // Dessiner la pièce du joueur en second
}

// Fonction pour fusionner la pièce du joueur avec l'arène
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// Fonction pour faire pivoter une pièce
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

// Fonction pour faire tomber la pièce du joueur
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

// Fonction pour déplacer la pièce du joueur horizontalement
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

// Fonction pour réinitialiser la pièce du joueur
function playerReset() {
    const pieces = 'ILJOTSZ';
    if (nextPieceMatrix === null) {
        player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    } else {
        player.matrix = nextPieceMatrix;
    }
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    // Générer la prochaine pièce
    nextPieceMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    drawMatrix(nextPieceMatrix, { x: 2, y: 2 }, nextContext, true); // Dessiner la prochaine pièce et effacer le canvas avant

    if (collide(arena, player)) {
        showGameOverModal();
        saveScore(player.name, player.score, player.character); // Enregistrer le score avant de réinitialiser
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
        resetTimer(); // Réinitialiser le chronomètre en cas de Game Over
        dropInterval = 1000; // Réinitialiser l'intervalle de chute
        lastAcceleration = 0; // Réinitialiser le temps de la dernière accélération
        nextPieceMatrix = null; // Réinitialiser la prochaine pièce
    }
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

// Fonction pour faire pivoter la pièce du joueur
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

// Variables pour gérer le timing des chutes de pièces
let dropCounter = 0;

let lastTime = 0;

// Fonction principale de mise à jour du jeu
function update(time = 0) {
    if (isPaused) {
        return;
    }

    const deltaTime = time - lastTime;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    // Vérifie si 90 secondes se sont écoulées pour accélérer la descente des blocs
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime - lastAcceleration > 60000) {
        lastAcceleration = elapsedTime;
        dropInterval *= 0.9; // Augmente la vitesse de descente de 10%
        showAccelerationIcon(); // Affiche l'icône d'accélération
    }

    lastTime = time;

    draw();
    animationFrameId = requestAnimationFrame(update);
}

// Fonction pour afficher l'icône d'accélération et le texte
function showAccelerationIcon() {
    accelIcon.style.display = 'block';
    accelIcon.classList.add('accel-blink'); // Ajouter la classe pour le clignotement
	    setTimeout(() => {
        accelIcon.style.display = 'none';
        accelIcon.classList.remove('accel-blink'); // Retirer la classe après 2 secondes
		}, 5000); // Affiche l'icône et le texte pendant 2 secondes
}

// Fonction pour mettre à jour le score affiché
function updateScore() {
    document.getElementById('score').innerText = player.score;
}

// Couleurs des pièces de Tetris
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

// Création de la matrice de l'arène
const arena = createMatrix(12, 20);

// Objet du joueur avec sa position, sa matrice, son score, son nom et son personnage
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    name: 'Player 1',
    character: null
};

// Fonction pour sauvegarder le score dans le local storage
function saveScore(name, score, character) {
    const scores = JSON.parse(localStorage.getItem('tetrisScores')) || [];
    scores.push({ name, score, character });
    scores.sort((a, b) => b.score - a.score);
    scores.splice(10); // Garder seulement les 10 meilleurs scores
    localStorage.setItem('tetrisScores', JSON.stringify(scores));
    displayScores();
}

// Fonction pour afficher les scores à partir du local storage
function displayScores() {
    const scores = JSON.parse(localStorage.getItem('tetrisScores')) || [];
    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = '';
    scores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${score.name} (${score.character}): ${score.score}`;
        scoreList.appendChild(li);
    });
}

// Fonction pour initialiser les scores par défaut si nécessaire
function initializeDefaultScores() {
    const defaultScores = [
        { name: 'Albertine', score: 1000, character: 'La D' },
        { name: 'Michel', score: 600, character: 'Le L' },
        { name: 'Maryse', score: 300, character: 'Le S' },
        { name: 'Jacques', score: 1, character: 'Le M' },
        { name: 'Josiane', score: 100, character: 'Le R' },
        { name: 'Gérard', score: 85, character: 'La N' },
        { name: 'Véro', score: 60, character: 'Le Gouss' },
        { name: 'Raymond', score: 40, character: 'Le L' },
        { name: 'Micheline', score: 25, character: 'Le M' },
        { name: 'Adolphe', score: 10, character: 'Le R' }
    ];
    const storedScores = JSON.parse(localStorage.getItem('tetrisScores'));
    if (!storedScores || storedScores.length === 0) {
        localStorage.setItem('tetrisScores', JSON.stringify(defaultScores));
    }
}

// Gestion des touches pour déplacer et faire pivoter les pièces
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
    } else if (event.keyCode === 80) { // Touche "P"
        togglePause();
    }
});

// Gestion des boutons de sélection de personnage
document.querySelectorAll('.player-button').forEach(button => {
    button.addEventListener('click', () => {
        player.character = button.dataset.player;
        resetGame();
        hideModal();
        showModal(`${button.dataset.player} ! T'y a changé le kimono !`);
        changeBackground(button.dataset.player);
    });
});

// Gestion du champ de texte pour le nom du joueur
document.getElementById('player-name').addEventListener('input', event => {
    player.name = event.target.value;
});

// Gestion des boutons de sélection de personnage dans la boîte modale de démarrage
document.querySelectorAll('.startup-player-button').forEach(button => {
    button.addEventListener('click', () => {
        player.character = button.dataset.player;
        player.name = document.getElementById('startup-player-name').value;
        document.getElementById('player-name').value = player.name;
        hideStartupModal();
        resetGame();
        showModal(`${button.dataset.player} ! T'y a mis le kimono !`);
        changeBackground(button.dataset.player);
    });
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

// Fonction pour afficher une boîte modale avec un message
function showModal(message) {
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    modalMessage.textContent = message;
    modal.style.display = 'flex';
    isPaused = true;  // Mettre le jeu en pause
    cancelAnimationFrame(animationFrameId); // Arrêter la boucle de jeu
    clearInterval(timerInterval); // Arrêter le chronomètre
    modal.addEventListener('click', hideModal);
}

// Fonction pour cacher la boîte modale
function hideModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    modal.removeEventListener('click', hideModal);
    if (player.character) {
        isPaused = false;  // Reprendre le jeu si un personnage est sélectionné
        animationFrameId = requestAnimationFrame(update);  // Redémarrer la boucle de jeu
        startTimer(); // Redémarrer le chronomètre
    }
}

// Fonction pour afficher la boîte modale de démarrage
function showStartupModal() {
    const modal = document.getElementById('startup-modal');
    modal.style.display = 'flex';
    clearInterval(timerInterval); // Arrêter le chronomètre lors de la sélection du personnage
}

// Fonction pour cacher la boîte modale de démarrage
function hideStartupModal() {
    const modal = document.getElementById('startup-modal');
    modal.style.display = 'none';
    if (player.character) {
        startTimer(); // Redémarrer le chronomètre lorsque le personnage est sélectionné
    }
}

// Fonction pour changer l'image de fond en fonction du personnage sélectionné
function changeBackground(player) {
    const tetrisContainer = document.querySelector('.tetris-container');
    switch(player) {
        case 'La D':
            tetrisContainer.style.backgroundImage = "url('La_D.jpg')";
            break;
        case 'La N':
            tetrisContainer.style.backgroundImage = "url('La_N.jpg')";
            break;
        case 'Le L':
            tetrisContainer.style.backgroundImage = "url('Le_L.jpg')";
            break;
        case 'Le M':
            tetrisContainer.style.backgroundImage = "url('Le_M.jpg')";
            break;
        case 'Le R':
            tetrisContainer.style.backgroundImage = "url('Le_R.jpg')";
            break;
        case 'Le S':
            tetrisContainer.style.backgroundImage = "url('Le_S.jpg')";
            break;
        case 'Le Gouss':
            tetrisContainer.style.backgroundImage = "url('Le_Gouss.jpg')";
            break;
        default:
            tetrisContainer.style.backgroundImage = 'none';
    }
    tetrisContainer.style.backgroundSize = 'cover';
    tetrisContainer.style.backgroundPosition = 'center';
}

// Afficher la boîte modale de démarrage demandant de choisir un personnage
document.addEventListener('DOMContentLoaded', () => {
    initializeDefaultScores(); // Initialiser les scores par défaut si nécessaire
    showStartupModal();
    displayScores(); // Afficher les scores lors du chargement de la page
});
