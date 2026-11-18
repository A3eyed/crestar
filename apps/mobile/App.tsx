import { App } from 'expo-router/build/qualified-entry';

// Do NOT mount hooks that call usePathname / useRouter here.
// This entry sits outside NavigationContainer; those hooks throw on launch
// (SIGABRT via RCTFatal in TestFlight). Screen analytics lives in
// src/app/_layout.tsx inside the router tree.
export default function MobileRoot() {
  return <App />;
}
