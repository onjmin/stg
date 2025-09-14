import { Howl, Howler } from "howler";

/**
 * 個々の効果音を管理するクラス
 */
export class SoundEffect {
	private howl: Howl;
	private volumeFactor: number;

	// 全体音量を管理する静的プロパティ
	public static globalVolume: number = 1.0;

	constructor(src: string, volumeFactor: number = 1.0) {
		this.volumeFactor = volumeFactor;

		this.howl = new Howl({
			src: [src],
			html5: true,
			volume: this.calculateVolume(), // 初期音量を設定
		});
	}

	// 最終的な音量を計算するプライベートメソッド
	private calculateVolume(): number {
		return this.volumeFactor * SoundEffect.globalVolume;
	}

	// 再生メソッド
	public play() {
		this.howl.play();
	}

	// 個別の音量係数を更新し、Howlインスタンスの音量を再設定する
	public setVolumeFactor(factor: number) {
		this.volumeFactor = factor;
		this.howl.volume(this.calculateVolume());
	}

	// 全体音量が変わった際に、個別の音量も更新する静的メソッド
	public static updateAllVolumes() {
		Howler.volume(SoundEffect.globalVolume);
		// Note: Howler.volume() を呼び出すと、すべてのHowlインスタンスの音量が自動的に更新されます。
		// そのため、個々のHowlインスタンスに対して手動で volume() を呼び出す必要はありません。
		// このメソッドは、全体音量の変更を外部に知らせるためのもので、Howler.volume()を呼び出すだけで十分です。
	}

	// 全体音量を変更する静的メソッド
	public static setGlobalVolume(volume: number) {
		SoundEffect.globalVolume = volume;
		SoundEffect.updateAllVolumes();
	}
}

// ファクトリー関数やインスタンス定義
export const createSoundEffect = (src: string, volumeFactor: number = 1.0) => {
	if (!src) return null;
	return new SoundEffect(src, volumeFactor);
};

// プレイヤー被弾
export const damageSound = createSoundEffect(
	"https://rpgen.org/dq/sound/res/1845.mp3",
	0.1,
);

// グレイズ音（敵の弾がプレイヤーの当たり判定近くに来た時に発動）
export const glazeSound = createSoundEffect(
	"https://rpgen.org/dq/sound/res/1846.mp3",
	0.1,
);

// 弾の音
export const bulletSound = createSoundEffect(
	"https://rpgen.org/dq/sound/res/221.mp3",
	0.1,
);

// スペルカード
export const SpellSound = createSoundEffect(
	"https://rpgen.org/dq/sound/res/222.mp3",
);

// // 何かを発動
// export const bossSpellSound = createSoundEffect(
// 	"https://rpgen.org/dq/sound/res/224.mp3",
// );
