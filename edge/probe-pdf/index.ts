// PRUEBA DESECHABLE 4 — la causa ya esta en los registros:
//   ReferenceError: DOMMatrix is not defined   (pdfjs-dist 5.7.284)
// pdf.js carga, pero pide APIs del navegador que el servidor no tiene.
//
// Se prueban las dos salidas, en orden, y la respuesta dice cual sirve:
//   A) unpdf — la misma pdf.js empaquetada para correr sin navegador.
//   B) pdf.js con DOMMatrix y Path2D puestos a mano antes de usarla.
//
// El PDF de prueba trae tres palabras en posiciones CONOCIDAS: codigo en x=60,
// descripcion en x=140, precio en x=430. Si no salen las coordenadas, no sirve:
// todo el lector depende de ellas.

import { getDocumentProxy } from "npm:unpdf@1.9.1";
import * as pdfjs from "npm:pdfjs-dist@5.7.284/legacy/build/pdf.mjs";
import { decodeBase64 } from "jsr:@std/encoding@1.0.5/base64";

const MINI =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggMjQxID4+CnN0cmVhbQpCVCAvRjEgMTAgVGYgNjAgNzAwIFRkIChDT0xPMDAwMSkgVGogRVQKQlQgL0YxIDEwIFRmIDE0MCA3MDAgVGQgKFNlbi5NaW8pIFRqIEVUCkJUIC9GMSAxMCBUZiA0MzAgNzAwIFRkICgkOC41NTgsOTEpIFRqIEVUCkJUIC9GMSAxMCBUZiA2MCA2ODAgVGQgKENPTE8wMDAyKSBUaiBFVApCVCAvRjEgMTAgVGYgMTQwIDY4MCBUZCAoQnJhdmEpIFRqIEVUCkJUIC9GMSAxMCBUZiA0MzAgNjgwIFRkICgkMS4yMzQsNTYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDAzMTEgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo2MDMKJSVFT0YK";

const salida = (o: unknown) =>
  new Response(JSON.stringify(o, null, 1), {
    headers: { "Content-Type": "application/json; charset=utf-8",
               "Access-Control-Allow-Origin": "*" },
  });

/** DOMMatrix minimo: pdf.js solo lo usa para componer transformaciones */
function ponerFaltantes() {
  const g: any = globalThis as any;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(init?: any) {
        if (Array.isArray(init) && init.length >= 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
      multiplySelf(o: any) {
        const { a, b, c, d, e, f } = this;
        this.a = a * o.a + c * o.b; this.b = b * o.a + d * o.b;
        this.c = a * o.c + c * o.d; this.d = b * o.c + d * o.d;
        this.e = a * o.e + c * o.f + e; this.f = b * o.e + d * o.f + f;
        return this;
      }
      translateSelf(x = 0, y = 0) { this.e += this.a * x + this.c * y;
                                    this.f += this.b * x + this.d * y; return this; }
      scaleSelf(x = 1, y = x) { this.a *= x; this.b *= x; this.c *= y; this.d *= y; return this; }
      invertSelf() { return this; }
      transformPoint(p: any) { return { x: this.a * p.x + this.c * p.y + this.e,
                                        y: this.b * p.x + this.d * p.y + this.f }; }
      toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }
    };
  }
  if (typeof g.Path2D === "undefined") g.Path2D = class Path2D {};
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData { constructor(public width = 0, public height = 0) {} };
  }
}

async function medir(nombre: string, abrir: (b: Uint8Array) => Promise<any>) {
  const r: any = { via: nombre };
  try {
    const doc = await abrir(decodeBase64(MINI));
    r.paginas = doc.numPages;
    const page = await doc.getPage(1);
    const tc = await page.getTextContent();
    r.elementos = (tc.items ?? []).map((it: any) => ({
      texto: it.str,
      x: Math.round(Number(it.transform?.[4] ?? 0)),
      y: Math.round(Number(it.transform?.[5] ?? 0)),
    })).filter((e: any) => String(e.texto).trim() !== "");
    const xs = r.elementos.map((e: any) => e.x);
    r.sirve = r.elementos.length >= 6 && xs.includes(60) && xs.includes(140) && xs.includes(430);
    r.veredicto = r.sirve ? "ANDA con coordenadas" : "leyo algo pero las posiciones no coinciden";
  } catch (e) {
    r.sirve = false;
    r.error = String((e as Error)?.message ?? e).substring(0, 300);
  }
  return r;
}

Deno.serve(async () => {
  const a = await medir("unpdf@1.9.1", (b) => getDocumentProxy(b));

  ponerFaltantes();
  const b = await medir("pdfjs-dist@5.7.284 + DOMMatrix a mano", async (by) => {
    const t = (pdfjs as any).getDocument({
      data: by, useSystemFonts: false, isEvalSupported: false,
      disableFontFace: true, useWorkerFetch: false,
    });
    return await (t.promise ?? t);
  });

  return salida({
    cuando: new Date().toISOString(),
    recomendado: a.sirve ? "unpdf" : (b.sirve ? "pdfjs con DOMMatrix a mano" : "ninguno"),
    intentos: [a, b],
  });
});
