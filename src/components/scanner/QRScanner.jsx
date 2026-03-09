import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2 } from 'lucide-react';

const SCANNER_ID = 'html5-qr-reader';

export default function QRScanner({ onScan }) {
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const firedRef = useRef(false);
  const instanceRef = useRef(null);

  useEffect(() => {
    firedRef.current = false;
    const scanner = new Html5Qrcode(SCANNER_ID);
    instanceRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (!firedRef.current) {
            firedRef.current = true;
            onScan(decodedText);
          }
        },
        () => {}
      )
      .then(() => setLoading(false))
      .catch(() => {
        setCameraError('Camera access denied or unavailable.\nUse manual input instead.');
        setLoading(false);
      });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {});
      }
    };
  }, []);

  if (cameraError) {
    return (
      <div className="w-full max-w-sm bg-amber-950/40 border border-amber-700 rounded-2xl p-6 text-center">
        <p className="text-amber-300 text-sm whitespace-pre-line">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl z-10 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}
      {/* Viewfinder overlay */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700">
        <div id={SCANNER_ID} className="w-full" />
        {!loading && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-[3px] border-transparent">
              {/* Corner markers */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-md" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-md" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-md" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-md" />
            </div>
          </div>
        )}
      </div>
      {!loading && (
        <p className="text-slate-500 text-xs text-center mt-3">
          Align QR code or barcode in the frame
        </p>
      )}
    </div>
  );
}