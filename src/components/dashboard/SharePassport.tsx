import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Check, QrCode, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SharePassportProps {
  userId: string;
}

const SharePassport = ({ userId }: SharePassportProps) => {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const passportUrl = `${window.location.origin}/passport/${userId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(passportUrl);
    setCopied(true);
    toast.success("Passport link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My TenCheck Credit Passport",
          text: "View my verified tenant credit passport on TenCheck",
          url: passportUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Share2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Share Your Passport</h2>
          <p className="text-sm text-muted-foreground">Send your credit passport to landlords</p>
        </div>
      </div>

      {/* Link */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground truncate">
          {passportUrl}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" className="gap-1.5" onClick={handleShare}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowQR(!showQR)}>
          <QrCode className="h-3.5 w-3.5" /> {showQR ? "Hide QR" : "Show QR Code"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={passportUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
        </Button>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white border border-border">
          <QRCodeSVG value={passportUrl} size={180} level="M" />
          <p className="text-xs text-muted-foreground">Scan to view credit passport</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <Badge variant="secondary" className="text-xs">
          🔒 Only your credit score and payment summary are visible — no personal details
        </Badge>
      </div>
    </div>
  );
};

export default SharePassport;
