import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ViewerAuthProvider } from './contexts/ViewerAuthContext';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingFallback } from './components/LoadingFallback';

const ViewerPage = React.lazy(() => import('./components/viewer/ViewerPage'));
const ViewerPresentation = React.lazy(() => import('./components/viewer/ViewerPresentation'));

export default function ViewerApp() {
  return (
    <ErrorBoundary>
      <ViewerAuthProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<ViewerPage />} />
              <Route path="/:id" element={<ViewerPresentation />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </ViewerAuthProvider>
    </ErrorBoundary>
  );
}
