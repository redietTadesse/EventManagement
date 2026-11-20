import { useEffect, useRef, useState } from 'react';
import { authApi } from '../api/axios';

export default function GoogleClientSignIn({ onSignedIn }) {
  const button = useRef(null);
  const callback = useRef(onSignedIn);
  callback.current = onSignedIn;
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let script;
    async function initialize() {
      try {
        const { data } = await authApi.get('/auth/google/config', { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!data.clientId?.trim()) {
          setStatus('unavailable');
          return;
        }
        const nonce = window.crypto.randomUUID();
        const render = () => {
          if (controller.signal.aborted) return;
          const google = window.google?.accounts?.id;
          if (!google) { setStatus('unavailable'); return; }
          google.initialize({
            client_id: data.clientId, nonce, auto_select: false,
            callback: async ({ credential }) => {
              if (controller.signal.aborted) return;
              setError('');
              try {
                const result = await authApi.post('/auth/google', { credential, nonce }, { signal: controller.signal });
                if (!controller.signal.aborted) await callback.current(result.data.accessToken);
              } catch (failure) {
                if (!controller.signal.aborted) setError(failure.response?.data?.message || 'Google sign-in did not finish. Try again or use your password.');
              }
            },
          });
          google.renderButton(button.current, { theme:'outline', size:'large', text:'continue_with', width:250 });
          setStatus('ready');
        };
        if (window.google?.accounts?.id) render();
        else {
          script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.onload = () => {
            try { render(); }
            catch { if (!controller.signal.aborted) setStatus('unavailable'); }
          };
          script.onerror = () => { if (!controller.signal.aborted) setStatus('unavailable'); };
          document.head.appendChild(script);
        }
      } catch {
        if (!controller.signal.aborted) setStatus('unavailable');
      }
    }
    initialize();
    return () => { controller.abort(); script?.remove(); };
  }, []);

  return <div className="mb-4" aria-label="Google sign-in">
    <div ref={button} />
    {status === 'loading' && <p className="text-sm text-slate-600" role="status">Loading Google sign-in…</p>}
    {status === 'unavailable' && <p className="text-sm text-slate-600">Google sign-in is unavailable. You can continue with your password.</p>}
    {error && <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p>}
  </div>;
}
