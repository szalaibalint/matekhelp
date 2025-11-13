import React, { useState } from 'react';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../ui/use-toast';

interface ViewerRegisterDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ViewerRegisterDialog: React.FC<ViewerRegisterDialogProps> = ({ open, onClose }) => {
  const { register } = useViewerAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Hiba',
        description: 'A két jelszó nem egyezik meg.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Hiba',
        description: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.',
      });
      return;
    }

    setIsLoading(true);

    const result = await register(email, username, password);
    
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Sikeres regisztráció!',
        description: 'Mostantól használhatod a MatekHelp extra funkcióit!',
      });
      onClose();
      // Clear form
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Regisztráció sikertelen',
        description: result.error || 'Kérjük, próbáld újra.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regisztráció</DialogTitle>
          <DialogDescription>
            Hozz létre egy MatekHelp fiókot
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email cím *</Label>
            <Input
              id="email"
              type="email"
              placeholder="pelda@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Felhasználónév *</Label>
            <Input
              id="username"
              type="text"
              placeholder="felhasznalo123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              minLength={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Jelszó *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
            <p className="text-xs text-gray-500">Legalább 6 karakter</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Jelszó megerősítése *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Regisztráció...' : 'Regisztráció'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
