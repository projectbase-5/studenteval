import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPWAButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIOS(ios);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else if (isIOS) {
      setShowHint((v) => !v);
    } else {
      setShowHint((v) => !v);
    }
  };

  // Only render if installable or iOS (where we show a hint)
  if (!deferred && !isIOS) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        aria-label="Install app"
      >
        <Download className="h-3.5 w-3.5" /> Install
      </button>
      {showHint && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
          {isIOS
            ? "On iPhone/iPad: tap the Share button, then choose “Add to Home Screen”."
            : "Use your browser menu → Install app, or look for the install icon in the address bar."}
        </div>
      )}
    </div>
  );
}
