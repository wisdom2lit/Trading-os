import { useState } from 'react';
import { Download, MonitorSmartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="Install Axiom TOS App"
        title="Install standalone desktop / mobile app"
        className={`glass-control inline-flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-2' : 'px-4 py-2.5'
        }`}
      >
        <Download className="w-3.5 h-3.5 text-[#B7FF00]" />
        <span className={compact ? 'hidden xl:inline' : ''}>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        aria-label={isIOS ? 'Install Axiom TOS on iOS' : 'App Install & Desktop Setup Guide'}
        title="Install standalone app on Windows, macOS, Android, or iOS"
        className={`glass-control inline-flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-2' : 'px-4 py-2.5'
        }`}
      >
        <MonitorSmartphone className="w-3.5 h-3.5 text-[#B7FF00]" />
        <span className={compact ? 'hidden xl:inline' : ''}>Install</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Install Axiom TOS App"
        >
          <div className="glass-elevated w-full max-w-md rounded-[28px] p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#E8D7A8]/16">
              <div>
                <h3 className="font-display text-lg font-extrabold text-[#FAF6EE]">
                  Install Axiom TOS Standalone App
                </h3>
                <p className="text-xs font-semibold text-[#C9BA9E] mt-1">
                  Runs offline with its own desktop shortcut, app icon, and splash screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="glass-control p-2 rounded-xl"
              >
                <X className="w-4 h-4 text-[#B7FF00]" />
              </button>
            </div>

            <div className="divide-y divide-[#E8D7A8]/14 text-xs sm:text-sm font-semibold text-[#E8D7A8] leading-relaxed">
              {isIOS ? (
                <div className="py-2 space-y-1.5">
                  <div className="font-bold text-[#B7FF00]">iPhone / iPad (Safari)</div>
                  <p>1. Tap the Share button in Safari&apos;s toolbar.</p>
                  <p>2. Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</p>
                  <p>3. Launch Axiom TOS directly from your home screen.</p>
                </div>
              ) : (
                <>
                  <div className="pb-4 space-y-1.5">
                    <div className="font-bold text-[#FFD36A]">Windows / macOS (Chrome or Edge)</div>
                    <p>
                      Click the <strong className="text-[#FAF6EE]">Install</strong> icon on the right side of the browser address bar (or Menu &rarr; Cast, save, and share &rarr; Install Axiom TOS) to create a standalone desktop application &amp; shortcut.
                    </p>
                  </div>
                  <div className="pt-4 space-y-1.5">
                    <div className="font-bold text-[#B7FF00]">Android (Chrome)</div>
                    <p>
                      Open the browser menu (&vellip;) and tap <strong className="text-[#FAF6EE]">Install app</strong> or <strong className="text-[#FAF6EE]">Add to Home screen</strong> to install Axiom TOS like a native Android app.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="glass-lime-cta w-full py-3 text-xs sm:text-sm font-extrabold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
