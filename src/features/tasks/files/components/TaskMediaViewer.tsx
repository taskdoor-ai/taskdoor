import { useEffect, useId, useRef, useState } from "react";
import { Headphones } from "lucide-react";
import {
  MediaController, MediaControlBar, MediaFullscreenButton, MediaLoadingIndicator, MediaMuteButton,
  MediaPlayButton, MediaTimeDisplay, MediaTimeRange, MediaVolumeRange,
} from "media-chrome/react";
import "media-chrome/dist/lang/zh-CN.js";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { bindTaskMediaPlaybackSource, getTaskMediaPlaybackError } from "@/features/tasks/files/lib/task-media-playback";
import "@/features/tasks/styles/task-media-viewer.css";

/** Media Chrome owns transport, seeking, volume, keyboard controls, and video fullscreen. */
export function TaskMediaViewer({ kind, name, url, active = true }: {
  kind: "audio" | "video"; name: string; url: string; active?: boolean;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const playerLabelId = useId();
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [fullscreenError, setFullscreenError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const media = mediaRef.current;
    return media ? bindTaskMediaPlaybackSource(media, url) : undefined;
  }, [url, kind, attempt]);
  useEffect(() => { if (!active) mediaRef.current?.pause(); }, [active]);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const failed = () => setFullscreenError(true);
    wrapper?.addEventListener("fullscreenerror", failed, true);
    return () => wrapper?.removeEventListener("fullscreenerror", failed, true);
  }, []);
  const mediaProps = {
    "aria-label": name, slot: "media", src: url, preload: "metadata" as const,
    onError: () => setError(getTaskMediaPlaybackError(mediaRef.current?.error?.code)),
  };
  return <div className={`task-media-viewer task-media-viewer-${kind}`} ref={wrapperRef}>
    <span className="sr-only" id={playerLabelId}>{locale === "zh-CN" ? kind === "audio" ? "音频播放器" : "视频播放器" : kind === "audio" ? "Audio player" : "Video player"}</span>
    {kind === "audio" && <div className="task-media-audio-art" aria-hidden="true"><Headphones size={64} strokeWidth={1.5} /><span>MP3</span></div>}
    <MediaController aria-labelledby={playerLabelId} audio={kind === "audio"} autohide={kind === "video" ? "2" : "-1"} className="task-media-player" key={`${url}:${kind}:${attempt}`} lang={locale === "zh-CN" ? "zh-CN" : "en"}>
      {kind === "audio" ? <audio {...mediaProps} ref={element => { mediaRef.current = element; }} /> : <video {...mediaProps} playsInline ref={element => { mediaRef.current = element; }} />}
      {kind === "video" && <><MediaPlayButton className="task-media-center-play" slot="centered-chrome" /><MediaLoadingIndicator className="task-media-loading" slot="centered-chrome" /></>}
      {/* Media Chrome 4.19's default slot is its bottom chrome. */}
      <div className="task-media-bottom-chrome">
        <MediaControlBar className="task-media-progress"><MediaTimeRange /></MediaControlBar>
        <MediaControlBar className="task-media-controls">
          <MediaPlayButton />
          <MediaTimeDisplay showDuration />
          <span className="task-media-controls-spacer" />
          <MediaMuteButton />
          <MediaVolumeRange />
          {kind === "video" && <MediaFullscreenButton />}
        </MediaControlBar>
      </div>
      {kind === "video" && error && <div className="task-media-error" slot="dialog"><p role="alert">{ui(error)}</p><Button onClick={() => { setError(""); setAttempt(value => value + 1); }} size="sm" variant="outline">{ui("重试")}</Button></div>}
      {fullscreenError && <p className="task-media-fullscreen-error" role="alert" slot="dialog">{ui("无法进入全屏，可以继续在预览中播放。")}</p>}
    </MediaController>
    {kind === "audio" && error && <div className="task-media-error"><p role="alert">{ui(error)}</p><Button onClick={() => { setError(""); setAttempt(value => value + 1); }} size="sm" variant="outline">{ui("重试")}</Button></div>}
  </div>;
}
