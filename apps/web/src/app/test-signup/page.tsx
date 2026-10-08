'use client';

import { useState } from 'react';

export default function TestSignUpPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSignUp = async () => {
    setLoading(true);
    setResult(null);

    try {
      const testEmail = 'testuser' + Date.now() + '@test.com';
      console.log('🧪 [Test] Starting direct fetch to /api/auth/sign-up/email');
      console.log('🧪 [Test] Test email:', testEmail);

      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'password123',
          name: 'Test User',
        }),
      });

      console.log('🧪 [Test] Response status:', response.status);
      console.log('🧪 [Test] Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('🧪 [Test] Response body (raw):', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      console.log('🧪 [Test] Response body (parsed):', responseData);

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
      });
    } catch (error: any) {
      console.error('🧪 [Test] Error:', error);
      setResult({
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
      <h1>Auth API Test</h1>
      <button
        onClick={testSignUp}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          background: loading ? '#ccc' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Testing...' : 'Test Sign Up'}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>Result:</h2>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 20,
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 12,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 40, borderTop: '1px solid #ccc', paddingTop: 20 }}>
        <h3>What to check:</h3>
        <ol style={{ fontSize: 14, lineHeight: 1.8 }}>
          <li>Click "Test Sign Up" button</li>
          <li>Check browser console (F12) for detailed logs</li>
          <li>Check the result displayed below</li>
          <li>Look for any error messages or unexpected response formats</li>
        </ol>
      </div>
    </div>
  );
}
