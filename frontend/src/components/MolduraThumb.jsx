// frontend/src/components/MolduraThumb.jsx
import { useMemo, useState } from 'react';

function limparPath(p) {
  if (!p) return null;
  // remove domínio (se vier absoluto) e normaliza barras
  const s = String(p).replace(/^https?:\/\/[^/]+/i, '');
  return s.replace(/\/{2,}/g, '/');
}

export default function MolduraThumb({ moldura, onZoom, size = 64 }) {
  const alt = moldura?.nome || moldura?.descricao || 'Moldura';

  const candidatos = useMemo(() => {
    const code = (moldura?.codigo_principal || '').trim();
    const urlBanco = limparPath(moldura?.imagem_url);

    const swap = (u) => {
      if (!u) return null;
      if (/\.jpg$/i.test(u)) return u.replace(/\.jpg$/i, '.png');
      if (/\.png$/i.test(u)) return u.replace(/\.png$/i, '.jpg');
      return null;
    };

    const arr = [
      code ? `/molduras/${code}.jpg` : null,
      code ? `/molduras/${code}.png` : null,
      urlBanco,
      swap(urlBanco),
      '/molduras/placeholder.jpg', // último fallback opcional
    ]
      .filter(Boolean)
      // remove duplicados mantendo a ordem
      .filter((v, i, a) => a.indexOf(v) === i);

    return arr;
  }, [moldura?.codigo_principal, moldura?.imagem_url]);

  const [idx, setIdx] = useState(0);
  const src = candidatos[idx] || null;

  if (!src) {
    return (
      <span className="inline-flex h-16 items-center justify-center rounded border px-3 text-xs text-gray-500 bg-gray-50">
        sem imagem
      </span>
    );
  }

  const isPlaceholder = /\/placeholder\.jpg$/i.test(src);

  return (
    <img
      src={src}
      alt={alt}
      className="h-16 w-auto rounded border bg-gray-50 cursor-zoom-in"
      style={{ maxHeight: size, maxWidth: size * 3 }}
      onClick={() => !isPlaceholder && onZoom?.(src)}
      onError={() => {
        // Avança para o próximo candidato; não há loop porque é stateful
        setIdx((i) => Math.min(i + 1, candidatos.length - 1));
      }}
    />
  );
}
