import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Settings, PresentationIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../../supabase/auth';
import { toast } from '../ui/use-toast';

export default function AdminLanding() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Sikeres kijelentkezés',
        description: 'Kijelentkeztél a rendszerből',
      });
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült kijelentkezni',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Válassz a lehetőségek közül</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Kijelentkezés
          </Button>
        </div>

        {/* Admin Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Presentation Editor Card */}
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500"
            onClick={() => navigate('/admin/editor')}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <PresentationIcon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Prezentáció Szerkesztő</CardTitle>
              </div>
              <CardDescription className="text-base">
                Tananyagok létrehozása, szerkesztése és kezelése. Kategóriák, diák és kvízek kezelése.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/admin/editor');
                }}
              >
                Szerkesztő megnyitása
              </Button>
            </CardContent>
          </Card>

          {/* Site Settings Card */}
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500"
            onClick={() => navigate('/admin/settings')}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Oldal Beállítások</CardTitle>
              </div>
              <CardDescription className="text-base">
                Globális beállítások kezelése: fejlesztői mód, karbantartási üzenetek és egyéb rendszerbeállítások.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/admin/settings');
                }}
              >
                Beállítások megnyitása
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>MatekHelp Admin Panel • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
