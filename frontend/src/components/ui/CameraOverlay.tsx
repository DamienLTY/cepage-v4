/**
 * CameraOverlay — Reconnaissance d'étiquette par caméra ou upload photo
 *
 * Deux modes :
 * - Caméra : accès flux vidéo, capture → OCR backend
 * - Upload : sélection image → OCR backend
 * Fallback manuel si l'OCR échoue (saisie libre du nom).
 * Barre de progression douce (0→99% en 10s, puis 100% à la réponse).
 */

import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../lib/wineSearch';

interface Props {
  onClose: () => void;
  /** Appelé avec le texte OCR reconnu et, si disponible, le millésime */
  onResult: (text: string, vintage?: number) => void;
}

export default function CameraOverlay({ onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [status, setStatus] = useState<'starting' | 'ready' | 'processing' | 'error' | 'manual'>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualText, setManualText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Démarrer la caméra au montage (mode caméra)
  useEffect(() => {
    if (mode !== 'camera') return;
    let mounted = true;
    setStatus('starting');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1920 } }
    }).then(stream => {
      if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStatus('ready');
    }).catch(() => {
      if (!mounted) return;
      setErrorMsg('Caméra non disponible. Utilisez l\'upload de photo.');
      setStatus('error');
    });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  const switchToUpload = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setMode('upload');
    setStatus('ready');
    setPreviewUrl(null);
    setErrorMsg('');
  };

  const switchToCamera = () => {
    setMode('camera');
    setStatus('starting');
    setPreviewUrl(null);
    setErrorMsg('');
  };

  // OCR via backend (Claude Vision ou EasyOCR selon disponibilité)
  // Barre de progression : 0→99% en 10s, puis 100% à la réception de la réponse
  const runOcr = async (imageData: string) => {
    setStatus('processing');
    setOcrProgress(0);

    const startTime = Date.now();
    const maxDuration = 10000;
    let ocrFinished = false;
    let animationId: number;

    const animateProgress = () => {
      if (ocrFinished) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / maxDuration, 0.99);
      setOcrProgress(Math.floor(progress * 100));
      if (progress < 0.99) {
        animationId = requestAnimationFrame(animateProgress);
      }
    };
    animationId = requestAnimationFrame(animateProgress);

    try {
      const [header, b64] = imageData.split(',');
      const mediaType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const resp = await fetch(`${BACKEND_URL}/api/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, media_type: mediaType }),
      });

      ocrFinished = true;
      cancelAnimationFrame(animationId);
      setOcrProgress(100);

      const json = await resp.json();

      if (json.ok && (json.text || json.needs_manual)) {
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (json.needs_manual || !json.text) {
          setErrorMsg('Vin non reconnu. Veuillez saisir le nom manuellement.');
          setStatus('manual');
          setManualText('');
        } else {
          onResult(json.text, json.vintage);
        }
      } else {
        setErrorMsg(json.error || 'Aucun texte détecté. Saisissez le nom manuellement.');
        setStatus('manual');
        setManualText('');
      }
    } catch {
      ocrFinished = true;
      cancelAnimationFrame(animationId);
      setErrorMsg('Reconnaissance échouée. Saisissez le nom manuellement.');
      setStatus('manual');
      setManualText('');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    runOcr(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewUrl(dataUrl);
      setStatus('ready');
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const closeOverlay = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="camera-overlay">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button className="camera-close-btn" onClick={closeOverlay}>✕</button>

      {/* Sélecteur de mode */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <button
          onClick={() => mode === 'upload' ? switchToCamera() : undefined}
          style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.85rem',
            background: mode === 'camera' ? 'var(--bordeaux)' : 'rgba(255,255,255,0.1)',
            color: 'var(--champagne)', fontWeight: mode === 'camera' ? 600 : 400
          }}>
          Caméra
        </button>
        <button
          onClick={() => mode === 'camera' ? switchToUpload() : undefined}
          style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.85rem',
            background: mode === 'upload' ? 'var(--bordeaux)' : 'rgba(255,255,255,0.1)',
            color: 'var(--champagne)', fontWeight: mode === 'upload' ? 600 : 400
          }}>
          Photo
        </button>
      </div>

      {/* Mode caméra */}
      {mode === 'camera' && (
        <>
          <div className="camera-viewport">
            <video ref={videoRef} playsInline muted />
            <div className="camera-guides" />
          </div>
          {status === 'starting' && <p style={{ color: 'var(--champagne)', fontSize: '0.9rem' }}>Démarrage caméra...</p>}
          {status === 'processing' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--sauternes)', fontSize: '0.9rem', marginBottom: 8 }}>Reconnaissance en cours…</p>
              <div style={{ width: 240, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                <div style={{ height: '100%', width: `${ocrProgress}%`, background: 'linear-gradient(90deg, var(--bordeaux), var(--sauternes))', transition: 'width 0.15s ease-out', borderRadius: 4 }} />
              </div>
            </div>
          )}
          {status === 'error' && <p style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center', maxWidth: 260 }}>{errorMsg}</p>}
          {status === 'ready' && <button className="camera-btn-capture" onClick={capture} aria-label="Capturer" />}
          {status === 'ready' && (
            <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.8rem', textAlign: 'center', maxWidth: 280 }}>
              Cadrez l'étiquette dans le rectangle
            </p>
          )}
        </>
      )}

      {/* Mode upload */}
      {mode === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 320 }}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {!previewUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '40px 32px', borderRadius: 12, border: '2px dashed rgba(245,245,220,0.3)',
                background: 'rgba(255,255,255,0.04)', color: 'var(--champagne)', cursor: 'pointer',
                fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.6
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📷</div>
              Sélectionner une photo<br />
              <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>JPG, PNG, HEIC…</span>
            </button>
          ) : (
            <div style={{ position: 'relative', width: '100%' }}>
              <img
                src={previewUrl} alt="Aperçu étiquette"
                style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 8, background: '#111' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', top: 6, right: 6, padding: '4px 10px', borderRadius: 12,
                  border: 'none', background: 'rgba(0,0,0,0.65)', color: 'var(--champagne)',
                  fontSize: '0.78rem', cursor: 'pointer'
                }}>
                Changer
              </button>
            </div>
          )}

          {status === 'processing' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--sauternes)', fontSize: '0.9rem', marginBottom: 8 }}>Reconnaissance en cours…</p>
              <div style={{ width: 240, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                <div style={{ height: '100%', width: `${ocrProgress}%`, background: 'linear-gradient(90deg, var(--bordeaux), var(--sauternes))', transition: 'width 0.15s ease-out', borderRadius: 4 }} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</p>
          )}

          {previewUrl && status === 'ready' && (
            <button
              onClick={() => previewUrl && runOcr(previewUrl)}
              style={{
                padding: '10px 32px', borderRadius: 24, border: 'none', cursor: 'pointer',
                background: 'var(--bordeaux)', color: 'var(--champagne)', fontWeight: 600, fontSize: '0.95rem'
              }}>
              Analyser l'étiquette
            </button>
          )}
        </div>
      )}

      {/* Saisie manuelle (fallback OCR) */}
      {status === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 300, marginTop: 8 }}>
          <p style={{ color: '#f87171', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>{errorMsg}</p>
          <input
            type="text"
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && manualText.trim()) {
                streamRef.current?.getTracks().forEach(t => t.stop());
                onResult(manualText.trim());
              }
            }}
            placeholder="Nom du vin…"
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(245,245,220,0.25)',
              background: 'rgba(255,255,255,0.08)', color: 'var(--champagne)', fontSize: '0.95rem', outline: 'none'
            }}
          />
          <button
            onClick={() => {
              if (manualText.trim()) {
                streamRef.current?.getTracks().forEach(t => t.stop());
                onResult(manualText.trim());
              }
            }}
            disabled={!manualText.trim()}
            style={{
              padding: '9px 28px', borderRadius: 20, border: 'none', cursor: manualText.trim() ? 'pointer' : 'not-allowed',
              background: manualText.trim() ? 'var(--bordeaux)' : 'rgba(255,255,255,0.1)',
              color: 'var(--champagne)', fontWeight: 600, fontSize: '0.9rem'
            }}>
            Rechercher
          </button>
        </div>
      )}
    </div>
  );
}
