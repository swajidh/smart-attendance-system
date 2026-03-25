import { Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [active, setActive] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['how-it-works', 'features', 'system'];
      let current = '';

      for (let sec of sections) {
        const element = document.getElementById(sec);
        if (element) {
          const rect = element.getBoundingClientRect();
          // If the top of the section is near the middle of the viewport
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            current = sec;
          }
        }
      }
      setActive(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on init
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const linkClass = (id) => 
    active === id
      ? "inline-block text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent via-secondary to-primary transition-all duration-300"
      : "inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300";

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
      <div className="section-container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent" />
          <span className="font-display text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-accent via-secondary to-primary pb-1">
            Smart Attendance
          </span>
        </div>
        <nav className="hidden md:flex gap-6">
          <a href="#how-it-works" className={linkClass('how-it-works')}>How it Works</a>
          <a href="#features" className={linkClass('features')}>Features</a>
          <a href="#system" className={linkClass('system')}>System</a>
        </nav>
        <div className="flex items-center gap-4">
          <a href="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            View Demo
          </a>
          <a href="#explore" className="bg-surface border border-border hover:border-foreground/40 text-foreground px-4 py-2 rounded-full text-sm font-semibold transition-all">
            Explore
          </a>
        </div>
      </div>
    </header>
  );
}
