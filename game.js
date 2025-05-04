// game.js

// =============================================
// COSTANTI DI CONFIGURAZIONE DEL GIOCO
// =============================================

// Dimensioni del campo di gioco in blocchi
const BOARD_WIDTH = 15;   // Numero di blocchi in orizzontale
const BOARD_HEIGHT = 20;  // Numero di blocchi in verticale
const BLOCK_SIZE = 30;    // Dimensione in pixel di un singolo blocco

// Definizione delle forme dei pezzi del Tetris usando matrici binarie:
// 1 = blocco presente, 0 = blocco assente
const PIECES = [
    [[1,1,1,1]],         // I-Piece (forma lunga)
    [[1,1,1],[0,1,0]],   // T-Piece (forma a T)
    [[1,1,1],[1,0,0]],   // L-Piece (forma a L)
    [[1,1,1],[0,0,1]],   // J-Piece (L invertita)
    [[1,1],[1,1]],       // O-Piece (forma quadrata)
    [[1,1,0],[0,1,1]],   // S-Piece (forma a S)
    [[0,1,1],[1,1,0]]    // Z-Piece (forma a Z)
];

// Colori associati ai pezzi (uno per tipo di pezzo)
const COLORS = [
    '#00f0f0', // Cyan
    '#f0f000', // Giallo
    '#f000f0', // Magenta
    '#f0a000', // Arancione
    '#0000f0', // Blu
    '#00f000', // Verde
    '#f00000'  // Rosso
];

// =============================================
// INIZIALIZZAZIONE DEGLI ELEMENTI HTML
// =============================================

// Elementi canvas per il gioco e l'anteprima del prossimo pezzo
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const npCtx = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Impostazione dimensioni canvas basate sulle costanti
canvas.width = BLOCK_SIZE * BOARD_WIDTH;    // Larghezza totale campo di gioco
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;  // Altezza totale campo di gioco
nextPieceCanvas.width = BLOCK_SIZE * 4;     // Area per l'anteprima del pezzo
nextPieceCanvas.height = BLOCK_SIZE * 4;

// =============================================
// VARIABILI DI STATO DEL GIOCO
// =============================================

// Matrice bidimensionale che rappresenta lo stato del campo di gioco
// 0 = cella vuota, valore colore = cella occupata
let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));

// Variabili per la gestione dei pezzi:
let currentPiece = null;  // Pezzo attualmente in caduta
let nextPiece = null;     // Prossimo pezzo in arrivo
let currentX = 0;         // Posizione X corrente sul campo
let currentY = 0;         // Posizione Y corrente sul campo

// Variabili per la gestione del gioco:
let score = 0;            // Punteggio accumulato
let gameLoop = null;      // Riferimento al loop di gioco
let gameSpeed = 1000;     // Velocità di discesa iniziale (in millisecondi)
let lastDrop = Date.now();// Timestamp dell'ultima discesa automatica

// =============================================
// CLASSI E FUNZIONI FONDAMENTALI
// =============================================

// Classe per rappresentare un pezzo del Tetris
class Piece {
    constructor(shape, color) {
        this.shape = shape; // Matrice 2D che definisce la forma
        this.color = color; // Codice colore esadecimale
    }
}

// Crea un nuovo pezzo casuale selezionando dalla lista PIECES
function createNewPiece() {
    const idx = Math.floor(Math.random() * PIECES.length); // Indice casuale
    return new Piece(PIECES[idx], COLORS[idx]); // Combina forma e colore
}

// =============================================
// FUNZIONI DI DISEGNO
// =============================================

// Disegna un singolo blocco alla posizione (x, y) specificata
function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color; // Imposta il colore di riempimento
    // Disegna un rettangolo con bordi leggermente più piccoli del BLOCK_SIZE
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE-1, BLOCK_SIZE-1);
}

// Aggiorna il disegno dell'intero campo di gioco
function drawBoard() {
    // Pulisce l'intero canvas prima di ridisegnare
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Disegna tutti i blocchi fissi presenti nella board
    for(let y = 0; y < BOARD_HEIGHT; y++) {
        for(let x = 0; x < BOARD_WIDTH; x++) {
            if(board[y][x]) { // Se la cella non è vuota
                drawBlock(ctx, x, y, board[y][x]); // Disegna il blocco
            }
        }
    }
    
    // Disegna il pezzo corrente in movimento
    if(currentPiece) {
        // Itera su ogni riga della forma del pezzo
        currentPiece.shape.forEach((row, y) => {
            // Itera su ogni colonna della riga
            row.forEach((value, x) => {
                if(value) { // Se il valore è 1 (blocco presente)
                    // Calcola la posizione assoluta sul campo
                    drawBlock(ctx, currentX + x, currentY + y, currentPiece.color);
                }
            });
        });
    }
}

// =============================================
// FUNZIONI DI DISEGNO AUSILIARIE
// =============================================

