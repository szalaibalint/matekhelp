import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ViewerAuthProvider } from './contexts/ViewerAuthContext';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingFallback } from './components/LoadingFallback';
import MaintenanceMode from './components/shared/MaintenanceMode';
import { SiteSettingsService } from './services/SiteSettingsService';

const ViewerPage = React.lazy(() => import('./components/viewer/ViewerPage'));
const ViewerPresentation = React.lazy(() => import('./components/viewer/ViewerPresentation'));
const UserProgressDashboard = React.lazy(() => import('./components/viewer/UserProgressDashboard'));

export default function ViewerApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    checkMaintenanceMode();
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const devMode = await SiteSettingsService.getDevelopmentMode();
      setIsMaintenanceMode(devMode.enabled);
      setMaintenanceMessage(devMode.message);
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (isMaintenanceMode) {
    return <MaintenanceMode message={maintenanceMessage} />;
  }

  return (
    <ErrorBoundary>
      <ViewerAuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<ViewerPage />} />
              <Route path="/progress" element={<UserProgressDashboard />} />
              <Route path="/:id" element={<ViewerPresentation />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </ViewerAuthProvider>
    </ErrorBoundary>
  );
}
