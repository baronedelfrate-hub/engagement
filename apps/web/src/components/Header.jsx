import React from 'react';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

function Header({ children, onLogout, userName }) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="h-16 shrink-0 bg-background/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between shadow-sm transition-colors duration-300 sticky top-0 z-40">
      <div className="flex items-center gap-4 min-w-0">
        {children}
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse"></span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:scale-105 transition-transform">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--brand-orange))] flex items-center justify-center shadow-lg shadow-primary/20">
                <User className="h-5 w-5" style={{ color: '#fff' }} />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              {userName || 'Minha Conta'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/configuracoes/temas')} className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              Preferências
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Sair do sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;