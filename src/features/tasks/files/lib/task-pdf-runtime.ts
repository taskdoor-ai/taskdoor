import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Vite keeps these files local and gives each one its built asset URL. Import
// only the resource requested by PDF.js, rather than loading every CMap/font.
const pdfAssetUrls = import.meta.glob<string>([
  "/node_modules/pdfjs-dist/cmaps/*.bcmap",
  "/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}",
  "/node_modules/pdfjs-dist/wasm/*.{wasm,js}",
], { query: "?url&no-inline", import: "default" });
const assetFolders: Record<string, string> = { cMapUrl: "cmaps", standardFontDataUrl: "standard_fonts", wasmUrl: "wasm" };
class LocalPdfBinaryDataFactory {
  async fetch({ kind, filename }: { kind: string; filename: string }) {
    const loadUrl = pdfAssetUrls[`/node_modules/pdfjs-dist/${assetFolders[kind]}/${filename}`];
    if (!loadUrl) throw new Error("PDF resource is unavailable.");
    const response = await fetch(await loadUrl());
    if (!response.ok) throw new Error("PDF resource could not be loaded.");
    return new Uint8Array(await response.arrayBuffer());
  }
}


export function loadTaskPdfDocument(source: string | Uint8Array) {
  return getDocument({ ...(typeof source === "string" ? { url: source } : { data: source }), BinaryDataFactory: LocalPdfBinaryDataFactory, useWorkerFetch: false, cMapPacked: true });
}
