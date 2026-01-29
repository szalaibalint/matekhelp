import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { toast } from '../ui/use-toast';
import { SiteSettingsService, DevelopmentModeSettings } from '../../services/SiteSettingsService';
import { useAuth } from '../../../supabase/auth';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function SiteSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [devMode, setDevMode] = useState<DevelopmentModeSettings>({
    enabled: false,
    message: 'A weboldal jelenleg fejlesztés alatt áll. Kérjük, nézzen vissza később!'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const devModeSettings = await SiteSettingsService.getDevelopmentMode();
      setDevMode(devModeSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a beállításokat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await SiteSettingsService.updateDevelopmentMode(
        devMode.enabled,
        devMode.message,
        user?.id
      );

      if (success) {
        toast({
          title: 'Mentve',
          description: 'A beállítások sikeresen mentve lettek',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült menteni a beállításokat',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Oldal Beállítások</h1>
            <p className="text-gray-600">Globális beállítások kezelése</p>
          </div>
        </div>

        {/* Development Mode Alert */}
        {devMode.enabled && (
          <Alert className="mb-6 border-orange-500 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-600">Fejlesztői mód aktív</AlertTitle>
            <AlertDescription className="text-orange-800">
              A weboldal látogatói a karbantartási üzenetet látják. Ne felejtsd el kikapcsolni, ha kész vagy!
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Development Mode Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Fejlesztői Mód</CardTitle>
              <CardDescription>
                Ha be van kapcsolva, a látogatók egy karbantartási üzenetet látnak a weboldal helyett
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dev-mode" className="text-base font-medium">
                    Fejlesztői mód bekapcsolása
                  </Label>
                  <p className="text-sm text-gray-500">
                    Aktiválja a karbantartási módot
                  </p>
                </div>
                <Switch
                  id="dev-mode"
                  checked={devMode.enabled}
                  onCheckedChange={(checked) => 
                    setDevMode({ ...devMode, enabled: checked })
                  }
                />
              </div>

              {/* Message Textarea */}
              <div className="space-y-2">
                <Label htmlFor="dev-message" className="text-base font-medium">
                  Karbantartási üzenet
                </Label>
                <p className="text-sm text-gray-500 mb-2">
                  Ez az üzenet jelenik meg a látogatóknak fejlesztői módban
                </p>
                <Textarea
                  id="dev-message"
                  value={devMode.message}
                  onChange={(e) => 
                    setDevMode({ ...devMode, message: e.target.value })
                  }
                  rows={4}
                  placeholder="Írj egy üzenetet a látogatóknak..."
                  className="resize-none"
                />
              </div>

              {/* Preview */}
              {devMode.message && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">
                    Előnézet:
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-700">{devMode.message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* More settings cards can be added here in the future */}
          <Card className="border-dashed bg-gray-50">
            <CardHeader>
              <CardTitle className="text-gray-500">További beállítások</CardTitle>
              <CardDescription>
                További beállítási lehetőségek hamarosan...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 px-8"
            size="lg"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Mentés...' : 'Beállítások mentése'}
          </Button>
        </div>
      </div>
    </div>
  );
}
