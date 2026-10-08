// @ts-nocheck
import { Component } from 'react';

/**
 * A *local* error boundary.
 *
 * The root ErrorBoundary in `_layout.tsx` swaps the ENTIRE tree (tabs included)
 * for an error card when any descendant throws. That is why a failure inside a
 * single component — e.g. the product sheet or the video player — looks like
 * the whole app crashed.
 *
 * Wrapping risky leaf components in this boundary keeps the failure local:
 * the rest of the screen keeps working, and the full error + component stack is
 * printed to the logs panel so the actual missing function can be identified.
 */
export class SafeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const name = this.props.name || 'unnamed';
    console.error(
      `🚨 [SafeBoundary:${name}] ${error?.name || 'Error'}: ${error?.message || String(error)}`
    );
    if (error?.stack) {
      console.error(`🚨 [SafeBoundary:${name}] stack:\n${error.stack}`);
    }
    if (info?.componentStack) {
      console.error(`🚨 [SafeBoundary:${name}] component stack:\n${info.componentStack}`);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default SafeBoundary;
