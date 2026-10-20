import { useEffect, useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import "yet-another-react-lightbox/styles.css";
import "@/features/tasks/styles/task-image-viewer.css";

/** Single-image reading stays inline inside the existing file dialog. */
export function TaskImageViewer({ src, alt }: { src: string; alt: string }) {
  const ui = useGlobalUi();
  const [attempt, setAttempt] = useState(0);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setFullscreenBlocked(false);
    const element = root.current;
    if (!element) return;
    const reportFullscreenError = (event: Event) => {
      if (event.target instanceof Node && element.contains(event.target)) setFullscreenBlocked(true);
    };
    element.addEventListener("fullscreenerror", reportFullscreenError);
    return () => element.removeEventListener("fullscreenerror", reportFullscreenError);
  }, [src]);
  if (!src) return <p className="task-image-viewer-error" role="alert">{ui("图片资源不可用。")}</p>;
  return <div aria-label={ui("图片查看器")} className="task-image-viewer" ref={root}>
    <Lightbox
      carousel={{ finite: true, preload: 0, padding: 16, imageFit: "contain" }}
      controller={{ closeOnEscape: false, disableSwipeNavigation: true }}
      inline={{ className: "task-image-viewer-lightbox", style: { width: "100%", height: "100%" } }}
      key={`${src}:${attempt}`}
      labels={{
        "Zoom in": ui("放大"), "Zoom out": ui("缩小"),
        "Enter Fullscreen": ui("全屏"), "Exit Fullscreen": ui("退出全屏"),
        Lightbox: ui("图片查看器"), "Photo gallery": ui("图片查看器"),
        Slide: ui("图片"), Carousel: ui("图片查看器"),
        "{index} of {total}": "{index} / {total}",
      }}
      plugins={[Inline, Zoom, Fullscreen]}
      on={{ enterFullscreen: () => setFullscreenBlocked(false) }}
      render={{
        buttonPrev: () => null,
        buttonNext: () => null,
        iconLoading: () => <span aria-live="polite" className="task-image-viewer-status"><Spinner /><span>{ui("正在读取图片…")}</span></span>,
        iconError: () => <span className="task-image-viewer-error" role="alert"><span>{ui("图片加载失败，请重试。")}</span><Button onClick={() => setAttempt(value => value + 1)} size="sm" variant="outline">{ui("重试")}</Button></span>,
      }}
      slides={[{ src, alt }]}
      toolbar={{ buttons: ["zoom", "fullscreen"] }}
      zoom={{ maxZoomPixelRatio: 3 }}
    />
    {fullscreenBlocked && <p aria-live="polite" className="task-image-viewer-fullscreen-status" role="status">{ui("浏览器未允许全屏，可以继续在此查看图片。")}</p>}
  </div>;
}
