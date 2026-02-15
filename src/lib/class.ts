import bossImage from "$lib/assets/dot/boss.png";
import playerImage from "$lib/assets/dot/player.png";
import zako from "$lib/assets/dot/zako.png";
import zakoHaneImage from "$lib/assets/dot/zako_hane.png";

export class Player {
	name = "メルト・ガルル";
	x = 0;
	y = 0;
	speed = 5;
	fireRate = 0.2; // 発射間隔を秒単位で設定
	fireTimer = 0;
	hitboxRadius = 5;

	// 画像とアニメーション関連のプロパティを追加
	playerImage: HTMLImageElement;
	spriteWidth = 48; // 各スプライトの幅
	spriteHeight = 48; // 各スプライトの高さ
	animationFrame = 0; // 現在のアニメーションフレーム
	animationTimer = 0;
	animationSpeed = 0.1; // アニメーションの切り替え速度（秒）

	constructor() {
		this.playerImage = new Image();
		this.playerImage.src = playerImage;
	}

	draw(ctx: CanvasRenderingContext2D, deltaTime: number) {
		// アニメーションタイマーを更新
		this.animationTimer += deltaTime;
		if (this.animationTimer >= this.animationSpeed) {
			this.animationFrame = (this.animationFrame + 1) % 3; // 0, 1, 2を繰り返す
			this.animationTimer = 0;
		}

		// 画像を描画
		if (this.playerImage.complete) {
			ctx.drawImage(
				this.playerImage,
				0, // ソース画像のx座標
				this.animationFrame * this.spriteHeight, // ソース画像のy座標 (フレームごとに切り替え)
				this.spriteWidth, // ソース画像の幅
				this.spriteHeight, // ソース画像の高さ
				this.x - this.spriteWidth / 2, // 描画先のx座標 (中央揃え)
				this.y - this.spriteHeight / 2, // 描画先のy座標 (中央揃え)
				this.spriteWidth, // 描画先の幅
				this.spriteHeight, // 描画先の高さ
			);
		}

		// ヒットボックスを描画（デバッグ用）
		// ctx.beginPath();
		// ctx.arc(this.x, this.y, this.hitboxRadius, 0, Math.PI * 2);
		// ctx.strokeStyle = "red";
		// ctx.stroke();
	}
}

export class Bullet {
	x: number;
	y: number;
	direction: { x: number; y: number };
	owner: string;
	color: string;
	speed: number;
	size: number;
	damage: number;
	homing: boolean = false;
	homeStrength: number = 0;

	constructor({
		x,
		y,
		direction,
		owner,
		color = "#6973fa",
		speed = 7,
		size = 5,
		damage = 1,
		homing = false,
		homeStrength = 0,
	}: {
		x: number;
		y: number;
		direction: { x: number; y: number };
		owner: string;
		color?: string;
		speed?: number;
		size?: number;
		damage?: number;
		homing?: boolean;
		homeStrength?: number;
	}) {
		this.x = x;
		this.y = y;
		this.direction = direction;
		this.owner = owner;
		this.color = color;
		this.speed = speed;
		this.size = size;
		this.damage = damage;
		this.homing = homing;
		this.homeStrength = homeStrength;
	}

	update(deltaTime: number, targetX?: number, targetY?: number) {
		// 誘導弾の場合、プレイヤーに向かう
		if (this.homing && targetX !== undefined && targetY !== undefined) {
			const dx = targetX - this.x;
			const dy = targetY - this.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > 0) {
				this.direction.x += (dx / dist) * this.homeStrength * 60 * deltaTime;
				this.direction.y += (dy / dist) * this.homeStrength * 60 * deltaTime;
				// 正規化
				const currentSpeed = Math.sqrt(
					this.direction.x ** 2 + this.direction.y ** 2,
				);
				if (currentSpeed > 0) {
					this.direction.x /= currentSpeed;
					this.direction.y /= currentSpeed;
				}
			}
		}

		this.x += this.direction.x * this.speed * 60 * deltaTime;
		this.y += this.direction.y * this.speed * 60 * deltaTime;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.beginPath();

		// 放射状グラデーションを作成
		const gradient = ctx.createRadialGradient(
			this.x,
			this.y,
			0, // 内側の円 (中心点, 半径0)
			this.x,
			this.y,
			this.size, // 外側の円 (中心点, 弾丸のサイズに合わせた半径)
		);

		// グラデーションの色を設定
		gradient.addColorStop(0, "white"); // 内側は白
		gradient.addColorStop(1, this.color); // 外側はBulletの`color`プロパティで定義された色

		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fillStyle = gradient; // fillStyleにグラデーションを適用
		ctx.fill();
		ctx.closePath();
	}
}

export class Enemy {
	x: number;
	y: number;
	health: number;
	scoreValue: number;
	width = 48;
	height = 48;
	bulletColor: string;
	speed = 4;
	hitboxRadius = 10;
	fireTimer = 0;
	fireRate = 1;
	enemyImage: HTMLImageElement;

	// 東方风格的运动参数
	initialX: number = 0;
	moveType: "straight" | "sine" | "zigzag" = "straight";
	amplitude: number = 0; // 振幅
	frequency: number = 0; // 频率
	phase: number = 0; // 相位