// Disegna il prossimo pezzo nel pannello di anteprima
function drawNextPiece() {
    // Pulisce l'area di disegno
    npCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    if(nextPiece) {
        // Disegna il pezzo centrato nell'area 4x4
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if(value) {
                    // Aggiunge +1 per centrare nella griglia 4x4
                    drawBlock(npCtx, x + 1, y + 1, nextPiece.color);
                }
            });
        });
    }
}

// =============================================
// LOGICA DI MOVIMENTO E COLLISIONI
// =============================================

// Verifica la validità di una posizione per il pezzo corrente
function isValidMove(piece, newX, newY) {
    return piece.shape.every((row, dy) => {
        return row.every((value, dx) => {
            // Calcola la posizione assoluta sulla board
            const x = newX + dx;
            const y = newY + dy;
            
            // Un blocco è valido se:
            // 1. È parte vuota del pezzo (0), OPPURE
            // 2. È dentro i bordi e non collide con blocchi esistenti
            return (
                value === 0 ||
                (x >= 0 && x < BOARD_WIDTH &&
                 y >= 0 && y < BOARD_HEIGHT &&
                 !board[y][x])
            );
        });
    });
}

// Ruota il pezzo di 90 gradi in senso orario
function rotatePiece(piece) {
    // Trasposizione della matrice + reverse delle righe
    const newShape = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    return new Piece(newShape, piece.color);
}

// =============================================
// GESTIONE DELLA BOARD
// =============================================

// Fissa il pezzo corrente nella board
function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if(value) {
                // Aggiunge il colore del pezzo alla board
                board[currentY + y][currentX + x] = currentPiece.color;
            }
        });
    });
}

// Elimina le righe complete e aggiorna il punteggio
function clearLines() {
    let linesCleared = 0;
    
    // Controlla dal basso verso l'alto
    for(let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if(board[y].every(cell => cell !== 0)) { // Righe piene
            board.splice(y, 1); // Rimuove la riga
            board.unshift(Array(BOARD_WIDTH).fill(0)); // Aggiunge nuova riga vuota
            linesCleared++;
            y++; // Compensa lo shift dell'array
        }
    }
    
    if(linesCleared > 0) {
        score += linesCleared * 100; // 100 punti per riga
        scoreElement.textContent = `Score: ${score}`;
        gameSpeed = Math.max(100, gameSpeed - (linesCleared * 50)); // Aumenta difficoltà
    }
}

// =============================================
// GESTIONE DEL CICLO DI GIOCO
// =============================================

// Gestisce la fine del gioco
function gameOver() {
    cancelAnimationFrame(gameLoop); // Ferma il loop
    alert(`Game Over! Score: ${score}`);
    resetGame();
}

// Resetta lo stato iniziale del gioco
function resetGame() {
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    gameSpeed = 1000;
    scoreElement.textContent = `Score: ${score}`;
    startGame();
}

// Avvia una nuova partita
function startGame() {
    nextPiece = createNewPiece();
    spawnNewPiece();
    gameLoop = requestAnimationFrame(update); // Avvia il game loop
}

// Genera un nuovo pezzo in cima alla board
function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createNewPiece();
    // Posiziona il pezzo al centro orizzontalmente
    currentX = Math.floor(BOARD_WIDTH/2) - Math.floor(currentPiece.shape[0].length/2);
    currentY = 0;
    
    // Controllo game over: collisione immediata
    if(!isValidMove(currentPiece, currentX, currentY)) {
        gameOver();
    }
    
    drawNextPiece();
}

// Loop principale di aggiornamento
function update() {
    const now = Date.now();
    
    // Discesa automatica basata sul gameSpeed
    if(now - lastDrop > gameSpeed) {
        if(isValidMove(currentPiece, currentX, currentY + 1)) {
            currentY++; // Movimento verso il basso
        } else {
            mergePiece();    // Fissa il pezzo
            clearLines();    // Controlla righe complete
            spawnNewPiece(); // Genera nuovo pezzo
        }
        lastDrop = now; // Resetta il timer
    }
    
    drawBoard();
    gameLoop = requestAnimationFrame(update); // Richiama ricorsivamente
}

// =============================================
// GESTIONE DEI CONTROLLI
// =============================================

document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':  // Movimento a sinistra
            if(isValidMove(currentPiece, currentX - 1, currentY)) currentX--;
            break;
        case 'ArrowRight': // Movimento a destra
            if(isValidMove(currentPiece, currentX + 1, currentY)) currentX++;
            break;
        case 'ArrowDown':  // Caduta veloce
            if(isValidMove(currentPiece, currentX, currentY + 1)) currentY++;
            break;
        case 'ArrowUp':    // Rotazione
            const rotated = rotatePiece(currentPiece);
            if(isValidMove(rotated, currentX, currentY)) {
                currentPiece = rotated;
            }
            break;
        case ' ':          // Caduta istantanea
            while(isValidMove(currentPiece, currentX, currentY + 1)) {
                currentY++;
            }
            break;
    }
    drawBoard(); // Ridisegna dopo ogni input
});

// =============================================
// AVVIO DEL GIOCO
// =============================================
startGame();