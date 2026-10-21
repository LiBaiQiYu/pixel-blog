import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const isAdmin =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('admin') === '1';

const AdminApp = isAdmin
  ? lazy(() => import('./admin/AdminApp'))
  : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {AdminApp ? (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-950 font-mono text-xs text-cyan-300">
            LOADING ADMIN…
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
