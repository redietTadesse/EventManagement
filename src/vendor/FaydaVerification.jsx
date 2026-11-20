import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';
import Layout from '../components/Layout';

const path = '/vendors/me/fayda';
const attemptKey = 'aicc.fayda.sandbox';

export default function FaydaVerification() {
  const status = useApiResource(path);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setStarting(true);
    setError('');
    try {
      const { data } = await api.post(path + '/start');
      sessionStorage.setItem(attemptKey, JSON.stringify({ state: data.state, ticket: data.ticket }));
      window.location.assign(data.authorizationUrl);
    } catch {
      setError('Could not open the Fayda sandbox. Please try again.');
      setStarting(false);
    }
  }

  if (status.loading) return null;
  return <section className="surface p-5" aria-label="Vendor identity verification">
    <h2 className="font-semibold">Fayda sandbox verification</h2>
    {status.error ? <p role="alert" className="mt-2 text-sm">Verification status is unavailable. <button className="underline" onClick={status.reload}>Try again</button></p>
      : status.data.verifiedAt ? <p className="mt-2 text-sm">Sandbox check completed on {new Date(status.data.verifiedAt).toLocaleDateString()}.</p>
      : status.data.enabled ? <>
        <p className="mt-2 text-sm">Optional identity check for vendors. Use a Fayda sandbox test identity.</p>
        <button type="button" disabled={starting} className="btn-outline mt-4" onClick={start}>{starting ? 'Opening Fayda…' : 'Verify with Fayda sandbox'}</button>
      </> : <p className="mt-2 text-sm">The optional sandbox check is unavailable until Fayda is configured.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}
  </section>;
}

export function FaydaCallback() {
  const { search } = useLocation();
  const request = useRef(null);
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    if (!request.current) {
      request.current = Promise.resolve().then(async () => {
        const attempt = JSON.parse(sessionStorage.getItem(attemptKey) || 'null');
        sessionStorage.removeItem(attemptKey);
        window.history.replaceState(window.history.state, '', window.location.pathname);
        const response = new URLSearchParams(search);
        if (!attempt || response.has('error') || !response.get('code') || response.get('state') !== attempt.state) {
          throw new Error('Invalid Fayda callback');
        }
        const { data } = await api.post(path + '/complete', { ...attempt, code: response.get('code') });
        if (!data.verifiedAt) throw new Error('Missing Fayda verification record');
      });
    }
    let active = true;
    request.current.then(
      () => { if (active) setOutcome('success'); },
      () => { if (active) setOutcome('failed'); },
    );
    return () => { active = false; };
  }, [search]);

  return <Layout title="Fayda verification"><section className="surface p-6">
    <h1 className="text-xl font-semibold">Fayda sandbox verification</h1>
    <p role={outcome === 'failed' ? 'alert' : 'status'} className="my-3">
      {outcome === 'success' ? 'Your sandbox check is recorded.' : outcome === 'failed' ? 'The check did not finish. Return to your vendor workspace to start again.' : 'Checking the response from Fayda…'}
    </p>
    <Link to="/vendor/dashboard" className="btn-outline">Back to vendor workspace</Link>
  </section></Layout>;
}
