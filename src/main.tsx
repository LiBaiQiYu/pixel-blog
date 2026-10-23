import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { pixelAudio } from './utils/sound';

document.addEventListener(
  'click',
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest(
      'button, a[href], [role="button"], select, summary, .cursor-pointer'
    );
    if (!control || control.closest('[data-custom-sound]')) return;
    pixelAudio.playClick();
  },
  true
);

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
