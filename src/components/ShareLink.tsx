import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; // Added Button import
import { Textarea } from '@/components/ui/textarea'; // Added Textarea import
import { Label } from '@/components/ui/label'; // Added Label import

interface ShareLinkProps {
  link: string;
  signalData: string; // Changed sdpOffer to signalData
}

const ShareLink: React.FC<ShareLinkProps> = ({ link, signalData }) => { // Updated destructuring
  const [isLinkCopied, setIsLinkCopied] = useState(false); // Renamed state
  const [isSignalCopied, setIsSignalCopied] = useState(false); // Added state for signal copy
  const linkInputRef = useRef<HTMLInputElement>(null); // Renamed ref
  const signalTextareaRef = useRef<HTMLTextAreaElement>(null); // Added ref for signal textarea

  // Handler for copying the link
  const handleCopyLink = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      try {
        document.execCommand('copy');
        setIsLinkCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setIsLinkCopied(false), 3000);
      } catch (err) {
        toast.error('Failed to copy link.');
        console.error('Failed to copy link: ', err);
      }
    }
  };

  // Handler for copying the signal data
  const handleCopySignal = () => {
    if (signalTextareaRef.current) {
       // Use Clipboard API for textarea
       navigator.clipboard.writeText(signalData).then(() => {
        setIsSignalCopied(true);
        toast.success('Signal data copied to clipboard!');
        setTimeout(() => setIsSignalCopied(false), 3000);
      }).catch(err => {
        toast.error('Failed to copy signal data.');
        console.error('Failed to copy signal data: ', err);
      });
    }
  };


  // Automatically select the link when it first appears
  useEffect(() => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
    }
  }, [link]);

  // Removed encodedLink logic

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-4"> {/* Added space-y-4 */}
      <div className="glassmorphism p-6 rounded-xl">
        <h3 className="text-lg font-medium mb-3">1. Share this link with your recipient</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Send this link to the person you want to share with.
        </p>
        
        <div className="flex gap-2">
          <input
            ref={linkInputRef} // Use renamed ref
            type="text"
            value={link} // Show only the link
            readOnly
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button // Changed to Button component
            onClick={handleCopyLink} // Use new handler
            className={`min-w-20 ${isLinkCopied ? 'bg-green-600 hover:bg-green-700' : ''}`}
            variant="default" // Use Shadcn button variant
          >
            {isLinkCopied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
      </div>

      {/* Added section for Signal Data */}
      <div className="glassmorphism p-6 rounded-xl">
         <h3 className="text-lg font-medium mb-3">2. Send this signal data to your recipient</h3>
         <p className="text-sm text-muted-foreground mb-4">
           Copy this code (offer/candidates) and send it to the recipient through a separate channel (like chat or email). They will need to paste it into their HandShare window.
         </p>
         <div className="space-y-2">
           <Label htmlFor="signal-data">Signal Data (Offer/Candidates):</Label>
           <Textarea
             ref={signalTextareaRef}
             id="signal-data"
             value={signalData}
             readOnly
             rows={5} // Increased rows
             className="bg-background/80 backdrop-blur-sm font-mono text-xs" // Added styling
           />
           <Button
             onClick={handleCopySignal}
             className={`w-full sm:w-auto ${isSignalCopied ? 'bg-green-600 hover:bg-green-700' : ''}`}
             variant="secondary" // Use different variant
             disabled={!signalData} // Disable if no signal data
           >
             {isSignalCopied ? 'Copied!' : 'Copy Signal Data'}
           </Button>
         </div>

         <div className="flex items-center gap-2 mt-4">
           <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
           <p className="text-xs text-muted-foreground">
             Waiting for recipient to join and send back their signal...
           </p>
         </div>
       </div>
    </div>
  );
};

export default ShareLink;
