import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { TaskFileNode } from "@/shared/model/task-model";
import type { TaskFileTextSelection } from "@/features/tasks/files/components/TaskFileViewer";
import type { TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";
import { captureFileAnnotationElement } from "@/features/tasks/files/lib/capture-file-annotation";
import "@/features/tasks/styles/task-file-html-annotations.css";

type Props = {
  file: TaskFileNode;
  html?: string;
  annotationMode?: boolean;
  annotations?: TaskFileAnnotation[];
  draftAnchor?: TaskFileAnnotation["anchor"] | null;
  activeThreadId?: string | null;
  onThreadSelect?: (id: string) => void;
  onSelection?: (selection: TaskFileTextSelection | null) => void;
};
type Box = { left: number; top: number; width: number; height: number };
type Hover = { element: HTMLElement; label: string; selector: string; box: Box };
type Marker = { annotation: TaskFileAnnotation; number: number; box: Box };
const EMPTY_ANNOTATIONS: TaskFileAnnotation[] = [];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const boxStyle = (box: Box): CSSProperties => ({ left: box.left, top: box.top, width: box.width, height: box.height });

/** Only the preview copy is sanitized. The saved source and original binary stay intact. */
function staticHtml(source: string): string {
  const document = new DOMParser().parseFromString(source, "text/html");
  document.querySelectorAll("script,iframe,frame,frameset,object,embed,base,link,meta[http-equiv]").forEach(element => element.remove());
  document.querySelectorAll("*").forEach(element => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const localSvgReference = element.localName === "use" && attribute.value.startsWith("#");
      if (/^on/i.test(name) || ["srcdoc", "action", "formaction", "formtarget", "target", "download", "ping", "autofocus"].includes(name) || (["href", "xlink:href"].includes(name) && !localSvgReference)) element.removeAttribute(attribute.name);
    }
  });
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: blob: https: http:; font-src 'none'; media-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
  document.head.prepend(policy);
  const fallback = document.createElement("style");
  fallback.textContent = 'html{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}';
  document.head.append(fallback);
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

function elementLabel(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const classes = [...element.classList].slice(0, 2).map(value => `.${value}`).join("");
  return `${element.tagName.toLowerCase()}${id}${classes}`;
}

function elementSelector(element: HTMLElement): string {
  const document = element.ownerDocument;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if (current.id) {
      const id = `#${CSS.escape(current.id)}`;
      if (document.querySelectorAll(id).length === 1) { parts.unshift(id); break; }
    }
    const tag = current.tagName.toLowerCase();
    if (current === document.body) { parts.unshift("body"); break; }
    const siblings = [...(current.parentElement?.children ?? [])].filter(sibling => sibling.tagName === current!.tagName);
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
    current = current.parentElement;
  }
  return parts.join(" > ") || "body";
}

function targetElement(event: Event, document: Document): HTMLElement | null {
  let element = event.target as Element | null;
  if (!element || element.nodeType !== 1) return null;
  while (element && element.namespaceURI !== "http://www.w3.org/1999/xhtml") element = element.parentElement;
  if (!element || element === document.head) return null;
  return (element === document.documentElement ? document.body : element) as HTMLElement;
}

function measuredBox(element: Element, frame: HTMLIFrameElement): Box | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { left: frame.offsetLeft + rect.left, top: frame.offsetTop + rect.top, width: rect.width, height: rect.height };
}

function anchorBox(anchor: TaskFileAnnotation["anchor"], document: Document, frame: HTMLIFrameElement): Box | null {
  if (anchor.elementSelector) {
    try {
      const element = document.querySelector(anchor.elementSelector);
      if (element) return measuredBox(element, frame);
    } catch { /* Older invalid selectors retain their fixed region fallback. */ }
  }
  const region = anchor.region;
  return region ? { left: frame.offsetLeft + region.x * frame.clientWidth, top: frame.offsetTop + region.y * frame.clientHeight, width: region.width * frame.clientWidth, height: region.height * frame.clientHeight } : null;
}

