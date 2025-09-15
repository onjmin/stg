<script lang="ts">
    import { quintOut } from "svelte/easing";
    import { Tween } from "svelte/motion";
    import bossImageAnger from "$lib/assets/standing/boss0000.png";
    import bossImageNomal from "$lib/assets/standing/boss0001.png";
    import bossImageSad from "$lib/assets/standing/boss0002.png";
    import playerImage from "$lib/assets/standing/player.png";
    import {
        Boss,
        Bullet,
        Enemy,
        Player,
        SpreadEnemy,
        StraightEnemy,
    } from "$lib/class"; // 既存のステート変数はそのまま
    import EmbedPart from "$lib/components/EmbedPart.svelte";
    // ✅ 修正箇所: 効果音インスタンスをインポート
    import {
        bulletSound,
        createSoundEffect,
        damageSound,
        glazeSound,
    } from "$lib/sound.js";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let score = $state(0);
    let lives = $state(3);
    let isGameOver = $state(false);
    let isGameStarted = $state(false);
    let keys = $state<{ [key: string]: boolean }>({});
    let isPaused = $state(false);
    let isInvincible = $state(false);
    let invincibilityTimer = $state(0);
    const INVINCIBILITY_DURATION = 4;
    let player = $state<Player | null>(null);
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
    let lastTimestamp: number = 0;
    let animationFrameId: number;
    let bossHealthPercentage = $state(100);

    let isDialogueActive = $state(false);
    let dialogueIndex = $state(0);
    let isGameClear = $state(false);
    let isKeyDown = $state(false); // ✅ 追加: キーが押されているかどうかのフラグ

    let embedUrl = $state("");

    const preBattleDialogue = [
        {
            speaker: "boss",
            text: "よく来たな、テメェ。ここがテメェの墓場だ。",
            image: bossImageAnger,
        },
        { speaker: "player", text: "キミがこの世界の歪みの根源か！" },
        {
            speaker: "boss",
            text: "歪み？フッ...オレこそがこの世界の支配者だ！テメェみたいな異分子は消えてもらう！",
            image: bossImageNomal,
        },
        {
            speaker: "player",
            text: "そんな理不尽な秩序、ボクがぶち壊してやる！",
        },
        {
            speaker: "boss",
            text: "口だけは達者なようだな...なら力で示してみせろ！",
            image: bossImageAnger,
        },
    ];

    const postBattleDialogue = [
        {
            speaker: "boss",
            text: "ぐ、ぐああああああ…この、オレが……",
            image: bossImageSad,
        },
        {
            speaker: "boss",
            text: "まさか、こんな未熟な存在に…敗れるとは…。",
            image: bossImageSad,
        },
        {
            speaker: "player",
            text: "未熟かもしれないけど、ボクには守りたいものがある！その思いが、キミより強かっただけだ。",
        },
        {
            speaker: "boss",
            text: "そうか…そうだな…。",
            image: bossImageSad,
        },
        {
            speaker: "boss",
            text: "…これで、この世界の歪みは…消えるのか…。",
            image: bossImageSad,
        },
        {
            speaker: "player",
            text: "ああ、ボクが新しい未来を作るんだ。",
        },
    ];

    let dialogueState = $state<"preBattle" | "postBattle" | "none">("none");
    let currentDialogueScript = $state(preBattleDialogue);

    const playerOpacity = new Tween(0, { duration: 300, easing: quintOut });
    const bossOpacity = new Tween(0, { duration: 300, easing: quintOut });

    const startGame = () => {
        isGameStarted = true;
        isGameOver = false;
        isGameClear = false;
        isDialogueActive = false;
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
        dialogueState = "preBattle";
        currentDialogueScript = preBattleDialogue;
        if (!player) {
            player = new Player();
        }
        if (canvas) {
            player.x = canvas.width / 2;
            player.y = canvas.height - 80;
        }
        lastTimestamp = performance.now();
        embedUrl = "https://soundcloud.com/k-innq/yo-kai_disco_remix";
    };

    const startDialogue = () => {
        isPaused = true;
        isDialogueActive = true;
        dialogueIndex = 0;
        updateDialogueDisplay(currentDialogueScript[0].speaker); // ✅ 修正箇所: ボス出現時のSE
        if (dialogueState === "preBattle") {
        } else if (dialogueState === "postBattle") {
            // ボス撃破時のSEを鳴らす場合はここに
        }
    };

    function handleNextDialogue() {
        if (!isDialogueActive) return;

        if (dialogueIndex < currentDialogueScript.length - 1) {
            dialogueIndex++;
            updateDialogueDisplay(currentDialogueScript[dialogueIndex].speaker);
        } else {
            isDialogueActive = false;
            if (dialogueState === "preBattle") {
                isPaused = false;
                lastTimestamp = performance.now();
                embedUrl = "https://soundcloud.com/vcln/tohohu_iwasi";
            } else if (dialogueState === "postBattle") {
                isGameClear = true;
                isPaused = true;
            }
            dialogueState = "none";
        }
    }

    function updateDialogueDisplay(speaker: string) {
        if (speaker === "player") {
            playerOpacity.target = 1;
            bossOpacity.target = 0.3;
        } else {
            playerOpacity.target = 0.3;
            bossOpacity.target = 1;
        }
    }

    const loop = (timestamp: number) => {
        if (!player) return;

        const deltaTime = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        if (isPaused) {
            animationFrameId = requestAnimationFrame(loop);
            return;
        }

        gameTime += deltaTime;

        const speed = keys.shift ? player.speed / 2 : player.speed;
        if (keys.arrowleft || keys.a) player.x -= speed * 60 * deltaTime;
        if (keys.arrowright || keys.d) player.x += speed * 60 * deltaTime;
        if (keys.arrowup || keys.w) player.y -= speed * 60 * deltaTime;
        if (keys.arrowdown || keys.s) player.y += speed * 60 * deltaTime;

        player.x = Math.max(
            player.hitboxRadius,
            Math.min(player.x, canvas.width - player.hitboxRadius),
        );
        player.y = Math.max(
            player.hitboxRadius,
            Math.min(player.y, canvas.height - player.hitboxRadius),
        );

        player.fireTimer += deltaTime;
        if (player.fireTimer >= player.fireRate) {
            playerBullets.push(
                new Bullet({
                    x: player.x,
                    y: player.y,
                    direction: { x: 0, y: -1 },
                    owner: "player",
                    damage: 5,
                    color: "#fa6973",
                }),
            );
            player.fireTimer = 0; // ✅ 修正箇所: プレイヤーの弾発射音
            bulletSound?.play();
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
                        new Bullet({
                            x: enemy.x,
                            y: enemy.y + enemy.height,
                            direction: { x: 0, y: 1 },
                            owner: "enemy",
                            color: enemy.bulletColor,
                        }),
                    );
                    enemy.fireTimer = 0; // ✅ 修正箇所: 敵の弾発射音
                    bulletSound?.play();
                }
            } else if (enemy instanceof SpreadEnemy) {
                if (enemy.fireTimer >= enemy.fireRate) {
                    const angles = [-30, -15, 0, 15, 30];
                    angles.forEach((angle) => {
                        const rad = (angle * Math.PI) / 180;
                        const speedX = Math.sin(rad);
                        const speedY = Math.cos(rad);
                        enemyBullets.push(
                            new Bullet({
                                x: enemy.x,
                                y: enemy.y + enemy.height,
                                direction: { x: speedX, y: speedY },
                                owner: "enemy",
                                color: enemy.bulletColor,
                            }),
                        );
                    });
                    enemy.fireTimer = 0; // ✅ 修正箇所: 敵の弾発射音
                    bulletSound?.play();
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
                    enemies.push(
                        new StraightEnemy({
                            x: wave.x,
                            y: -50,
                            health: 5,
                            scoreValue: 10,
                        }),
                    );
                } else if (wave.type === "spread") {
                    enemies.push(
                        new SpreadEnemy({
                            x: wave.x,
                            y: -50,
                            health: 10,
                            scoreValue: 20,
                        }),
                    );
                }
                waveIndex++;
            }
        }

        if (
            waveIndex >= enemyWaves.length &&
            enemies.length === 0 &&
            !boss &&
            !isDialogueActive
        ) {
            startDialogue();
            boss = new Boss({
                x: canvas.width / 2,
                y: 100,
                health: 500,
                scoreValue: 1000,
            });
        }

        if (boss) {
            boss.update(deltaTime, canvas.width, canvas.height);

            const currentPattern = boss.patterns[boss.currentPatternIndex];
            if (boss.patternTimer >= currentPattern.time) {
                boss.currentPatternIndex =
                    (boss.currentPatternIndex + 1) % boss.patterns.length;
                boss.patternTimer = 0;
            }

            if (boss.fireTimer >= 0.5) {
                const bulletSpeed = currentPattern.speed;
                switch (currentPattern.type) {
                    case "spread":
                        for (let i = -2; i <= 2; i++) {
                            const angle = i * 15;
                            const rad = (angle * Math.PI) / 180;
                            const speedX = Math.sin(rad);
                            const speedY = Math.cos(rad);
                            enemyBullets.push(
                                new Bullet({
                                    x: boss.x,
                                    y: boss.y + boss.height / 2,
                                    direction: { x: speedX, y: speedY },
                                    owner: "enemy",
                                    speed: bulletSpeed,
                                    size: 6,
                                    color: boss.bulletColor,
                                }),
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
                                new Bullet({
                                    x: boss.x,
                                    y: boss.y + boss.height / 2,
                                    direction: { x: speedX, y: speedY },
                                    owner: "enemy",
                                    speed: bulletSpeed,
                                    size: 6,
                                    color: boss.bulletColor,
                                }),
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
                                new Bullet({
                                    x: boss.x,
                                    y: boss.y + boss.height / 2,
                                    direction: { x: speedX, y: speedY },
                                    owner: "enemy",
                                    speed: bulletSpeed,
                                    size: 6,
                                    color: boss.bulletColor,
                                }),
                            );
                        }
                        break;
                    }
                    case "random":
                        if (Math.random() > 0.5) {
                            enemyBullets.push(
                                new Bullet({
                                    x: boss.x,
                                    y: boss.y + boss.height / 2,
                                    direction: {
                                        x: Math.random() * 2 - 1,
                                        y: 1,
                                    },
                                    owner: "enemy",
                                    speed: bulletSpeed,
                                    size: 6,
                                    color: boss.bulletColor,
                                }),
                            );
                        }
                        break;
                }
                boss.fireTimer = 0;
            }
        }

        const checkCollisions = () => {
            if (!player) return;

            const bulletsToRemove = new Set();
            const enemiesToRemove = new Set();
            let newScore = score;

            playerBullets.forEach((bullet) => {
                enemies.forEach((enemy) => {
                    const distance = Math.hypot(
                        bullet.x - enemy.x,
                        bullet.y - enemy.y,
                    );
                    if (distance < enemy.hitboxRadius + bullet.size) {
                        bulletsToRemove.add(bullet);
                        enemy.health -= bullet.damage;
                        if (enemy.health <= 0) {
                            enemiesToRemove.add(enemy);
                            newScore += enemy.scoreValue; // ✅ 修正箇所: 敵を倒した時のSE
                        }
                    }
                });

                if (boss) {
                    const distance = Math.hypot(
                        bullet.x - boss.x,
                        bullet.y - boss.y,
                    );
                    if (distance < boss.hitboxRadius + bullet.size) {
                        bulletsToRemove.add(bullet);
                        boss.health -= bullet.damage; // ✅ 修正箇所: ボス被弾時のSE
                        if (boss.health <= 0) {
                            newScore += boss.scoreValue;
                            boss = null;
                            currentDialogueScript = postBattleDialogue;
                            startDialogue();
                            dialogueState = "postBattle";
                            embedUrl = "";
                            return;
                        }
                        bossHealthPercentage =
                            (boss.health / boss.maxHealth) * 100;
                    }
                }
            });
            let glaze = false;
            if (!isInvincible) {
                enemyBullets.forEach((bullet) => {
                    if (!player) return;
                    const distance = Math.hypot(
                        bullet.x - player.x,
                        bullet.y - player.y,
                    );
                    const d = player.hitboxRadius + bullet.size;
                    if (distance < d) {
                        bulletsToRemove.add(bullet);
                        lives--;
                        damageSound?.play();
                        if (lives <= 0) {
                            isGameOver = true;
                        } else {
                            isInvincible = true;
                        }
                    } else if (distance < d * 2 && !glaze) {
                        glazeSound?.play();
                        glaze = true;
                    }
                });

                enemies.forEach((enemy) => {
                    if (!player) return;
                    const distance = Math.hypot(
                        enemy.x - player.x,
                        enemy.y - player.y,
                    );
                    const d = player.hitboxRadius + enemy.hitboxRadius;
                    if (distance < d) {
                        lives--;
                        damageSound?.play();
                        if (lives <= 0) {
                            isGameOver = true;
                        } else {
                            isInvincible = true;
                        }
                    } else if (distance < d * 2 && !glaze) {
                        glazeSound?.play();
                        glaze = true;
                    }
                });
            }
            playerBullets = playerBullets.filter(
                (bullet) => !bulletsToRemove.has(bullet),
            );
            enemies = enemies.filter(
                (enemy) => enemy.health > 0 && !enemiesToRemove.has(enemy),
            );
            enemyBullets = enemyBullets.filter(
                (bullet) => !bulletsToRemove.has(bullet),
            );
            score = newScore;
        };

        checkCollisions();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (
            !isInvincible ||
            (isInvincible &&
                Math.floor((invincibilityTimer * 60) / 10) % 2 === 0)
        ) {
            player.draw(ctx, deltaTime);
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

    $effect(() => {
        if (
            isGameStarted &&
            !isGameOver &&
            !isGameClear &&
            !isPaused &&
            !isDialogueActive
        ) {
            animationFrameId = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(animationFrameId);
    });

    const handleDialogueKeyDown = (e: KeyboardEvent) => {
        if (isDialogueActive || isGameClear) {
            e.preventDefault(); // キーが新しく押されたときだけ処理を実行
            if (!isKeyDown) {
                handleNextDialogue();
                isKeyDown = true;
            }
        } else {
            keys[e.key.toLowerCase()] = true;
        }
    };
    const handleDialogueKeyUp = (e: KeyboardEvent) => {
        if (isDialogueActive || isGameClear) {
            // ✅ 修正: ダイアログ中はキーアップでフラグをリセット
            isKeyDown = false;
        } else {
            keys[e.key.toLowerCase()] = false;
        }
    };

    let lastTouchX = 0;
    let isMoving = $state(false);

    function handleTouchStart(e: TouchEvent) {
        if (!isGameStarted || isGameOver || isGameClear) {
            startGame();
            return;
        }
        if (isDialogueActive) {
            e.preventDefault();
            handleNextDialogue();
        } else {
            e.preventDefault();
            isMoving = true;
            lastTouchX = e.touches[0].clientX;
        }
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isGameStarted || isGameOver || !player || isDialogueActive) return;
        e.preventDefault();
        const currentTouchX = e.touches[0].clientX;
        const deltaX = currentTouchX - lastTouchX;
        player.x += deltaX;
        lastTouchX = currentTouchX;
    }

    function handleTouchEnd() {
        isMoving = false;
    }

    const handleBlur = () => {
        isPaused = true;
    };
    const handleFocus = () => {
        isPaused = false;
        lastTimestamp = performance.now();
    };

    $effect(() => {
        if (!player) return;
        if (canvas) {
            ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
            resizeCanvas();
            player.x = canvas.width / 2;
            player.y = canvas.height - 80;
        }

        window.addEventListener("keydown", handleDialogueKeyDown);
        window.addEventListener("keyup", handleDialogueKeyUp);
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("keydown", handleDialogueKeyDown);
            window.removeEventListener("keyup", handleDialogueKeyUp);
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
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
                画面を指でなぞって移動。<br />
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
        {#if isGameOver}
            <div
                class="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-center z-20 p-4"
            >
                <h2
                    class="text-6xl font-extrabold text-red-500 mb-4 animate-pulse"
                >
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
        {/if}

        {#if isGameClear}
            <div
                class="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-center z-20 p-4"
            >
                <h2
                    class="text-6xl font-extrabold text-yellow-400 mb-4 animate-pulse"
                >
                    ゲームクリア！
                </h2>
                <p class="text-3xl font-semibold text-gray-300 mb-8">
                    最終スコア: {score}
                </p>
                <p class="text-xl font-semibold text-gray-400 mb-8">
                    世界に平和が戻った。
                </p>
                <button
                    onclick={startGame}
                    class="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-full text-xl sm:text-3xl font-bold transition-transform transform hover:scale-105 shadow-lg"
                >
                    もう一度プレイ
                </button>
            </div>
        {/if}

        {#if isDialogueActive}
            <div
                tabindex="0"
                role="button"
                onkeydown={handleDialogueKeyDown}
                class="absolute inset-0 z-30 flex flex-col p-4 pointer-events-auto"
                onclick={handleNextDialogue}
            >
                <div class="flex-grow flex justify-between items-end p-4 mb-2">
                    <img
                        src={playerImage}
                        alt={player?.name}
                        class="h-2/3 max-h-80 object-contain transition-opacity duration-300"
                        style:opacity={playerOpacity.current}
                    />
                    <img
                        src={currentDialogueScript[dialogueIndex].speaker ===
                        "boss"
                            ? currentDialogueScript[dialogueIndex].image
                            : bossImageNomal}
                        alt={boss?.name}
                        class="h-2/3 max-h-80 object-contain transition-opacity duration-300"
                        style:opacity={bossOpacity.current}
                    />
                </div>
                <div
                    class="w-full bg-gray-800 bg-opacity-90 rounded-xl p-4 shadow-2xl border-2 border-blue-400 text-lg sm:text-xl font-semibold"
                >
                    <p class="text-blue-200 mb-1">
                        {currentDialogueScript[dialogueIndex].speaker ===
                        "player"
                            ? player?.name
                            : boss?.name}
                    </p>
                    <p class="text-white">
                        {currentDialogueScript[dialogueIndex].text}
                    </p>
                </div>
            </div>
        {/if}
    </div>
</div>

<EmbedPart {embedUrl} />
