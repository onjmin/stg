// ゲームオブジェクトのクラス
export class Player {
	x = 0;
	y = 0;
	speed = 5;
	fireRate = 0.2; // 発射間隔を秒単位で設定
	fireTimer = 0;
	hitboxRadius = 5;

	draw(ctx: CanvasRenderingContext2D) {
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.hitboxRadius * 2.5, 0, Math.PI * 2);
		ctx.fillStyle = "#4299e1";
		ctx.fill();
		ctx.closePath();
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
	width = 30;
	height = 30;
	color: string;
	speed = 4;
	hitboxRadius = 10;
	fireTimer = 0;

	constructor({
		x,
		y,
		health,
		scoreValue,
		color = "#e53e3e",
	}: {
		x: number;
		y: number;
		health: number;
		scoreValue: number;
		color?: string;
	}) {
		this.x = x;
		this.y = y;
		this.health = health;
		this.scoreValue = scoreValue;
		this.color = color;
	}

	update(deltaTime: number) {
		this.y += this.speed * 60 * deltaTime;
	}

	draw(ctx: CanvasRenderingContext2D) {
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
		super({ x, y, health, scoreValue, color });
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
		super({ x, y, health, scoreValue, color });
	}
}

export class Boss extends Enemy {
	targetX: number;
	fireTimer = 0;
	patterns = [
		{ time: 1, type: "spread", speed: 4 },
		{ time: 2, type: "circular", speed: 2 },
		{ time: 3, type: "spiral", speed: 2 },
		{ time: 4, type: "random", speed: 6 },
	];
	currentPatternIndex = 0;
	patternTimer = 0;
	width = 100;
	height = 100;
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
		super({ x, y, health, scoreValue, color: "#f56565" });
		this.targetX = x;
		this.maxHealth = health;
	}

	update(deltaTime: number) {
		this.x += (this.targetX - this.x) * this.speed * 60 * deltaTime;
		this.fireTimer += deltaTime;
		this.patternTimer += deltaTime;
	}

	draw(ctx: CanvasRenderingContext2D) {
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
		const healthBarWidth = this.width;
		const healthBarHeight = 10;
		const healthBarX = this.x - healthBarWidth / 2;
		const healthBarY = this.y - this.height / 2 - healthBarHeight - 5;
		ctx.fillStyle = "#333";
		ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
		const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
		ctx.fillStyle = "#27ae60";
		ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
	}
}
