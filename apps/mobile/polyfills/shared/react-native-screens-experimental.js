/**
 * Stub for `react-native-screens/experimental`.
 *
 * expo-router 57 statically imports this subpath from
 * `build/layouts/experimental-stack/ExperimentalStackView.js`. In this monorepo
 * the hoisted copy of `react-native-screens` does not expose that subpath, so
 * Metro fails to resolve it and the entire bundle errors out — even though the
 * app never renders an experimental stack (see `src/app/_layout.tsx`, which
 * uses the classic `Stack` from expo-router).
 *
 * This module satisfies the resolution with a Proxy that hands back a harmless
 * no-op component for any named export expo-router (or anything else) reaches
 * for. Nothing in the app tree touches these, so they are never rendered. If
 * one ever is, it renders its children instead of crashing.
 *
 * `__esModule: true` is important: it tells Babel's interop to pass this object
 * straight through instead of copying own keys (a Proxy has none), which keeps
 * named imports flowing through the `get` trap.
 */

const React = require('react');

const cache = new Map();

function createNoopComponent(name) {
  if (cache.has(name)) {
    return cache.get(name);
  }

  const Component = (props) =>
    React.createElement(React.Fragment, null, props ? props.children : null);
  Component.displayName = `ScreensExperimentalStub(${name})`;

  cache.set(name, Component);
  return Component;
}

const stub = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === '__esModule') {
        return true;
      }
      if (property === 'default') {
        return stub;
      }
      // Symbols (Symbol.toPrimitive, Symbol.iterator, inspection helpers, ...)
      // must not be turned into components or React/console will choke.
      if (typeof property === 'symbol') {
        return undefined;
      }
      return createNoopComponent(property);
    },
    has() {
      return true;
    },
  }
);

module.exports = stub;
