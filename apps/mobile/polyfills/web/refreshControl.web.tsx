import React from 'react';
import View from 'react-native-web/dist/exports/View';

/**
 * Web polyfill for RefreshControl.
 *
 * This file is aliased in metro.config.js for
 * `react-native-web/dist/exports/RefreshControl`.
 *
 * It intentionally has no external dependencies: pull-to-refresh is a native
 * gesture and has no meaningful equivalent in the browser preview, so we
 * render a transparent pass-through that accepts (and ignores) the usual
 * RefreshControl props. Native builds keep the real RefreshControl.
 */
type RefreshControlProps = {
  refreshing?: boolean;
  onRefresh?: () => void;
  colors?: string[];
  tintColor?: string;
  title?: string;
  titleColor?: string;
  progressBackgroundColor?: string;
  progressViewOffset?: number;
  size?: number | string;
  enabled?: boolean;
  style?: any;
  children?: React.ReactNode;
  [key: string]: any;
};

export const RefreshControl = React.forwardRef<any, RefreshControlProps>((props, ref) => {
  const {
    refreshing: _refreshing,
    onRefresh: _onRefresh,
    colors: _colors,
    tintColor: _tintColor,
    title: _title,
    titleColor: _titleColor,
    progressBackgroundColor: _progressBackgroundColor,
    progressViewOffset: _progressViewOffset,
    size: _size,
    enabled: _enabled,
    children,
    ...rest
  } = props;

  return (
    <View ref={ref} {...rest}>
      {children}
    </View>
  );
});

RefreshControl.displayName = 'RefreshControl';

export default RefreshControl;
