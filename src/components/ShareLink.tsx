
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface ShareLinkProps {
  link: string;
   sdpOffer: string;
}

const ShareLink: React.FC<ShareLinkProps> = ({ link, sdpOffer }) => {
  const [isCopied, setIsCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    if (inputRef.current) {
      inputRef.current.select();
      document.execCommand('copy');
      setIsCopied(true);
      toast.success('Link copied to clipboard!');
      
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    }
  };

  // Automatically select the link when it first appears
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, [link]);

  const encodedLink = `${link}?sdpOffer=${encodeURIComponent(sdpOffer)}`;

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="glassmorphism p-6 rounded-xl">
        <h3 className="text-lg font-medium mb-3">Share this link with your recipient</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Send this link to the person you want to share with. They will need to confirm before any files are transferred.
        </p>
        
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={encodedLink}
            readOnly
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={handleCopy}
            className={`btn-primary min-w-20 ${isCopied ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <p className="text-xs text-muted-foreground">
            Waiting for recipient to join using the link...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareLink;
