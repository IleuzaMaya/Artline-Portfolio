// frontend/src/components/MolduraThumb.jsx
import { useMemo, useState } from "react";

function limparPath(p) {
  if (!p) return null;
  // remove domínio (se vier absoluto) e normaliza barras
  const s = String(p).replace(/^https?:\/\/[^/]+/i, "");
  return s.replace(/\/{2,}/g, "/");
}

export default function MolduraThumb({ moldura, onZoom, size = 64 }) {
  // Fallbacks de título para evitar "undefined"
  const titulo =
    (moldura?.nome && moldura.nome.trim()) ||
    (moldura?.display && moldura.display.trim()) ||
    (moldura?.codigo_principal && moldura.codigo_principal.trim()) ||
    "Moldura";

  const candidatos = useMemo(() => {
    const code = (moldura?.codigo_principal || "").trim();
    const urlBanco = limparPath(
      moldura?.imagem_url || moldura?.image_url || moldura?.url_imagem || moldura?.imagem
    );

    const swap = (u) => {
      if (!u) return null;
      if (/\.jpg$/i.test(u)) return u.replace(/\.jpg$/i, ".png");
      if (/\.png$/i.test(u)) return u.replace(/\.png$/i, ".jpg");
      return null;
    };

    const arr = [
      code ? `/molduras/${code}.jpg` : null,
      code ? `/molduras/${code}.png` : null,
      urlBanco,
      swap(urlBanco),
      "/molduras/placeholder.jpg", // fallback final opcional
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    return arr;
  }, [
    moldura?.codigo_principal,
    moldura?.imagem_url,
    moldura?.image_url,
    moldura?.url_imagem,
    moldura?.imagem,
  ]);

  const [idx, setIdx] = useState(0);
  const src = candidatos[idx] || null;

  if (!src) {
    // Sem imagem: mostra um “chip” com o título
    return (
      <span className="inline-flex h-16 items-center justify-center rounded border px-3 text-xs text-gray-600 bg-gray-50">
        {titulo}
      </span>
    );
  }

  const isPlaceholder = /\/placeholder\.jpg$/i.test(src);

  return (
    <img
      src={src}
      alt={titulo}
      className="h-16 w-auto rounded border bg-gray-50 cursor-zoom-in"
      style={{ maxHeight: size, maxWidth: size * 3 }}
      onClick={() => !isPlaceholder && onZoom?.(src)}
      onError={() => {
        // tenta o próximo candidato
        setIdx((i) => Math.min(i + 1, candidatos.length - 1));
      }}
    />
  );
}
