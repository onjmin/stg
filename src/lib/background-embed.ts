let userActionDone = false;

/**
 * 初回遷移時、ユーザーの初回タップがなければ自動再生不可
 */
const handleUserAction = (callback: () => void) => {
	if (userActionDone) return;
	const play = () => {
		userActionDone = true;
		callback();
		window.removeEventListener("click", play);
		window.removeEventListener("touchstart", play);
	};
	window.addEventListener("click", play);
	window.addEventListener("touchstart", play);
};

export let activeController: Controller | null = null;
export const clearActiveController = () => {
	activeController = null;
};

let soundCloudVolume = 24;
// スマホ版の音量調整
if (globalThis?.window && globalThis.window.innerWidth < 768) {
	soundCloudVolume = 32;
}

type Controller = {
	target: any | null;
	play(): void;
	pause(): void;
	seekTo0(): void;
};

const soundCloudController = new (class implements Controller {
	target: any | null = null;
	play() {
		this.target?.setVolume(soundCloudVolume);
		this.target?.play();
	}
	pause() {
		this.target?.pause();
	}
	seekTo0() {
		this.target?.seekTo(0);
	}
})();

declare global {
	var SC: any;
}
export const embedSoundCloud = ({
	iframeDOM,
}: {
	iframeDOM: HTMLIFrameElement | null;
}) => {
	if (!iframeDOM) return;
	activeController = soundCloudController;
	const ready = () => {
		soundCloudController.target = window.SC.Widget(iframeDOM);
		soundCloudController.target?.bind(window.SC.Widget.Events.READY, () => {
			soundCloudController.play();
		});
		soundCloudController.target?.bind(window.SC.Widget.Events.FINISH, () => {
			soundCloudController.play();
		});
		soundCloudController.target?.bind(
			window.SC.Widget.Events.ERROR,
			console.error,
		);
	};
	if (window.SC?.Widget) setTimeout(ready);
	else {
		const id = setInterval(() => {
			if (!window.SC?.Widget) return;
			clearInterval(id);
			ready();
			handleUserAction(() => soundCloudController.play());
		}, 512);
	}
};
