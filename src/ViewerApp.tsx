import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const ViewerPage = React.lazy(() => import('./components/viewer/ViewerPage'));
const ViewerPresentation = React.lazy(() => import('./components/viewer/ViewerPresentation'));

export default function ViewerApp() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<ViewerPage />} />
          <Route path="/:id" element={<ViewerPresentation />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
