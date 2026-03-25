import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 bg-background">
      <div className="section-container flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted">
        
        <div className="font-display text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-accent via-secondary to-primary flex items-center gap-2 pb-1">
          <Zap className="h-6 w-6 text-accent" />
          Smart Attendance
        </div>
        
        <div className="flex gap-6 font-medium">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </div>
        
        <div className="text-muted-dark">
          &copy; {new Date().getFullYear()} Smart Attendance System. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
