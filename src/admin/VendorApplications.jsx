import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';

const TABS = [
    { key: 'PENDING', label: 'Applicants' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
];

const formatCategory = (value) =>
    (value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '');

export default function VendorApplications() {
    const [status, setStatus] = useState('PENDING');
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    // review = { id, action: 'approve' | 'reject' } for the card currently being decided
    const [review, setReview] = useState(null);
    const [note, setNote] = useState('');
    const [verified, setVerified] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/vendor-applications', { params: { status } });
            setApplications(res.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load vendor applications.');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        load();
    }, [load]);

    const openReview = (id, action) => {
        setReview({ id, action });
        setNote('');
        setVerified(false);
        setError('');
        setToast('');
    };

    const closeReview = () => {
        setReview(null);
        setNote('');
        setVerified(false);
    };

    const submitReview = async (application) => {
        setSaving(true);
        setError('');
        try {
            const res = await api.post(
                `/vendor-applications/${application.id}/${review.action === 'approve' ? 'approve' : 'reject'}`,
                { note: note.trim() || null }
            );
            setToast(
                review.action === 'approve'
                    ? `${res.data.companyName} is now a vendor. They sign in with the username "${res.data.username}".`
                    : `${res.data.companyName}'s application was rejected.`
            );
            closeReview();
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save the decision. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout title="Vendor Applications">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Vendor Applications</h1>
                    <p className="text-sm text-gray-500">
                        Verify each applicant's documents in person, then add them as a vendor.
                    </p>
                </div>
                <Link
                    to="/admin/vendors"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Back to Vendors
                </Link>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setStatus(tab.key); closeReview(); }}
                        className={`rounded-lg px-4 py-2 text-sm font-medium ${
                            status === tab.key
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {toast && (
                <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {toast}
                </div>
            )}
            {error && (
                <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200/60 bg-white" />
                    ))}
                </div>
            ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 bg-white p-8 text-center text-slate-500">
                    {status === 'PENDING'
                        ? 'No applicants are waiting for review.'
                        : `No ${status.toLowerCase()} applications.`}
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map((application) => {
                        const reviewing = review?.id === application.id;
                        return (
                            <div key={application.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">{application.companyName}</h3>
                                        <p className="text-sm text-slate-500">
                                            {formatCategory(application.serviceCategory)} · Applied {formatDate(application.createdAt)}
                                        </p>
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-xs ${
                                        application.status === 'PENDING'
                                            ? 'bg-amber-100 text-amber-700'
                                            : application.status === 'APPROVED'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {application.status === 'PENDING' ? 'Awaiting verification' : formatCategory(application.status)}
                                    </span>
                                </div>

                                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                    <div><dt className="text-slate-400">Contact person</dt><dd className="text-slate-700">{application.contactPerson}</dd></div>
                                    <div><dt className="text-slate-400">Username</dt><dd className="font-mono text-slate-700">{application.username}</dd></div>
                                    <div><dt className="text-slate-400">Email</dt><dd className="text-slate-700">{application.email}</dd></div>
                                    <div><dt className="text-slate-400">Phone</dt><dd className="text-slate-700">{application.phone}</dd></div>
                                    {application.website && (
                                        <div><dt className="text-slate-400">Website</dt><dd className="break-all text-slate-700">{application.website}</dd></div>
                                    )}
                                    {application.establishedYear && (
                                        <div><dt className="text-slate-400">Established</dt><dd className="text-slate-700">{application.establishedYear}</dd></div>
                                    )}
                                </dl>

                                {application.description && (
                                    <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{application.description}</p>
                                )}

                                {application.status !== 'PENDING' && (
                                    <p className="mt-3 text-sm text-slate-500">
                                        Reviewed {formatDate(application.reviewedAt)}
                                        {application.reviewNote ? ` · ${application.reviewNote}` : ''}
                                        {application.vendorId && (
                                            <>
                                                {' · '}
                                                <Link to={`/admin/vendors/${application.vendorId}`} className="text-indigo-600 hover:text-indigo-700">
                                                    View vendor
                                                </Link>
                                            </>
                                        )}
                                    </p>
                                )}

                                {application.status === 'PENDING' && !reviewing && (
                                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => openReview(application.id, 'approve')}
                                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                                        >
                                            Add as vendor
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openReview(application.id, 'reject')}
                                            className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {reviewing && (
                                    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                        {review.action === 'approve' && (
                                            <label className="flex items-start gap-2 text-sm text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1"
                                                    checked={verified}
                                                    onChange={(e) => setVerified(e.target.checked)}
                                                />
                                                I have verified this applicant's documents in person.
                                            </label>
                                        )}
                                        <label className="block text-sm font-medium text-slate-700">
                                            {review.action === 'approve' ? 'Note (optional)' : 'Reason (optional)'}
                                            <textarea
                                                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                rows={2}
                                                maxLength={500}
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                            />
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={saving || (review.action === 'approve' && !verified)}
                                                onClick={() => submitReview(application)}
                                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                                                    review.action === 'approve'
                                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                                        : 'bg-rose-600 hover:bg-rose-700'
                                                }`}
                                            >
                                                {saving
                                                    ? 'Saving…'
                                                    : review.action === 'approve'
                                                        ? 'Confirm and add vendor'
                                                        : 'Confirm rejection'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={closeReview}
                                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Layout>
    );
}