export function TaskHtmlAnnotations({ file, html, annotationMode = false, annotations = EMPTY_ANNOTATIONS, draftAnchor, activeThreadId, onThreadSelect, onSelection }: Props) {
  const ui = useGlobalUi();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const hoverRef = useRef<Hover | null>(null);
  const heightMeasureRef = useRef({ width: 0, viewport: 0, natural: 0, viewportDependent: false });
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<{ html: string | null; error: string }>({ html: html ?? null, error: "" });
  const [loadedDocument, setLoadedDocument] = useState<Document | null>(null);
  const [frameHeight, setFrameHeight] = useState(240);
  const [hover, setHover] = useState<Hover | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [draftBox, setDraftBox] = useState<Box | null>(null);
  const srcDoc = useMemo(() => source.html === null ? "" : staticHtml(source.html), [source.html]);
  const canAnnotate = annotationMode && Boolean(onSelection);

  useEffect(() => {
    let cancelled = false;
    setSource({ html: html ?? null, error: "" });
    if (html !== undefined) return;
    if (!file.blobId) { setSource({ html: null, error: "文件没有可读取的 HTML 内容。" }); return; }
    readDiscussionBlob(file.blobId).then(async blob => {
      if (!blob) throw new Error("附件原文件无法读取，请重新上传。");
      const text = await blob.text();
      if (!cancelled) setSource({ html: text, error: "" });
    }).catch(error => { if (!cancelled) setSource({ html: null, error: error instanceof Error ? error.message : "HTML 文件读取失败。" }); });
    return () => { cancelled = true; };
  }, [html, file.blobId, attempt]);

  useEffect(() => {
    setLoadedDocument(null);
    setFrameHeight(240);
    setHover(null);
    hoverRef.current = null;
    heightMeasureRef.current = { width: 0, viewport: 0, natural: 0, viewportDependent: false };
    setMarkers([]);
    setDraftBox(null);
  }, [srcDoc]);

  useEffect(() => {
    const frame = frameRef.current;
    const document = loadedDocument;
    const view = document?.defaultView;
    if (!frame || !document?.body || !view) return;
    let request = 0;
    const measure = () => {
      cancelAnimationFrame(request);
      request = requestAnimationFrame(() => {
        const body = document.body;
        const marginBottom = parseFloat(view.getComputedStyle(body).marginBottom) || 0;
        const natural = Math.ceil(Math.max(180, body.scrollHeight, body.getBoundingClientRect().bottom + view.scrollY + marginBottom));
        const previous = heightMeasureRef.current;
        if (previous.width !== frame.clientWidth) previous.viewportDependent = false;
        // A vh-based page can grow in lockstep with its iframe. Keep its viewport
        // once detected instead of endlessly extending the preview.
        if (previous.width === frame.clientWidth && Math.abs(frame.clientHeight - previous.viewport) > 1 && Math.abs((natural - previous.natural) - (frame.clientHeight - previous.viewport)) < 1) previous.viewportDependent = true;
        heightMeasureRef.current = { width: frame.clientWidth, viewport: frame.clientHeight, natural, viewportDependent: previous.viewportDependent };
        if (!previous.viewportDependent) setFrameHeight(height => height === natural ? height : natural);
        setMarkers(annotations.map((annotation, index) => ({ annotation, number: index + 1 })).filter(({ annotation }) => annotation.version === (file.version ?? 1) && annotation.anchor.kind === "region").flatMap(({ annotation, number }) => {
          const box = anchorBox(annotation.anchor, document, frame);
          return box ? [{ annotation, number, box }] : [];
        }));
        setDraftBox(draftAnchor?.kind === "region" ? anchorBox(draftAnchor, document, frame) : null);
        const current = hoverRef.current;
        if (current && canAnnotate) {
          const box = measuredBox(current.element, frame);
          if (box) { const next = { ...current, box }; hoverRef.current = next; setHover(next); }
        }
      });
    };
    const move = (event: MouseEvent) => {
      if (!canAnnotate) return;
      const element = targetElement(event, document);
      const box = element && measuredBox(element, frame);
      if (!element || !box) { hoverRef.current = null; setHover(null); return; }
      const next = { element, label: elementLabel(element), selector: elementSelector(element), box };
      hoverRef.current = next;
      setHover(next);
    };
    const leave = () => { hoverRef.current = null; setHover(null); };
    const click = (event: MouseEvent) => {
      const element = targetElement(event, document);
      if (!element) return;
      // File preview never submits a form or follows source-document navigation.
      if (element.closest("a,form,button,input,select,textarea") || canAnnotate) event.preventDefault();
      if (!canAnnotate) return;
      event.stopPropagation();
      const target = element.getBoundingClientRect();
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (!width || !height || !target.width || !target.height) return;
      const x = clamp(target.left / width);
      const y = clamp(target.top / height);
      const region = { x, y, width: Math.max(0, clamp(target.right / width) - x), height: Math.max(0, clamp(target.bottom / height) - y) };
      if (!region.width || !region.height) return;
      const outside = frame.getBoundingClientRect();
      const label = elementLabel(element);
      onSelection?.({ text: (element.innerText ?? element.textContent ?? "").trim(), location: label, elementLabel: label, elementSelector: elementSelector(element), region, rect: { left: outside.left + target.left * (outside.width / width), bottom: outside.top + target.bottom * (outside.height / height) }, screenshotPromise: captureFileAnnotationElement(element).catch(() => undefined) });
    };
    const blockSubmit = (event: Event) => event.preventDefault();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(frame);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseleave", leave);
    document.addEventListener("click", click, true);
    document.addEventListener("submit", blockSubmit, true);
    document.addEventListener("load", measure, true);
    view.addEventListener("resize", measure);
    view.addEventListener("scroll", measure);
    measure();
    if (!canAnnotate) leave();
    return () => {
      cancelAnimationFrame(request);
      observer.disconnect();
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", blockSubmit, true);
      document.removeEventListener("load", measure, true);
      view.removeEventListener("resize", measure);
      view.removeEventListener("scroll", measure);
    };
  }, [loadedDocument, annotations, canAnnotate, draftAnchor, file.version, onSelection]);

  useEffect(() => {
    if (!activeThreadId) return;
    markerRefs.current.get(activeThreadId)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeThreadId, loadedDocument, markers.length]);

  if (source.error) return <div className="task-file-html-annotations__error"><p role="alert">{ui(source.error)}</p><button onClick={() => setAttempt(value => value + 1)} type="button">{ui("重试")}</button></div>;
  if (source.html === null) return <p role="status">{ui("正在读取附件…")}</p>;
  return <div className="task-file-html-annotations">
    {!loadedDocument && <p className="task-file-html-annotations__loading" role="status">{ui("正在打开预览…")}</p>}
    <div className="task-file-html-annotations__preview">
      <iframe aria-busy={!loadedDocument} className="task-file-html-annotations__frame" onError={() => setSource(value => ({ ...value, error: "HTML 文件无法预览，请下载原文件查看。" }))} onMouseLeave={() => { hoverRef.current = null; setHover(null); }} onLoad={event => {
        try {
          const document = event.currentTarget.contentDocument;
          if (!document?.body) throw new Error("HTML 文件无法预览，请下载原文件查看。");
          setLoadedDocument(document);
        } catch (error) { setSource(value => ({ ...value, error: error instanceof Error ? error.message : "HTML 文件无法预览，请下载原文件查看。" })); }
      }} ref={frameRef} sandbox="allow-same-origin" srcDoc={srcDoc} style={{ height: frameHeight }} title={file.name} />
      {markers.map(({ annotation, number, box }) => <div className={`task-file-html-annotations__box${activeThreadId === annotation.id ? " task-file-html-annotations__box--active" : ""}`} key={annotation.id} style={boxStyle(box)}>
        <button aria-label={ui("标注") + ` ${number}: ${annotation.anchor.location}`} aria-pressed={activeThreadId === annotation.id} className="task-file-html-annotations__number" onClick={() => onThreadSelect?.(annotation.id)} ref={element => { if (element) markerRefs.current.set(annotation.id, element); else markerRefs.current.delete(annotation.id); }} type="button">{number}</button>
      </div>)}
      {draftBox && <div aria-hidden="true" className="task-file-html-annotations__box task-file-html-annotations__box--draft" style={boxStyle(draftBox)} />}
      {canAnnotate && hover && <div aria-hidden="true" className="task-file-html-annotations__box task-file-html-annotations__box--hover" style={boxStyle(hover.box)}><span className="task-file-html-annotations__label">{hover.label}</span></div>}
    </div>
  </div>;
}