	constructor({
		x,
		y,
		health,
		scoreValue,
		imageSrc,
		bulletColor = "#6973fa",
		moveType = "straight",
		amplitude = 0,
		frequency = 1,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
		imageSrc: string;
		bulletColor?: string;
		moveType?: "straight" | "sine" | "zigzag";
		amplitude?: number;
		frequency?: number;
	}) {
		this.x = x;
		this.y = y;
		this.initialX = x;
		this.health = health;
		this.scoreValue = scoreValue;
		this.bulletColor = bulletColor;
		this.moveType = moveType;
		this.amplitude = amplitude;
		this.frequency = frequency;

		this.enemyImage = new Image();
		this.enemyImage.src = imageSrc;
	}

	update(deltaTime: number, _canvasWidth?: number, _canvasHeight?: number) {
		this.y += this.speed * 60 * deltaTime;

		// 東方风格的ジグザグ运动
		if (this.moveType === "sine") {
			this.x =
				this.initialX +
				Math.sin(this.y * this.frequency * 0.02) * this.amplitude;
		} else if (this.moveType === "zigzag") {
			this.x =
				this.initialX +
				Math.abs(
					((this.y * this.frequency * 0.03) % (this.amplitude * 2)) -
						this.amplitude,
				);
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		// 画像がロード完了しているか確認してから描画
		if (this.enemyImage.complete) {
			ctx.drawImage(
				this.enemyImage,
				this.x - this.width / 2,
				this.y - this.height / 2,
				this.width,
				this.height,
			);
		}
	}
}

export class StraightEnemy extends Enemy {
	fireRate = 1;

	constructor({
		x,
		y,
		health,
		scoreValue,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
	}) {
		super({ x, y, health, scoreValue, imageSrc: zako });
	}
}

export class SineEnemy extends Enemy {
	fireRate = 1.2;

	constructor({
		x,
		y,
		health,
		scoreValue,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
	}) {
		super({
			x,
			y,
			health,
			scoreValue,
			imageSrc: zakoHaneImage,
			moveType: "sine",
			amplitude: 80,
			frequency: 2,
		});
	}
}

export class ZigzagEnemy extends Enemy {
	fireRate = 1.5;

	constructor({
		x,
		y,
		health,
		scoreValue,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
	}) {
		super({
			x,
			y,
			health,
			scoreValue,
			imageSrc: zako,
			moveType: "zigzag",
			amplitude: 100,
			frequency: 3,
		});
	}
}

export class SpreadEnemy extends Enemy {
	fireRate = 1.5;

	constructor({
		x,
		y,
		health,
		scoreValue,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
	}) {
		super({ x, y, health, scoreValue, imageSrc: zakoHaneImage });
	}
}

export class Boss extends Enemy {
	name = "ベノム";

	targetX: number;
	targetY: number;
	moveOffset = { x: 0, y: 0 };

	fireTimer = 0;

	// 東方风格の符パターン
	patterns = [
		{
			time: 1.5,
			type: "spread",
			speed: 4,
			moveOffset: { x: 0.3, y: -0.3 },
			name: "弾符「カタクリ射击」",
		},
		{
			time: 2.5,
			type: "circular",
			speed: 3,
			moveOffset: { x: -0.3, y: 0.3 },
			name: "符「ワイルドチャート」",
		},
		{
			time: 3.5,
			type: "spiral",
			speed: 2.5,
			moveOffset: { x: 0.7, y: 0.7 },
			name: "符「螺旋射击」",
		},
		{
			time: 4.5,
			type: "rice",
			speed: 5,
			moveOffset: { x: -0.7, y: -0.7 },
			name: "符「米粒弹幕」",
		},
		{
			time: 5.5,
			type: "flower",
			speed: 3,
			moveOffset: { x: 0.5, y: 0.5 },
			name: "符「花符」",
		},
		{
			time: 6.5,
			type: "doubleSpiral",
			speed: 2,
			moveOffset: { x: -0.5, y: -0.5 },
			name: "符「二重螺旋」",
		},
		{
			time: 7.5,
			type: "aimed",
			speed: 4,
			moveOffset: { x: 0, y: 0 },
			name: "符「誘導弾」",
		},
		{
			time: 8.5,
			type: "wave",
			speed: 3,
			moveOffset: { x: 0.8, y: -0.8 },
			name: "符「波動射击」",
		},
	];
	currentPatternIndex = 0;
	patternTimer = 0;
	width = 48;
	height = 48;
	hitboxRadius = 25;
	speed = 0.5;
	maxHealth: number;

	constructor({
		x,
		y,
		health,
		scoreValue,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
	}) {
		super({
			x,
			y,
			health,
			scoreValue,
			bulletColor: "#9b68fa",
			imageSrc: bossImage,
		});
		this.targetX = x;
		this.targetY = y;
		this.maxHealth = health;
	}

	update(deltaTime: number, canvasWidth: number, canvasHeight: number) {
		// パターンに応じて目標座標を更新
		const currentPattern = this.patterns[this.currentPatternIndex];
		const targetRelativeX = (currentPattern.moveOffset.x + 1) / 2;
		const targetRelativeY = (currentPattern.moveOffset.y + 1) / 2;

		// 目標座標を画面内に収まるように計算
		this.targetX = targetRelativeX * (canvasWidth - this.width);
		this.targetY = targetRelativeY * (canvasHeight * 0.4 - this.height);

		// オフセットを考慮して中心座標を計算
		this.targetX += this.width / 2;
		this.targetY += this.height / 2;

		// 目標座標に滑らかに移動
		this.x += (this.targetX - this.x) * this.speed * deltaTime;
		this.y += (this.targetY - this.y) * this.speed * deltaTime;

		// タイマーとパターン更新はそのまま
		this.fireTimer += deltaTime;
		this.patternTimer += deltaTime;
	}
}
