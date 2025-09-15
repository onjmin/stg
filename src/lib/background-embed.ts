const saveCache = (
	cachedKey: string,
	thumbnail: string | null,
	title: string | null,
	author: string | null,
) => {
	if (thumbnail) localStorage.setItem(`${cachedKey}###thumbnail`, thumbnail);
	if (title) localStorage.setItem(`${cachedKey}###title`, title);
	if (author) localStorage.setItem(`${cachedKey}###author`, author);
};

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
let g_callback = () => {};
export const onEnded = (callback: () => void) => {
	g_callback = callback;
};

let soundCloudVolume = 48;
// スマホ版の音量調整
if (globalThis?.window && globalThis.window.innerWidth < 768) {
	soundCloudVolume = 64;
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
			soundCloudController.target.getCurrentSound((res: any) => {
				const thumbnail = res.artwork_url || res.user.avatar_url;
				const title = res.title;
				const author = res.user.username;
			});
		});
		soundCloudController.target?.bind(window.SC.Widget.Events.FINISH, () =>
			g_callback(),
		);
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
