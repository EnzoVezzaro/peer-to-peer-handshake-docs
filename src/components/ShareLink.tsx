import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ShareLinkProps {
  link: string;
  signalData: string;
}

const ShareLink: React.FC<ShareLinkProps> = ({ link, signalData }) => {
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
    }
  }, [link]);

  const encodedSignalData = encodeURIComponent(signalData);
  const shareableLink = `${link}?signal=${encodedSignalData}`;

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-4">
      <div className="glassmorphism p-6 rounded-xl">
        <h3 className="text-lg font-medium mb-3">Share this link with your recipient</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Send this link to the person you want to share with.
        </p>
        
        <div className="flex gap-2">
          <input
            ref={linkInputRef}
            type="text"
            value={shareableLink}
            readOnly
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            onClick={handleCopyLink}
            className={`min-w-20 ${isLinkCopied ? 'bg-green-600 hover:bg-green-700' : ''}`}
            variant="default"
          >
            {isLinkCopied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareLink;
