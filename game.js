// game.js
const BOARD_WIDTH = 15;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

const PIECES = [
    [[1,1,1,1]], 
    [[1,1,1],[0,1,0]], 
    [[1,1,1],[1,0,0]], 
    [[1,1,1],[0,0,1]], 
    [[1,1],[1,1]], 
    [[1,1,0],[0,1,1]], 
    [[0,1,1],[1,1,0]] 
];

const COLORS = [
    '#00f0f0', '#f0f000', '#f000f0',
    '#f0a000', '#0000f0', '#00f000', '#f00000'
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const npCtx = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');

canvas.width = BLOCK_SIZE * BOARD_WIDTH;
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;
nextPieceCanvas.width = BLOCK_SIZE * 4;
nextPieceCanvas.height = BLOCK_SIZE * 4;

let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let currentPiece = null;
let nextPiece = null;
let currentX = 0;
let currentY = 0;
let score = 0;
let gameLoop = null;
let gameSpeed = 1000;
let lastDrop = Date.now();

class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
    }
}

function createNewPiece() {
    const idx = Math.floor(Math.random() * PIECES.length);
    return new Piece(PIECES[idx], COLORS[idx]);
}

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE-1, BLOCK_SIZE-1);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Board
    for(let y = 0; y < BOARD_HEIGHT; y++) {
        for(let x = 0; x < BOARD_WIDTH; x++) {
            if(board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
    
    // Current piece
    if(currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if(value) {
                    drawBlock(ctx, currentX + x, currentY + y, currentPiece.color);
                }
            });
        });
    }
}

function drawNextPiece() {
    npCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if(nextPiece) {
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if(value) {
                    drawBlock(npCtx, x + 1, y + 1, nextPiece.color);
                }
            });
        });
    }
}

function isValidMove(piece, newX, newY) {
    return piece.shape.every((row, dy) => {
        return row.every((value, dx) => {
            let x = newX + dx;
            let y = newY + dy;
            return (
                value === 0 ||
                (x >= 0 && x < BOARD_WIDTH &&
                 y >= 0 && y < BOARD_HEIGHT &&
                 !board[y][x])
            );
        });
    });
}

function rotatePiece(piece) {
    const newShape = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    return new Piece(newShape, piece.color);
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if(value) {
                board[currentY + y][currentX + x] = currentPiece.color;
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    
    for(let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if(board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++;
        }
    }
    
    if(linesCleared > 0) {
        score += linesCleared * 100;
        scoreElement.textContent = `Score: ${score}`;
        gameSpeed = Math.max(100, gameSpeed - (linesCleared * 50));
    }
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    alert(`Game Over! Score: ${score}`);
    resetGame();
}

function resetGame() {
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    gameSpeed = 1000;
    scoreElement.textContent = `Score: ${score}`;
    startGame();
}

function startGame() {
    nextPiece = createNewPiece();
    spawnNewPiece();
    gameLoop = requestAnimationFrame(update);
}

function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createNewPiece();
    currentX = Math.floor(BOARD_WIDTH/2) - Math.floor(currentPiece.shape[0].length/2);
    currentY = 0;
    
    if(!isValidMove(currentPiece, currentX, currentY)) {
        gameOver();
    }
    
    drawNextPiece();
}

function update() {
    const now = Date.now();
    if(now - lastDrop > gameSpeed) {
        if(isValidMove(currentPiece, currentX, currentY + 1)) {
            currentY++;
        } else {
            mergePiece();
            clearLines();
            spawnNewPiece();
        }
        lastDrop = now;
    }
    
    drawBoard();
    gameLoop = requestAnimationFrame(update);
}

// Controls
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            if(isValidMove(currentPiece, currentX - 1, currentY)) currentX--;
            break;
        case 'ArrowRight':
            if(isValidMove(currentPiece, currentX + 1, currentY)) currentX++;
            break;
        case 'ArrowDown':
            if(isValidMove(currentPiece, currentX, currentY + 1)) currentY++;
            break;
        case 'ArrowUp':
            const rotated = rotatePiece(currentPiece);
            if(isValidMove(rotated, currentX, currentY)) {
                currentPiece = rotated;
            }
            break;
        case ' ':
            while(isValidMove(currentPiece, currentX, currentY + 1)) {
                currentY++;
            }
            break;
    }
    drawBoard();
});

// Start game
startGame();