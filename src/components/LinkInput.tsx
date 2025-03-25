
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

const LinkInput: React.FC = () => {
  const [link, setLink] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract roomId from the link
    try {
      const url = new URL(link);
      const pathParts = url.pathname.split('/');
      const roomId = pathParts[pathParts.length - 1];
      
      if (!roomId) {
        toast.error('Invalid sharing link. Please check and try again.');
        return;
      }
      
      // Navigate to the receive page with the roomId
      navigate(`/receive/${roomId}`);
    } catch (error) {
      toast.error('Invalid URL format. Please enter a valid sharing link.');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glassmorphism p-6 rounded-xl">
        <h3 className="text-lg font-medium mb-3">Have a sharing link?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Paste a sharing link you received to connect and receive files.
        </p>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Paste your sharing link here"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            Connect
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LinkInput;
