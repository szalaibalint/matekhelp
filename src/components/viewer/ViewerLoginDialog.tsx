import React, { useState } from 'react';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { X } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface ViewerLoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ViewerLoginDialog: React.FC<ViewerLoginDialogProps> = ({ open, onClose }) => {
  const { login } = useViewerAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(emailOrUsername, password);
    
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Sikeres bejelentkezés!',
        description: 'Üdvözlünk a MatekHelp-en!',
      });
      onClose();
      setEmailOrUsername('');
      setPassword('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Bejelentkezés sikertelen',
        description: result.error || 'Kérjük, próbáld újra.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bejelentkezés</DialogTitle>
          <DialogDescription>
            Jelentkezz be a MatekHelp fiókodba
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Email vagy felhasználónév</Label>
            <Input
              id="emailOrUsername"
              type="text"
              placeholder="pelda@email.com vagy felhasznalo"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Jelszó</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Bejelentkezés...' : 'Bejelentkezés'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
