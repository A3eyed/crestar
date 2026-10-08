/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 Expo-web postMessage bridge. Renders an HTML page that posts
 * `{ type: 'AUTH_SUCCESS'|'AUTH_ERROR', jwt, user }` to window.parent —
 * AuthWebView.tsx listens for exactly that shape. Changing the event type or
 * payload shape breaks Expo-web auth; do NOT replace with a JSON response or
 * a redirect.
 */
import { auth } from '@/lib/auth';

// Renders an HTML page that posts the session token to the parent frame.
// AuthWebView on the mobile "web" platform listens for this postMessage to
// capture the session after a successful web signin/signup inside its iframe.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  const payload =
    session?.user && session?.session
      ? {
          type: 'AUTH_SUCCESS',
          jwt: session.session.token,
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
        }
      : { type: 'AUTH_ERROR', error: 'Unauthorized' };

  if (payload.type === 'AUTH_ERROR') {
    console.error('[expo-web-success] No valid session - sending AUTH_ERROR');
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Signing in…</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #fff;
    }
    .loader {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      opacity: 0;
      animation: fadeIn 0.3s ease-in 0.5s forwards;
    }
    @keyframes fadeIn {
      to { opacity: 1; }
    }
  </style>
</head>
<body>
<div class="message">
  <div class="loader"></div>
</div>
<script>
(function () {
  var data = ${JSON.stringify(payload)};
  console.log('📤 [expo-web-success] Posting message to parent:', data.type);
  
  var posted = false;
  
  // Try posting message multiple times to ensure delivery
  function postMessageToParent() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(data, '*');
      if (!posted) {
        console.log('✅ [expo-web-success] Message posted to parent');
        posted = true;
      }
    } else if (window.ReactNativeWebView) {
      // Also try React Native WebView postMessage
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
      if (!posted) {
        console.log('✅ [expo-web-success] Message posted to ReactNativeWebView');
        posted = true;
      }
    } else {
      console.error('❌ [expo-web-success] No parent window or WebView found');
    }
  }
  
  // Post immediately
  postMessageToParent();
  
  // Post again after a small delay to ensure delivery
  setTimeout(postMessageToParent, 100);
  setTimeout(postMessageToParent, 300);
  setTimeout(postMessageToParent, 500);
  
  // For debugging: show success/error in console
  if (data.type === 'AUTH_SUCCESS') {
    console.log('✓ Authentication successful - waiting for mobile app to close WebView');
  } else {
    console.error('✗ Authentication failed:', data.error);
  }
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
