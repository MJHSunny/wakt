import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Compass, MapPin, AlertCircle, ArrowUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getQiblaInfo } from '../../services/qiblaService';
import { Capacitor } from '@capacitor/core';
import { QiblaDirection } from '../services/qiblaNative';
import { setStatusBarTheme } from '../services/statusBarTheme';

export function QiblaPage() {
  const { location, cityName } = useApp();
  const [qiblaData, setQiblaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nativeAngle, setNativeAngle] = useState<number | null>(null);
  const [usingNative, setUsingNative] = useState(false);
  const [accuracy, setAccuracy] = useState<'poor' | 'low' | 'fair' | 'good' | 'unknown' | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [displayHeading, setDisplayHeading] = useState<number>(0);
  const targetHeadingRef = useRef<number>(0);
  const displayHeadingRef = useRef<number>(0);
  const [showCalibration, setShowCalibration] = useState<boolean>(false);

  // Qibla header uses the same softer primary gradient as notifications
  useEffect(() => {
    setStatusBarTheme('primarySoft');
  }, []);

  useEffect(() => {
    if (location) {
      try {
        const qibla = getQiblaInfo(location.latitude, location.longitude);
        setQiblaData(qibla);
      } catch (e) {
        console.error('Error calculating qibla:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    let remove: (() => void) | undefined;
    const init = async () => {
      if (Capacitor.getPlatform() !== 'android') return;
      try {
        const handle = await QiblaDirection.addListener('direction', (e) => {
          if (typeof e?.angle === 'number') setNativeAngle(e.angle);
        });
        const accHandle = await QiblaDirection.addListener('accuracy', (e: any) => {
          if (e?.level) {
            setAccuracy(e.level);
            const lvl = (e.level + '').toLowerCase();
            // Auto-hide calibration on fair/good accuracy
            if (lvl === 'good' || lvl === 'fair') {
              setShowCalibration(false);
            }
          }
        });
        let lastHeadTime = 0;
        let lastHeadVal: number | null = null;
        const headingHandle = await QiblaDirection.addListener('heading', (e: any) => {
          if (typeof e?.heading === 'number') {
            const now = Date.now();
            const h = ((e.heading % 360) + 360) % 360;
            // Throttle to ~15-20 Hz and ignore tiny jitters
            if (lastHeadVal === null || now - lastHeadTime > 50 || Math.abs(h - lastHeadVal) > 0.8) {
              lastHeadTime = now;
              lastHeadVal = h;
              setHeading(h);
            }
          }
        });
        await QiblaDirection.start();
        setUsingNative(true);
        // Only show calibration overlay after confirming native is available
        setShowCalibration(true);
        const calibrationTimeout = setTimeout(() => setShowCalibration(false), 6000);
        remove = async () => {
          try { await QiblaDirection.stop(); } catch {}
          try { await handle.remove(); } catch {}
          try { await accHandle.remove(); } catch {}
          try { await headingHandle.remove(); } catch {}
          clearTimeout(calibrationTimeout);
        };
      } catch (e) {
        console.warn('QiblaDirection native unavailable:', e);
      }
    };
    init();
    return () => { if (remove) remove(); };
  }, []);

  // For non-Android, briefly show calibration hint then hide
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') return;
    const t = setTimeout(() => setShowCalibration(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // Re-initialize native sensor streaming on visibility changes (Android)
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const onVis = async () => {
      try {
        if (document.visibilityState === 'visible') {
          await QiblaDirection.start();
          setUsingNative(true);
        } else {
          await QiblaDirection.stop();
        }
      } catch {}
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const derivedHeading = useMemo(() => {
    if (!usingNative) return null;
    if (heading != null) return heading;
    if (nativeAngle != null && qiblaData) {
      return (qiblaData.bearing - nativeAngle + 360) % 360;
    }
    return null;
  }, [usingNative, heading, nativeAngle, qiblaData]);

  // Drive a tweened display heading for smooth, slow motion
  useEffect(() => {
    // Update target when native heading/bearing changes
    if (derivedHeading != null) {
      // Quantize a bit to reduce micro-jitter from noise
      const quantized = Math.round(derivedHeading * 2) / 2; // 0.5° steps
      targetHeadingRef.current = quantized;
    }
  }, [derivedHeading]);

  useEffect(() => {
    let raf = 0;
    let prevTime = performance.now();

    const normalize = (a: number) => ((a % 360) + 360) % 360;
    const shortestDiff = (from: number, to: number) => {
      let d = ((to - from + 540) % 360) - 180; // [-180, 180)
      return d;
    };

    // Motion parameters: smooth and not too fast
    const tau = 0.35; // seconds (larger = smoother/slower)
    const maxSpeed = 180; // deg/sec cap to avoid sudden jumps

    const step = (t: number) => {
      const dt = Math.min(0.05, (t - prevTime) / 1000); // cap dt to keep stable
      prevTime = t;

      const current = displayHeadingRef.current;
      const target = targetHeadingRef.current;
      const diff = shortestDiff(current, target);

      // Exponential smoothing towards target
      const lerpAmount = 1 - Math.exp(-dt / tau);
      let next = normalize(current + diff * lerpAmount);

      // Enforce a max rotational speed (deg/sec)
      const maxStep = maxSpeed * dt;
      const applied = shortestDiff(current, next);
      if (Math.abs(applied) > maxStep) {
        next = normalize(current + Math.sign(applied) * maxStep);
      }

      // Snap tiny movements to zero to prevent shimmer
      if (Math.abs(shortestDiff(current, next)) < 0.1) {
        next = current;
      }

      // Quantize displayed heading slightly for extra calmness
      next = Math.round(next * 10) / 10; // 0.1° steps

      if (next !== current) {
        displayHeadingRef.current = next;
        setDisplayHeading(next);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (loading || !location) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Compass className="w-12 h-12 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-foreground font-semibold">Loading Qibla...</p>
        </div>
      </div>
    );
  }

  if (!qiblaData) {
    return (
      <div className="min-h-screen bg-background pb-20 overflow-y-auto">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white p-6 page-header-safe">
          <h1 className="text-2xl mb-2 font-bold">Qibla Direction</h1>
        </div>
        <div className="p-6">
          <div className="bg-card rounded-2xl shadow-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-semibold">Could not calculate Qibla</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white p-6 page-header-safe text-center">
        <h1 className="text-3xl mb-2 font-light">Qibla</h1>
        <div className="flex items-center gap-2 text-white/80 text-sm justify-center">
          <MapPin className="w-4 h-4" />
          <span>{cityName || 'Your Location'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 page-first-row-offset">
        {/* Static Qibla View (No compass) */}
        <div className="bg-card rounded-2xl shadow-lg p-4 sm:p-8 mb-6 max-w-full overflow-hidden">
          <div className="text-center mb-8">
            <p className="text-muted-foreground text-sm mb-2">Qibla Direction</p>
            <div className="text-4xl text-accent mb-1 font-bold">{qiblaData.bearing}°</div>
            <p className="text-sm text-muted-foreground">{qiblaData.direction}</p>
            
            {/* Device alignment indicator below Qibla Direction */}
            <div className="flex flex-col items-center gap-1 mt-4 pt-4 border-t border-border">
              <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-lg">
                <path d="M 12 0 L 18 12 L 12 10 L 6 12 Z" fill="#EF4444" stroke="white" strokeWidth="1" />
              </svg>
              <p className="text-xs font-bold text-white bg-red-500 rounded px-2 py-0.5 drop-shadow-lg">
                Device: {Math.round(displayHeading)}°
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-sm mx-auto aspect-square mb-4 overflow-visible p-8">
            {/* Compass face (rotates with heading on native) */}
            <div
              className="absolute inset-8 overflow-visible"
              style={{
                transform: `rotate(${usingNative ? -displayHeading : 0}deg)`,
                transition: 'transform 0ms linear',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full max-w-full">
                <defs>
                  <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="#3a4157" />
                    <stop offset="100%" stopColor="#2a3043" />
                  </radialGradient>
                  <linearGradient id="gold" x1="0" x2="1">
                    <stop offset="0%" stopColor="#EACF7B" />
                    <stop offset="100%" stopColor="#D4AF37" />
                  </linearGradient>
                </defs>

                {/* Face */}
                <circle cx="100" cy="100" r="95" fill="url(#ringGrad)" stroke="#40465b" strokeWidth="2" />
                <circle cx="100" cy="100" r="82" fill="none" stroke="#5b6277" strokeOpacity="0.35" strokeWidth="1.5" />

                {/* Ticks */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i * 15) * Math.PI / 180;
                  const isMajor = i % 6 === 0; // 0,90,180,270
                  const r1 = isMajor ? 90 : 88;
                  const r2 = 95;
                  const x1 = 100 + r1 * Math.sin(angle);
                  const y1 = 100 - r1 * Math.cos(angle);
                  const x2 = 100 + r2 * Math.sin(angle);
                  const y2 = 100 - r2 * Math.cos(angle);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? '#EACF7B' : '#8891a8'} strokeWidth={isMajor ? 2 : 1} strokeOpacity={isMajor ? 1 : 0.6} />
                  );
                })}

                {/* Cardinals (centered) */}
                <text x="100" y="26" textAnchor="middle" dominantBaseline="middle" fill="url(#gold)" style={{ fontSize: 22, fontWeight: 900 }}>N</text>
                <text x="174" y="100" textAnchor="middle" dominantBaseline="middle" fill="url(#gold)" style={{ fontSize: 17, fontWeight: 800 }}>E</text>
                <text x="100" y="174" textAnchor="middle" dominantBaseline="middle" fill="url(#gold)" style={{ fontSize: 17, fontWeight: 800 }}>S</text>
                <text x="26" y="100" textAnchor="middle" dominantBaseline="middle" fill="url(#gold)" style={{ fontSize: 17, fontWeight: 800 }}>W</text>

                {/* Center cap */}
                <circle cx="100" cy="100" r="7" fill="#0ea5e9" stroke="#7dd3fc" strokeWidth="2" />
              </svg>

              {/* Qibla indicator bubble inside rotating dial (absolute bearing) */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-linear z-10"
                style={{ transform: `rotate(${qiblaData?.bearing ?? 0}deg)`, pointerEvents: 'none' }}
              >
                <div className="absolute -top-1.5 flex flex-col items-center gap-1 z-20">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 z-30" style={{ background: 'rgba(234,207,123,0.18)', borderColor: '#D4AF37', boxShadow: '0 8px 30px rgba(212,175,55,0.25)' }}>
                    <ArrowUp className="w-8 h-8 z-40" strokeWidth={3} style={{ color: '#D4AF37' }} />
                  </div>
                </div>
              </div>

              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full shadow-lg" style={{ background: '#0ea5e9' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Distance and Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 max-w-full">
          <div className="bg-card rounded-xl shadow-sm p-3 sm:p-4 text-center border border-border min-w-0">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-2" />
            <p className="text-xl sm:text-2xl text-foreground font-bold mb-1">{qiblaData.bearing}°</p>
            <p className="text-xs text-muted-foreground">Qibla Bearing</p>
          </div>

          <div className="bg-card rounded-xl shadow-sm p-3 sm:p-4 text-center border border-border min-w-0">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-2" />
            <p className="text-xl sm:text-2xl text-foreground font-bold mb-1">{qiblaData.distance}</p>
            <p className="text-xs text-muted-foreground">Kilometers</p>
          </div>
        </div>

        {/* Guidance + Calibrator */}
        <div className="bg-card rounded-2xl shadow-lg p-4 sm:p-5 border border-border max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Compass Guidance</p>
              <p className="text-lg font-semibold text-foreground">Improve accuracy & alignment</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Accuracy pill */}
              {accuracy && (
                <span className="text-xs px-2 py-1 rounded-full border"
                  style={{
                    borderColor: accuracy === 'good' ? '#16a34a' : accuracy === 'fair' ? '#eab308' : '#ef4444',
                    color: accuracy === 'good' ? '#22c55e' : accuracy === 'fair' ? '#f59e0b' : '#ef4444'
                  }}>
                  {accuracy.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Info graphics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-full">
            {/* Hold flat */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/10 border border-border min-w-0">
              <svg width="28" height="28" viewBox="0 0 24 24" className="text-foreground flex-shrink-0">
                <rect x="3" y="7" width="18" height="10" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <rect x="8" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.2" />
              </svg>
              <div className="text-xs min-w-0 flex-1">
                <p className="font-semibold text-foreground">Hold flat</p>
                <p className="text-muted-foreground">Keep device level for best results.</p>
              </div>
            </div>

            {/* Figure-8 */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/10 border border-border min-w-0">
              <svg width="28" height="28" viewBox="0 0 24 24" className="text-foreground flex-shrink-0">
                <path d="M7,12c0-2,1.6-3.5,3.5-3.5S14,10,14,12s-1.6,3.5-3.5,3.5S7,14,7,12Zm10,0c0-2-1.6-3.5-3.5-3.5S10,10,10,12s1.6,3.5,3.5,3.5S17,14,17,12Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <div className="text-xs min-w-0 flex-1">
                <p className="font-semibold text-foreground">Figure‑8 motion</p>
                <p className="text-muted-foreground">Move gently for 10–15 seconds.</p>
              </div>
            </div>

            {/* Rotate axes */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/10 border border-border min-w-0">
              <svg width="28" height="28" viewBox="0 0 24 24" className="text-foreground flex-shrink-0">
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 6l2 1-1 2M18 18l-2-1 1-2" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.15" />
              </svg>
              <div className="text-xs min-w-0 flex-1">
                <p className="font-semibold text-foreground">Rotate all axes</p>
                <p className="text-muted-foreground">Pitch, roll, and yaw slowly.</p>
              </div>
            </div>

            {/* Avoid magnets */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/10 border border-border min-w-0">
              <svg width="28" height="28" viewBox="0 0 24 24" className="text-foreground flex-shrink-0">
                <path d="M6 7a6 6 0 0 1 12 0v5a3 3 0 0 1-3 3h-1V9h4M10 15H9a3 3 0 0 1-3-3V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M5 5l14 14" stroke="#ef4444" strokeWidth="1.8" />
              </svg>
              <div className="text-xs min-w-0 flex-1">
                <p className="font-semibold text-foreground">Avoid magnets/metal</p>
                <p className="text-muted-foreground">Keep clear of cases or objects.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
