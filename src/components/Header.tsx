
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute w-8 h-8 bg-primary/30 rounded-lg animate-pulse-shadow"></div>
            <div className="absolute w-4 h-4 bg-primary rounded-md rotate-45"></div>
          </div>
          <h1 className="text-2xl font-medium tracking-tight">HandShare</h1>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="https://medium.com/@enzovezzaro/vibe-coding-adventures-day-6-p2p-handshake-v1-v-91aed304368b" target='_blank' className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
