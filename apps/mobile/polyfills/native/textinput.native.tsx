import React from 'react';
import type { TextInput as RNTextInputType, TextInputProps } from 'react-native';

// ⚠️ CRITICAL: This polyfill must import the REAL TextInput via its deep
// module path — NOT via `import { TextInput } from 'react-native'`.
//
// Why: metro.config.js aliases './Libraries/Components/TextInput/TextInput'
// (the internal path that react-native's index.js getter requires) to THIS
// file on native platforms. If this file imports TextInput from
// 'react-native', that import goes through react-native/index.js, whose
// getter re-requires the aliased internal path — which resolves right back
// to this polyfill. The component then renders ITSELF in an infinite loop,
// fatally crashing every screen that contains a text field on native
// (Expo Go / device builds), while the web preview keeps working.
//
// Requests originating from /polyfills are excluded from aliasing in
// metro.config.js, and the fully-qualified deep specifier below does not
// match the alias key, so this always resolves to the genuine implementation.
import * as RealTextInputModule from 'react-native/Libraries/Components/TextInput/TextInput';

// Handle both ESM (`.default`) and CJS module shapes.
// biome-ignore lint/suspicious/noExplicitAny: interop with RN internals
const RealTextInput: any = (RealTextInputModule as any).default ?? RealTextInputModule;

const TextInput = React.forwardRef<RNTextInputType, TextInputProps>((props, ref) => {
  return (
    <RealTextInput
      ref={ref}
      placeholderTextColor={props.placeholderTextColor || 'black'}
      {...props}
    />
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;
