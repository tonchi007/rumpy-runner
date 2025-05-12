let scoreStarted = false;

const canvas = document.getElementById("game-canvas");
        const ctx = canvas.getContext("2d");
        const orientationMessage = document.getElementById("orientation-message");
        const scoreForm = document.getElementById("score-form");
        const playerNameInput = document.getElementById("player-name");
        const scoresList = document.getElementById("scores-list");
        const scoresUl = document.getElementById("scores-ul");
        const startButton = document.getElementById("start-button");

        // Variables para escalar el juego
        let scale = 1;
        const baseWidth = 2556;
        const baseHeight = 1179;

        // Variables del jugador
        let player = { 
            x: 100, 
            y: 0, 
            width: 150, 
            height: 150, 
            dy: 0, 
            gravity: 0.5, 
            jumpPower: -15, 
            grounded: false, 
            jumps: 0, 
            maxJumps: 2
        };

        // Variables para controlar el cartel
        let signX = canvas.width;
        let signY = 200;

        // Variables del juego
        let gameSpeed = 5;
        let score = 0;
        let isGameOver = false;
        let gameStarted = false;
        let isPaused = false;

        // Bandera para controlar si los botones están siendo presionados
        let buttonsPressed = false;

        // Cargar imágenes del jugador
        const playerImages = ["assets/RUMPI.png", "assets/RUMPI2.png"].map(src => {
            const img = new Image();
            img.src = src;
            img.onload = onImageLoad;
            img.onerror = () => console.error(`Error al cargar la imagen: ${src}`);
            return img;
        });
        let currentFrame = 0;
        let frameCounter = 0;

        // Cargar imágenes de obstáculos
        const obstacleImages = ["assets/obstacle1.png", "assets/obstacle2.png", "assets/obstacle3.png"].map(src => {
            const img = new Image();
            img.src = src;
            img.onload = onImageLoad;
            img.onerror = () => console.error(`Error al cargar la imagen: ${src}`);
            return img;
        });

        // Cargar imágenes decorativas (nubes)
        const decorativeImages = [
            { img: new Image(), x: canvas.width, y: 400, speed: 2 },
            { img: new Image(), x: canvas.width + 300, y: 550, speed: 3 },
            { img: new Image(), x: canvas.width + 600, y: 750, speed: 1.5 },
        ];
        decorativeImages.forEach((deco, index) => {
            deco.img.src = `./cloud${index + 1}.png`;
            deco.img.onload = onImageLoad;
            deco.img.onerror = () => console.error(`Error al cargar la imagen: cloud${index + 1}.png`);
        });

        // Cargar imágenes del avión
        const planeImages = ["assets/plane.png", "assets/plane1.png"].map(src => {
            const img = new Image();
            img.src = src;
            img.onload = onImageLoad;
            img.onerror = () => console.error(`Error al cargar la imagen: ${src}`);
            return img;
        });
        let currentPlaneFrame = 0;
        let planeFrameCounter = 0;

        // Contador de imágenes cargadas
        let imagesLoaded = 0;
        const totalImages = playerImages.length + obstacleImages.length + decorativeImages.length + planeImages.length;

        function onImageLoad() {
            imagesLoaded++;
            console.log(`Imagen cargada: ${imagesLoaded}/${totalImages}`);
            if (imagesLoaded === totalImages) {
                console.log("Todas las imágenes cargadas. Iniciando juego...");
                gameLoop();
            }
        }

        // Función para ajustar el tamaño del canvas y escalar el juego
        function resizeCanvas() {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Relación de aspecto del juego (baseWidth / baseHeight = 16:9)
            const gameAspectRatio = baseWidth / baseHeight;

            // Relación de aspecto de la pantalla
            const screenAspectRatio = windowWidth / windowHeight;

            // Calcular la escala en función de la relación de aspecto
            if (screenAspectRatio > gameAspectRatio) {
                // Pantalla más ancha que el juego (16:10 o similar)
                scale = windowHeight / baseHeight;
            } else {
                // Pantalla más estrecha que el juego (16:9 o similar)
                scale = windowWidth / baseWidth;
            }

            // Aumentar el factor de escala en pantallas pequeñas
            if (windowWidth < 768) {
                scale *= 1.5; // Aumentar el tamaño de los objetos en un 50% en pantallas pequeñas
            }

            // Ajustar el tamaño del canvas para mantener la relación de aspecto del juego
            canvas.width = baseWidth * scale;
            canvas.height = baseHeight * scale;

            // Ajustar la posición inicial del jugador y otros elementos
            player.y = canvas.height - 200 * scale;
            player.width = 150 * scale;
            player.height = 150 * scale;
            player.x = 100 * scale;
            player.jumpPower = -15 * scale;
            player.gravity = 0.5 * scale;

            // Ajustar la velocidad del juego
            gameSpeed = 5 * scale;

            // Ajustar la posición de las nubes
            decorativeImages.forEach(deco => {
                deco.y = (400 + Math.random() * 100) * scale;
                deco.speed = (Math.random() * 2 + 1) * scale;
            });

            // Ajustar la posición y tamaño del cartel
            signX = canvas.width;
            signY = canvas.height - 720 * scale;
        }

        // Función para verificar la orientación de la pantalla
        function checkOrientation() {
            if (window.innerHeight > window.innerWidth) {
                // Modo vertical
                orientationMessage.style.display = "flex";
                canvas.style.display = "none";
            } else {
                // Modo horizontal
                orientationMessage.style.display = "none";
                canvas.style.display = "block";
                resizeCanvas();
            }
        }

        // Bloquear la orientación en horizontal
        function lockOrientation() {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock("landscape").catch(() => {
                    console.log("La API de orientación no es compatible o no se pudo bloquear.");
                });
            }
        }

        // Verificar la orientación al cargar y al cambiar el tamaño de la ventana
        window.addEventListener("load", () => {
            console.log("Página cargada. Verificando orientación...");
            checkOrientation();
            lockOrientation();
        });
        window.addEventListener("resize", checkOrientation);
        window.addEventListener("orientationchange", checkOrientation);

        let obstacles = [];

        // Sonidos
        const jumpSound = new Audio('./jump.wav');
        const gameOverSound = new Audio('./gameover.wav');

        // Función para verificar colisiones
        function checkCollision(rect1, rect2) {
            const buffer = 20 * scale;
            return (
                rect1.x + buffer < rect2.x + rect2.width - buffer &&
                rect1.x + rect1.width - buffer > rect2.x + buffer &&
                rect1.y + buffer < rect2.y + rect2.height - buffer &&
                rect1.y + rect1.height - buffer > rect2.y + buffer
            );
        }

        // Función para dibujar las nubes decorativas
        function drawDecorative() {
            decorativeImages.forEach(deco => {
                const cloudWidth = 100 * scale;
                const cloudHeight = 70 * scale;
                ctx.drawImage(deco.img, deco.x, deco.y, cloudWidth, cloudHeight);
                deco.x -= deco.speed;

                if (deco.x + cloudWidth < 0) {
                    deco.x = canvas.width;
                    deco.y = (400 + Math.random() * 100) * scale;
                    deco.speed = (Math.random() * 2 + 1) * scale;
                }
            });
        }

        // Función para dibujar el avión
        function drawSign() {
            const signWidth = 600 * scale;
            const signHeight = 140 * scale;
            ctx.drawImage(planeImages[currentPlaneFrame], signX, signY, signWidth, signHeight);
            signX -= gameSpeed;

            if (signX + signWidth < 0) {
                signX = canvas.width;
            }

            // Alternar las imágenes del avión cada 10 fotogramas
            planeFrameCounter++;
            if (planeFrameCounter % 5 === 0) {
                currentPlaneFrame = (currentPlaneFrame + 1) % planeImages.length;
            }
        }

        // Actualizar el estado del juego
        function update() {
            if (isGameOver || !gameStarted || isPaused) return; // No actualizar si el juego está pausado
            console.log("Actualizando el juego...");
            
            if (score % 500 === 0 && score !== 0) {
                gameSpeed += 0.5 * scale;
            }
            
            player.y += player.dy;
            player.dy += player.gravity;
            if (player.y >= canvas.height - 200 * scale) {
                player.y = canvas.height - 200 * scale;
                player.dy = 0;
                player.grounded = true;
                player.jumps = 0;
            }

            if (Math.random() < 0.008) {
                let size = (Math.random() * 100 + 80) * scale;
                let img = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
                obstacles.push({
                    x: canvas.width,
                    y: canvas.height - size - 55 * scale,
                    width: size,
                    height: size,
                    img: img
                });
            }
            
            obstacles.forEach(obstacle => obstacle.x -= gameSpeed);
            obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
            
            obstacles.forEach(obstacle => {
                if (checkCollision(player, obstacle)) {
                    isGameOver = true;
                    isPaused = true; // Pausar el juego cuando hay Game Over
                    gameOverSound.play();
                    showScoreForm();
                }
            });
            
            frameCounter++;
            if (frameCounter % 5 === 0) {
                currentFrame = (currentFrame + 1) % playerImages.length;
            }
            
            score++;
        }

        // Dibujar el juego
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log("Dibujando el juego...");
            
            drawDecorative();
            drawSign();

            ctx.fillStyle = "white";
            const groundY = canvas.height - 60 * scale;
            const groundHeight = 10 * scale;
            ctx.fillRect(0, groundY, canvas.width, groundHeight);

            ctx.drawImage(playerImages[currentFrame], player.x, player.y, player.width, player.height);
            
            obstacles.forEach(obstacle => {
                ctx.drawImage(obstacle.img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            });
            
            ctx.fillStyle = "white";
            ctx.font = `${40 * scale}px Arial`;
            ctx.fillText("Score: " + score, 100 * scale, 50 * scale);
            
            if (isGameOver) {
                drawGameOver();
            }
        }

        // Dibujar pantalla de Game Over
        function drawGameOver() {
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "white";
            ctx.font = `${60 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
            ctx.font = `${40 * scale}px Arial`;
            ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 50 * scale);
        }

        // Dibujar menú de inicio
        function drawStartMenu() {
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "white";
            ctx.font = `${60 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText("Presiona 'Iniciar Partida' para comenzar", canvas.width / 2, canvas.height / 2);
        }

        // Función para iniciar el juego
        function startGame() {
            gameStarted = true;
            startButton.style.display = "none"; // Ocultar el botón de inicio
        }

        // Función para reiniciar el juego
        function resetGame() {
            // Restablecer las variables del juego
            player = { 
                x: 100 * scale, 
                y: canvas.height - 200 * scale, 
                width: 150 * scale, 
                height: 150 * scale, 
                dy: 0, 
                gravity: 0.5 * scale, 
                jumpPower: -15 * scale, 
                grounded: false, 
                jumps: 0, 
                maxJumps: 2
            };
            gameSpeed = 5 * scale;
            score = 0;
            isGameOver = false;
            gameStarted = false;
            isPaused = false;
            obstacles = [];
            signX = canvas.width;
            signY = canvas.height - 220 * scale;

            // Ajustar el tamaño del canvas
            resizeCanvas();

            // Mostrar el botón de inicio
            startButton.style.display = "block";

            // Mostrar la pantalla de inicio
            drawStartMenu();
        }

        // Mostrar el formulario para guardar el score
        function showScoreForm() {
            scoreForm.style.display = "block";
        }

        // Guardar el score en localStorage
        function saveScore() {
            const playerName = playerNameInput.value.trim();
            if (playerName === "") {
                alert("Por favor, ingresa tu nombre.");
                return;
            }

            // Obtener los scores guardados o inicializar un array vacío
            const scores = JSON.parse(localStorage.getItem("scores")) || [];

            // Agregar el nuevo score
            scores.push({ name: playerName, score: score });

            // Ordenar los scores de mayor a menor
            scores.sort((a, b) => b.score - a.score);

            // Guardar en localStorage
            localStorage.setItem("scores", JSON.stringify(scores));

            // Ocultar el formulario y reiniciar el juego
            scoreForm.style.display = "none";
            resetGame(); // Reiniciar el juego después de guardar el score
        }

        // Cancelar el guardado del score
        function cancelScore() {
            scoreForm.style.display = "none";
            resetGame();
        }

        // Mostrar la lista de scores
        function showScores() {
            const scores = JSON.parse(localStorage.getItem("scores")) || [];
            scoresUl.innerHTML = ""; // Limpiar la lista

            if (scores.length === 0) {
                scoresUl.innerHTML = "<li>No hay puntuaciones guardadas.</li>";
            } else {
                scores.forEach((score, index) => {
                    const li = document.createElement("li");
                    li.textContent = `${index + 1}. ${score.name}: ${score.score}`;
                    scoresUl.appendChild(li);
                });
            }

            scoresList.style.display = "block";
        }

        // Ocultar la lista de scores
        function hideScores() {
            scoresList.style.display = "none";
        }

        // Bucle principal del juego
        function gameLoop() {
            if (!gameStarted) {
                drawStartMenu();
            } else {
                if (!isPaused) { // Solo actualizar y dibujar si el juego no está pausado
                    update();
                    draw();
                }
            }
            requestAnimationFrame(gameLoop);
        }

        // Evento de teclado para la barra espaciadora
        document.addEventListener("keydown", (event) => {
    // Saltar con la barra espaciadora
    if (event.code === "Space" && !buttonsPressed) {
        if (player.jumps < player.maxJumps) {
            player.dy = player.jumpPower;
            player.grounded = false;
            player.jumps++;
            jumpSound.play();
            // Iniciar el score después del primer salto
            if (!scoreStarted) {
                scoreStarted = true;
            }
        }
    }

    // Reiniciar el juego con la tecla "R" en cualquier momento
    if (event.code === "KeyR") {
        resetGame();
    }

    // Guardar el score con la tecla "Enter" (Return)
    if (event.code === "Enter" && scoreForm.style.display === "block") {
        saveScore();
    }

    // Cancelar el guardado del score con la tecla "Escape"
    if (event.code === "Escape" && scoreForm.style.display === "block") {
        cancelScore();
    }
});

// Evitar el comportamiento predeterminado de "Enter" en el campo de texto
playerNameInput.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
        event.preventDefault(); // Evitar el comportamiento predeterminado
        saveScore(); // Guardar el score
    }
});

        

        // Evento de toque para dispositivos móviles (solo para saltar)
        document.addEventListener("touchstart", (event) => {
            if (gameStarted && player.jumps < player.maxJumps && !buttonsPressed) {
                player.dy = player.jumpPower;
                player.grounded = false;
                player.jumps++;
                jumpSound.play();
            }
        });

        // Ajustar el tamaño del canvas al cambiar el tamaño de la ventana
        window.addEventListener("resize", resizeCanvas);

        // Eventos para los botones de control
        document.querySelectorAll('#controls button').forEach(button => {
            button.addEventListener('mousedown', () => {
                buttonsPressed = true;
            });
            button.addEventListener('mouseup', () => {
                buttonsPressed = false;
            });
            button.addEventListener('touchstart', () => {
                buttonsPressed = true;
            });
            button.addEventListener('touchend', () => {
                buttonsPressed = false;
            });
        });