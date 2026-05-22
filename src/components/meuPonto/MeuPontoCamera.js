import { useEffect, useRef, useState } from 'react';
import { obterStreamCamera, pararStreamCamera } from '../../utils/meuPontoDeviceAccess';

/**
 * Preview de câmera reutilizando o mesmo MediaStream (evita pedir permissão a cada batida).
 */
export default function MeuPontoCamera({ onReady, onError, style }) {
  const videoRef = useRef(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelled = false;
    let stream = null;

    (async () => {
      try {
        stream = await obterStreamCamera();
        if (cancelled) return;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play();
        }
        onReady?.();
      } catch (e) {
        if (cancelled) return;
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Permissão da câmera negada. Libere em Ajustes do navegador ou do aparelho.'
            : 'Não foi possível acessar a câmera.';
        setErro(msg);
        onError?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      const el = videoRef.current;
      if (el) el.srcObject = null;
      /* Stream global permanece ativo para a próxima batida na mesma sessão */
    };
  }, [onReady, onError]);

  useEffect(() => {
    return () => {
      /* Ao sair do Meu Ponto por completo, o pai chama pararStreamCamera no unmount */
    };
  }, []);

  if (erro) {
    return (
      <p style={{ color: '#fca5a5', fontSize: 14, textAlign: 'center', margin: 0, padding: 16 }}>{erro}</p>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)',
        ...style,
      }}
    />
  );
}

export { pararStreamCamera };
