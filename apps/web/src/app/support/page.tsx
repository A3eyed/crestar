// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, HelpCircle, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'general_support', label: 'General Support' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'payment_dispute', label: 'Payment Dispute' },
  { value: 'content_violation', label: 'Report Content' },
  { value: 'user_behavior', label: 'Report a User' },
];

// Keep in sync with SUPPORT_WHATSAPP_NUMBER in api/utils/support.ts
const SUPPORT_WHATSAPP_NUMBER = '233543799308';
const SUPPORT_WHATSAPP_LINK = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hello Crestar Support, I need help.',
)}`;

export default function SupportPage() {
  const { data: user, loading: userLoading } = useUser();

  const [type, setType] = useState('general_support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState('');

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/support';
    }
  }, [user, userLoading]);

  const handleSubmit = async () => {
    setError('');
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in the subject and describe your issue');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in again to submit a report');
        }
        throw new Error(data.error || 'Failed to submit report');
      }
      setSuccessId(data.reportId || 'submitted');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'support-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes support-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <CheckCircle2 size={64} className="text-[#D4AF37] mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Report Received</h1>
          <p className="text-white/60 mb-2">
            Our team will review your report and respond within 24 hours. Check your Inbox for the
            reply, or message us on WhatsApp for faster help.
          </p>
          <p className="text-white/40 text-sm mb-8">Reference: {successId}</p>
          <div className="space-y-3">
            <a
              href="/inbox"
              className="block w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold hover:opacity-90"
            >
              Go to Inbox
            </a>
            <a
              href={SUPPORT_WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white/10 border border-white/20 py-3.5 rounded-xl font-semibold hover:bg-white/20"
            >
              WhatsApp Support
            </a>
            <button
              onClick={() => setSuccessId('')}
              className="block w-full bg-white/10 border border-white/20 py-3.5 rounded-xl font-semibold hover:bg-white/20"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/profile"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </a>
          <div className="flex items-center gap-3">
            <HelpCircle size={22} className="text-[#D4AF37]" />
            <h1 className="text-xl font-bold">Support</h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
          <MessageCircle size={20} className="text-[#D4AF37] mt-0.5 shrink-0" />
          <p className="text-white/60 text-sm">
            Tell us what's going on and our team will get back to you within 24 hours. Replies
            arrive in your Inbox. For faster help, message us on WhatsApp at{' '}
            <a
              href={SUPPORT_WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4AF37] underline"
            >
              +233 54 379 9308
            </a>
            .
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            What do you need help with?
          </label>
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  type === t.value
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-white/5 text-white/60 border-white/15 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            maxLength={100}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Details</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what happened, including any order numbers or usernames involved..."
            rows={6}
            maxLength={2000}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 resize-none focus:border-[#D4AF37] focus:outline-none"
          />
          <p className="text-white/30 text-xs text-right mt-1">{message.length}/2000</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#D4AF37] text-black rounded-xl py-3.5 font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {submitting ? 'Submitting...' : 'Submit to Support'}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
