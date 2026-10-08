// @ts-nocheck
'use client';

import { useState } from 'react';
import useUser from '@/utils/useUser';

export default function AdminSettingsPage() {
  const { data: user, loading } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillError, setBackfillError] = useState(null);

  const isAdmin = ['admin', 'owner', 'moderator'].includes(user?.role);

  const runBackfill = async (dryRun) => {
    setBackfillRunning(true);
    setBackfillError(null);
    setBackfillResult(null);
    try {
      const response = await fetch('/api/admin/backfill-subaccounts', {
        method: dryRun ? 'GET' : 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Backfill failed');
      }
      setBackfillResult(data);
    } catch (error) {
      console.error(error);
      setBackfillError(error.message);
    } finally {
      setBackfillRunning(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters',
      });
      return;
    }

    setChanging(true);

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">Please sign in with your admin account</p>
          <a
            href="/account/signin"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">Admin privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
                <p className="mt-2 text-gray-600">Manage your admin account settings</p>
              </div>
              <a
                href="/admin/dashboard"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Info */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <div className="mt-1 text-gray-900">@{user.username}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-gray-900">{user.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Platform Administrator
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Paystack Subaccount Backfill */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Paystack Subaccount Backfill</h2>
            <p className="mt-1 text-sm text-gray-500">
              Scans all seller and monetization profiles missing a Paystack subaccount and creates
              one using their registered Mobile Money or bank details.
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => runBackfill(true)}
                disabled={backfillRunning}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border ${
                  backfillRunning
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {backfillRunning ? 'Working...' : 'Preview (Dry Run)'}
              </button>
              <button
                type="button"
                onClick={() => runBackfill(false)}
                disabled={backfillRunning}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium text-white ${
                  backfillRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {backfillRunning ? 'Working...' : 'Run Backfill Now'}
              </button>
            </div>

            {backfillError && (
              <div className="rounded-md p-4 bg-red-50 text-red-800 border border-red-200">
                <p className="text-sm">{backfillError}</p>
              </div>
            )}

            {backfillResult && (
              <div className="rounded-md p-4 bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">
                  {backfillResult.dry_run
                    ? 'Dry run complete — no changes made'
                    : 'Backfill complete'}
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>Profiles scanned: {backfillResult.summary.scanned}</li>
                  <li>
                    {backfillResult.dry_run
                      ? `Would create: ${backfillResult.summary.would_create}`
                      : `Subaccounts created: ${backfillResult.summary.created}`}
                  </li>
                  <li>
                    Skipped (no registered payout details):{' '}
                    {backfillResult.summary.skipped_no_details}
                  </li>
                  {!backfillResult.dry_run && <li>Failed: {backfillResult.summary.failed}</li>}
                </ul>
                {backfillResult.report?.skipped?.length > 0 && (
                  <div className="mt-3 text-xs text-green-700">
                    <p className="font-medium">Skipped profiles:</p>
                    {backfillResult.report.skipped.map((item, index) => (
                      <p key={index}>
                        • {item.table} — user {item.user_id || 'unknown'}: {item.reason}
                      </p>
                    ))}
                  </div>
                )}
                {backfillResult.report?.failed?.length > 0 && (
                  <div className="mt-3 text-xs text-red-700">
                    <p className="font-medium">Failed profiles:</p>
                    {backfillResult.report.failed.map((item, index) => (
                      <p key={index}>
                        • {item.table} — user {item.user_id || 'unknown'}: {item.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="px-6 py-4 space-y-6">
            {message.text && (
              <div
                className={`rounded-md p-4 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 px-3 py-2 border"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 px-3 py-2 border"
                required
                minLength={8}
              />
              <p className="mt-1 text-sm text-gray-500">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 px-3 py-2 border"
                required
                minLength={8}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={changing}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  changing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                }`}
              >
                {changing ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Security Recommendation</h3>
              <p className="mt-2 text-sm text-blue-700">
                Please change your password regularly and use a strong, unique password for your
                admin account. Never share your credentials with anyone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
