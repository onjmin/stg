import bossImage from "$lib/assets/dot/boss.png";
import playerImage from "$lib/assets/dot/player.png";
import zako from "$lib/assets/dot/zako.png";
import zakoHaneImage from "$lib/assets/dot/zako_hane.png";

export class Player {
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

	constructor({
		x,
		y,
		direction,
		owner,
		color = "#f6e05e",
		speed = 7,
		size = 5,
	}: {
		x: number;
		y: number;
		direction: { x: number; y: number };
		owner: string;
		color?: string;
		speed?: number;
		size?: number;
	}) {
		this.x = x;
		this.y = y;
		this.direction = direction;
		this.owner = owner;
		this.color = color;
		this.speed = speed;
		this.size = size;
	}

	update(deltaTime: number) {
		this.x += this.direction.x * this.speed * 60 * deltaTime;
		this.y += this.direction.y * this.speed * 60 * deltaTime;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fillStyle = this.color;
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
	color: string;
	speed = 4;
	hitboxRadius = 10;
	fireTimer = 0;
	enemyImage: HTMLImageElement;

	constructor({
		x,
		y,
		health,
		scoreValue,
		imageSrc, // 新しい引数として画像URLを受け取る
		color = "#e53e3e",
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
		imageSrc: string; // imageSrcは必須
		color?: string;
	}) {
		this.x = x;
		this.y = y;
		this.health = health;
		this.scoreValue = scoreValue;
		this.color = color;

		// 画像を読み込む
		this.enemyImage = new Image();
		this.enemyImage.src = imageSrc;
	}

	update(deltaTime: number, _canvasWidth?: number, _canvasHeight?: number) {
		this.y += this.speed * 60 * deltaTime;
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
		} else {
			// 画像がロードされていない場合は、一時的に元の四角形を描画する
			ctx.beginPath();
			ctx.rect(
				this.x - this.width / 2,
				this.y - this.height / 2,
				this.width,
				this.height,
			);
			ctx.fillStyle = this.color;
			ctx.fill();
			ctx.closePath();
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
		color,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
		color?: string;
	}) {
		super({ x, y, health, scoreValue, color, imageSrc: zako });
	}
}

export class SpreadEnemy extends Enemy {
	fireRate = 1.5;

	constructor({
		x,
		y,
		health,
		scoreValue,
		color,
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
		color?: string;
	}) {
		super({ x, y, health, scoreValue, color, imageSrc: zakoHaneImage });
	}
}

export class Boss extends Enemy {
	// x,y座標の目標地点。画面上の絶対座標
	targetX: number;
	targetY: number;
	// x,y座標の移動のオフセット（-1.0〜1.0）
	moveOffset = { x: 0, y: 0 };

	fireTimer = 0;

	// パターンに移動ロジックを追加
	patterns = [
		// moveOffset: x, y共に-1.0〜1.0で、-1.0が左/上、1.0が右/下を目標にする
		{ time: 1, type: "spread", speed: 4, moveOffset: { x: 0.5, y: -0.5 } },
		{ time: 2, type: "circular", speed: 2, moveOffset: { x: -0.5, y: 0.5 } },
		{ time: 3, type: "spiral", speed: 2, moveOffset: { x: 0.8, y: 0.8 } },
		{ time: 4, type: "random", speed: 6, moveOffset: { x: -0.8, y: -0.8 } },
	];
	currentPatternIndex = 0;
	patternTimer = 0;
	width = 48;
	height = 48;
	hitboxRadius = 25;
	speed = 0.5; // 移動の追従速度（ターゲットにどれだけ速く向かうか）
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
		super({ x, y, health, scoreValue, color: "#f56565", imageSrc: bossImage });
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
