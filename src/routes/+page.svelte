<script lang="ts">
    import { tick } from "svelte";
    import {
        Boss,
        Bullet,
        Enemy,
        Player,
        SpreadEnemy,
        StraightEnemy,
    } from "$lib/class";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    let score = $state(0);
    let lives = $state(3);
    let isGameOver = $state(false);
    let isGameStarted = $state(false);
    let keys = $state<{ [key: string]: boolean }>({});

    let isInvincible = $state(false);
    let invincibilityTimer = $state(0);
    const INVINCIBILITY_DURATION = 4; // 秒単位に変更

    let player = $state(new Player());
    let enemies = $state<Enemy[]>([]);
    let playerBullets = $state<Bullet[]>([]);
    let enemyBullets = $state<Bullet[]>([]);
    let boss = $state<Boss | null>(null);

    let waveIndex = $state(0);
    let gameTime = $state(0);
    const enemyWaves = [
        { time: 1, type: "straight", x: 50 },
        { time: 2, type: "straight", x: 150 },
        { time: 3, type: "straight", x: 250 },
        { time: 4, type: "straight", x: 50 },
        { time: 5, type: "spread", x: 150 },
        { time: 6, type: "spread", x: 250 },
        { time: 7, type: "straight", x: 100 },
        { time: 8, type: "spread", x: 200 },
        { time: 9, type: "straight", x: 150 },
        { time: 10, type: "straight", x: 50 },
        { time: 11, type: "straight", x: 150 },
        { time: 12, type: "spread", x: 250 },
        { time: 13, type: "straight", x: 50 },
        { time: 14, type: "spread", x: 150 },
        { time: 15, type: "straight", x: 250 },
    ];

    const isMobile =
        "ontouchstart" in globalThis || navigator.maxTouchPoints > 0;

    const startGame = () => {
        isGameStarted = true;
        isGameOver = false;
        score = 0;
        lives = 3;
        enemies = [];
        playerBullets = [];
        enemyBullets = [];
        boss = null;
        waveIndex = 0;
        gameTime = 0;
        isInvincible = false;
        invincibilityTimer = 0;
        if (canvas) {
            player.x = canvas.width / 2;
            player.y = canvas.height - 80;
        }
        lastTimestamp = performance.now(); // ゲーム開始時にタイムスタンプを初期化
    };

    let animationFrameId: number;
    let lastTimestamp: number = 0;

    $effect(() => {
        if (!isGameStarted || isGameOver) {
            return;
        }

        const loop = (timestamp: number) => {
            const deltaTime = (timestamp - lastTimestamp) / 1000; // 秒単位の経過時間を計算
            lastTimestamp = timestamp;

            gameTime += deltaTime;

            if (!isMobile) {
                const speed = keys.shift ? player.speed / 2 : player.speed;
                if (keys.arrowleft || keys.a)
                    player.x -= speed * 60 * deltaTime;
                if (keys.arrowright || keys.d)
                    player.x += speed * 60 * deltaTime;
                if (keys.arrowup || keys.w) player.y -= speed * 60 * deltaTime;
                if (keys.arrowdown || keys.s)
                    player.y += speed * 60 * deltaTime;

                player.x = Math.max(
                    player.hitboxRadius,
                    Math.min(player.x, canvas.width - player.hitboxRadius),
                );
                player.y = Math.max(
                    player.hitboxRadius,
                    Math.min(player.y, canvas.height - player.hitboxRadius),
                );
            }

            player.fireTimer += deltaTime;
            if (player.fireTimer >= player.fireRate) {
                playerBullets.push(
                    new Bullet(player.x, player.y, { x: 0, y: -1 }, "player"),
                );
                player.fireTimer = 0;
            }

            if (isInvincible) {
                invincibilityTimer += deltaTime;
                if (invincibilityTimer >= INVINCIBILITY_DURATION) {
                    isInvincible = false;
                    invincibilityTimer = 0;
                }
            }

            playerBullets = playerBullets.filter((b) => {
                b.update(deltaTime);
                return b.y > -b.size;
            });
            enemyBullets = enemyBullets.filter((b) => {
                b.update(deltaTime);
                return (
                    b.y < canvas.height + b.size &&
                    b.x > -b.size &&
                    b.x < canvas.width + b.size
                );
            });

            enemies.forEach((enemy) => {
                enemy.y += enemy.speed * 60 * deltaTime;
                enemy.fireTimer += deltaTime;

                if (enemy instanceof StraightEnemy) {
                    if (enemy.fireTimer >= enemy.fireRate) {
                        enemyBullets.push(
                            new Bullet(
                                enemy.x,
                                enemy.y + enemy.height,
                                { x: 0, y: 1 },
                                "enemy",
                                "#a0aec0",
                            ),
                        );
                        enemy.fireTimer = 0;
                    }
                } else if (enemy instanceof SpreadEnemy) {
                    if (enemy.fireTimer >= enemy.fireRate) {
                        const angles = [-30, -15, 0, 15, 30];
                        angles.forEach((angle) => {
                            const rad = (angle * Math.PI) / 180;
                            const speedX = Math.sin(rad) * 3;
                            const speedY = Math.cos(rad) * 3;
                            enemyBullets.push(
                                new Bullet(
                                    enemy.x,
                                    enemy.y + enemy.height,
                                    { x: speedX, y: speedY },
                                    "enemy",
                                    "#a0aec0",
                                ),
                            );
                        });
                        enemy.fireTimer = 0;
                    }
                }
            });
            enemies = enemies.filter(
                (enemy) => enemy.y < canvas.height + enemy.height,
            );

            if (waveIndex < enemyWaves.length) {
                const wave = enemyWaves[waveIndex];
                if (gameTime >= wave.time) {
                    if (wave.type === "straight") {
                        enemies.push(new StraightEnemy(wave.x, -50, 10, 10));
                    } else if (wave.type === "spread") {
                        enemies.push(new SpreadEnemy(wave.x, -50, 15, 20));
                    }
                    waveIndex++;
                }
            }

            if (
                waveIndex >= enemyWaves.length &&
                enemies.length === 0 &&
                !boss
            ) {
                boss = new Boss(canvas.width / 2, 100, 500, 1000);
            }

            if (boss) {
                boss.update(deltaTime);
                if (Math.abs(boss.x - boss.targetX) < 5) {
                    boss.targetX =
                        Math.random() * (canvas.width - boss.width) +
                        boss.width / 2;
                }

                const currentPattern = boss.patterns[boss.currentPatternIndex];
                if (boss.patternTimer >= currentPattern.time) {
                    boss.currentPatternIndex =
                        (boss.currentPatternIndex + 1) % boss.patterns.length;
                    boss.patternTimer = 0;
                }

                if (boss.fireTimer >= 0.5) {
                    // 0.5秒ごとに発射
                    const bulletSpeed = currentPattern.speed;
                    switch (currentPattern.type) {
                        case "spread":
                            for (let i = -2; i <= 2; i++) {
                                const angle = i * 15;
                                const rad = (angle * Math.PI) / 180;
                                const speedX = Math.sin(rad) * bulletSpeed;
                                const speedY = Math.cos(rad) * bulletSpeed;
                                enemyBullets.push(
                                    new Bullet(
                                        boss.x,
                                        boss.y + boss.height / 2,
                                        { x: speedX, y: speedY },
                                        "enemy",
                                        "#ecc94b",
                                        bulletSpeed,
                                        8,
                                    ),
                                );
                            }
                            break;
                        case "circular": {
                            const numBullets = 12;
                            for (let i = 0; i < numBullets; i++) {
                                const angle = (i / numBullets) * Math.PI * 2;
                                const speedX = Math.sin(angle) * bulletSpeed;
                                const speedY = Math.cos(angle) * bulletSpeed;
                                enemyBullets.push(
                                    new Bullet(
                                        boss.x,
                                        boss.y + boss.height / 2,
                                        { x: speedX, y: speedY },
                                        "enemy",
                                        "#ecc94b",
                                        bulletSpeed,
                                        6,
                                    ),
                                );
                            }
                            break;
                        }
                        case "spiral": {
                            const numSpiralBullets = 8;
                            const rotationSpeed = boss.fireTimer;
                            for (let i = 0; i < numSpiralBullets; i++) {
                                const angle =
                                    (i / numSpiralBullets) * Math.PI * 2 +
                                    rotationSpeed;
                                const speedX = Math.sin(angle) * bulletSpeed;
                                const speedY = Math.cos(angle) * bulletSpeed;
                                enemyBullets.push(
                                    new Bullet(
                                        boss.x,
                                        boss.y + boss.height / 2,
                                        { x: speedX, y: speedY },
                                        "enemy",
                                        "#ecc94b",
                                        bulletSpeed,
                                        6,
                                    ),
                                );
                            }
                            break;
                        }
                        case "random":
                            if (Math.random() > 0.5) {
                                enemyBullets.push(
                                    new Bullet(
                                        boss.x,
                                        boss.y + boss.height / 2,
                                        { x: Math.random() * 2 - 1, y: 1 },
                                        "enemy",
                                        "#ecc94b",
                                        bulletSpeed,
                                        6,
                                    ),
                                );
                            }
                            break;
                    }
                    boss.fireTimer = 0;
                }
            }

            const checkCollisions = () => {
                const newPlayerBullets = [...playerBullets];
                const newEnemies = [...enemies];
                const newEnemyBullets = [...enemyBullets];
                let newScore = score;

                newPlayerBullets.forEach((bullet, bIndex) => {
                    let hitEnemy = false;
                    newEnemies.forEach((enemy, eIndex) => {
                        const distance = Math.hypot(
                            bullet.x - enemy.x,
                            bullet.y - enemy.y,
                        );
                        if (distance < enemy.hitboxRadius + bullet.size) {
                            hitEnemy = true;
                            enemy.health -= 1;
                            if (enemy.health <= 0) {
                                newScore += enemy.scoreValue;
                                newEnemies.splice(eIndex, 1);
                            }
                        }
                    });

                    if (boss && !hitEnemy) {
                        const distance = Math.hypot(
                            bullet.x - boss.x,
                            bullet.y - boss.y,
                        );
                        if (distance < boss.hitboxRadius + bullet.size) {
                            hitEnemy = true;
                            boss.health -= 1;
                            if (boss.health <= 0) {
                                newScore += boss.scoreValue;
                                boss = null;
                            }
                        }
                    }

                    if (!hitEnemy) {
                        newPlayerBullets.splice(bIndex, 1);
                    }
                });

                if (!isInvincible) {
                    newEnemies.forEach((enemy, eIndex) => {
                        const distance = Math.hypot(
                            enemy.x - player.x,
                            enemy.y - player.y,
                        );
                        if (
                            distance <
                            player.hitboxRadius + enemy.hitboxRadius
                        ) {
                            lives--;
                            if (lives <= 0) {
                                isGameOver = true;
                            } else {
                                isInvincible = true;
                            }
                            newEnemies.splice(eIndex, 1);
                        } else if (enemy.y > canvas.height) {
                            newEnemies.splice(eIndex, 1);
                        }
                    });

                    newEnemyBullets.forEach((bullet, bIndex) => {
                        const distance = Math.hypot(
                            bullet.x - player.x,
                            bullet.y - player.y,
                        );
                        if (distance < player.hitboxRadius + bullet.size) {
                            newEnemyBullets.splice(bIndex, 1);
                            lives--;
                            if (lives <= 0) {
                                isGameOver = true;
                            } else {
                                isInvincible = true;
                            }
                        }
                    });
                } else {
                    newEnemies.forEach((enemy, eIndex) => {
                        if (enemy.y > canvas.height) {
                            newEnemies.splice(eIndex, 1);
                        }
                    });
                }

                playerBullets = newPlayerBullets;
                enemies = newEnemies;
                enemyBullets = newEnemyBullets;
                score = newScore;
            };

            checkCollisions();

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (
                !isInvincible ||
                (isInvincible &&
                    Math.floor((invincibilityTimer * 60) / 10) % 2 === 0)
            ) {
                player.draw(ctx);
            }
            for (const b of playerBullets) {
                b.draw(ctx);
            }
            for (const e of enemies) {
                e.draw(ctx);
            }
            for (const b of enemyBullets) {
                b.draw(ctx);
            }
            if (boss) {
                boss.draw(ctx);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
        keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keys[e.key.toLowerCase()] = false;
    };

    let lastTouchX = 0;
    let lastTouchY = 0;
    function handleTouchStart(e: TouchEvent) {
        if (!isGameStarted || isGameOver) {
            startGame();
        } else {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            player.x = lastTouchX;
            player.y = lastTouchY;
        }
    }
    function handleTouchMove(e: TouchEvent) {
        if (!isGameStarted || isGameOver) return;
        const currentTouchX = e.touches[0].clientX;
        const currentTouchY = e.touches[0].clientY;
        const deltaX = currentTouchX - lastTouchX;
        const deltaY = currentTouchY - lastTouchY;
        player.x += deltaX;
        player.y += deltaY;
        lastTouchX = currentTouchX;
        lastTouchY = currentTouchY;
    }
    function handleTouchEnd() {}

    $effect(() => {
        if (canvas) {
            ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
            resizeCanvas();
            player.x = canvas.width / 2;
            player.y = canvas.height - 80;
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("resize", resizeCanvas);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("resize", resizeCanvas);
        };
    });

    function resizeCanvas() {
        const gameContainer = document.querySelector(
            ".relative.max-w-lg",
        ) as HTMLElement;
        if (gameContainer) {
            canvas.width = gameContainer.offsetWidth;
            canvas.height = gameContainer.offsetHeight;
        }
    }

    const bossHealthPercentage = $derived(
        boss ? (boss.health / boss.maxHealth) * 100 : 0,
    );
</script>

<svelte:head>
    <link
        href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div
    class="bg-gray-900 text-white font-['M_PLUS_Rounded_1c'] flex flex-col justify-center items-center h-screen overflow-hidden"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
>
    <div
        class="relative max-w-lg w-full h-full my-4 shadow-lg rounded-lg overflow-hidden"
    >
        <canvas
            bind:this={canvas}
            class="bg-black border-2 border-gray-600 w-full h-full touch-none"
        ></canvas>

        <div
            class="absolute top-0 left-0 w-full flex justify-between p-4 box-border pointer-events-none z-10"
        >
            <div class="text-xl font-bold p-2 bg-gray-700 rounded-lg shadow-lg">
                スコア: {score}
            </div>
            <div class="text-xl font-bold p-2 bg-gray-700 rounded-lg shadow-lg">
                残機: {lives}
            </div>
        </div>

        <div
            class="absolute top-2 left-1/2 -translate-x-1/2 w-4/5 md:w-3/5 h-6 bg-gray-700 rounded-full shadow-lg overflow-hidden"
            class:hidden={!boss}
        >
            <div
                class="h-full bg-red-500 transition-all duration-300"
                style:width={`${bossHealthPercentage}%`}
            ></div>
        </div>

        <div
            class="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-center z-20 p-4"
            class:hidden={isGameStarted}
        >
            <h1 class="text-4xl sm:text-6xl font-extrabold text-blue-400 mb-6">
                スマホで遊べるSTG
            </h1>
            <p class="text-lg sm:text-2xl font-semibold mb-8 text-gray-300">
                画面をタッチして左右に移動。<br />
                PCでは十字キーで操作。<br />
                弾は自動で発射されます。
            </p>
            <button
                onclick={startGame}
                class="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-full text-xl sm:text-3xl font-bold transition-transform transform hover:scale-105 shadow-lg"
            >
                ゲームスタート
            </button>
        </div>

        <div
            class="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-center z-20 p-4"
            class:hidden={!isGameOver}
        >
            <h2 class="text-6xl font-extrabold text-red-500 mb-4 animate-pulse">
                ゲームオーバー
            </h2>
            <p class="text-3xl font-semibold text-gray-300 mb-8">
                最終スコア: {score}
            </p>
            <button
                onclick={startGame}
                class="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-full text-xl sm:text-3xl font-bold transition-transform transform hover:scale-105 shadow-lg"
            >
                リスタート
            </button>
        </div>
    </div>

    <div class="md:hidden absolute bottom-5 w-full flex justify-center gap-5">
        <button
            ontouchstart={() => {
                keys["a"] = true;
            }}
            ontouchend={() => {
                keys["a"] = false;
            }}
            class="bg-gray-600 text-white rounded-full w-20 h-20 text-3xl flex justify-center items-center cursor-pointer select-none shadow-lg active:scale-95 transition-transform"
            >◀</button
        >
        <button
            ontouchstart={() => {
                keys["d"] = true;
            }}
            ontouchend={() => {
                keys["d"] = false;
            }}
            class="bg-gray-600 text-white rounded-full w-20 h-20 text-3xl flex justify-center items-center cursor-pointer select-none shadow-lg active:scale-95 transition-transform"
            >▶</button
        >
    </div>
</div>
