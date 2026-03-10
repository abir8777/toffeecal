import { useEffect, useState } from "react";
import { Download, CheckCircle, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <img src="/images/toffeecal-logo.png" alt="ToffeeCal" className="w-24 h-24 rounded-2xl" />
      <h1 className="text-2xl font-bold text-foreground">Install ToffeeCal</h1>

      {installed ? (
        <div className="flex flex-col items-center gap-2 text-primary">
          <CheckCircle className="w-12 h-12" />
          <p className="text-lg font-medium">App installed! Open it from your home screen.</p>
        </div>
      ) : isIOS ? (
        <div className="flex flex-col items-center gap-3 text-muted-foreground max-w-xs">
          <Share className="w-10 h-10 text-primary" />
          <p>Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong>.</p>
        </div>
      ) : deferredPrompt ? (
        <Button onClick={handleInstall} size="lg" className="gap-2">
          <Download className="w-5 h-5" />
          Install App
        </Button>
      ) : (
        <p className="text-muted-foreground max-w-xs">
          Open this page in Chrome or Edge, then use the browser menu to install.
        </p>
      )}

      <a href="/dashboard" className="text-primary underline text-sm mt-4">
        Continue in browser →
      </a>
    </div>
  );
};

export default Install;
