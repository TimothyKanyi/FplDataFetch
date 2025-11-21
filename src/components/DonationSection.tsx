import { Copy } from "lucide-react";
import { toast } from "sonner";

export const DonationSection = () => {
  const handleCopyAddress = (address: string, label: string) => {
    navigator.clipboard.writeText(address);
    toast.success(`${label} address copied to clipboard!`);
  };

  return (
    <>
      {/* About Section */}
      <section className="mt-12 border-t border-border pt-8">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <h2 className="font-heading text-xl font-semibold">About FPL Data Fetcher</h2>
          <p className="text-muted-foreground">
            FPL Data Fetcher lets you instantly view Fantasy Premier League standings for any mini-league. Simply enter your league ID to fetch live rankings, manager points, and more — fast, clean, and accurate.
          </p>
        </div>
      </section>

      {/* Support Section */}
      <section className="mt-8 border-t border-border pt-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="font-heading text-lg font-semibold">Support the Project 💖</h2>
          <p className="text-sm text-muted-foreground">
            If you find FPL Data Fetcher helpful, you can support future improvements through crypto donations:
          </p>
          
          <div className="space-y-3 mt-4">
            {/* ETH / Base / BSC Address */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                ETH / Base / BSC:
              </span>
              <code className="text-xs break-all sm:break-normal px-2 py-1 bg-background rounded">
                0x1035063FfA2102A2f770F628Dc1062FD3413bBE8
              </code>
              <button
                onClick={() => handleCopyAddress("0x1035063FfA2102A2f770F628Dc1062FD3413bBE8", "ETH")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy ETH address"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* Solana Address */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Solana:
              </span>
              <code className="text-xs break-all sm:break-normal px-2 py-1 bg-background rounded">
                Ab4RAnmemuSXFhaqSXJbpC5frdmkR5my7kBT2wHNFAFN
              </code>
              <button
                onClick={() => handleCopyAddress("Ab4RAnmemuSXFhaqSXJbpC5frdmkR5my7kBT2wHNFAFN", "Solana")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy Solana address"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
