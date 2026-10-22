export function getTaskMediaPlaybackError(code?: number): string {
  if (code === 2) return "音视频读取中断，请重试。";
  if (code === 3 || code === 4) return "浏览器无法播放此文件的编码，或文件已损坏。可以下载原文件查看。";
  return "音视频播放失败，请重试或下载原文件。";
}

/** Release the decoder as well as pausing: closed previews must not keep audio alive. */
export function stopTaskMediaPlayback(media: Pick<HTMLMediaElement, "pause" | "removeAttribute" | "load">): void {
  media.pause();
  media.removeAttribute("src");
  media.load();
}

/** Effect replay may reuse a DOM node after cleanup released its source. */
export function bindTaskMediaPlaybackSource(media: Pick<HTMLMediaElement, "getAttribute" | "setAttribute" | "pause" | "removeAttribute" | "load">, url: string): () => void {
  if (media.getAttribute("src") !== url) {
    media.setAttribute("src", url);
    media.load();
  }
  return () => stopTaskMediaPlayback(media);
}
