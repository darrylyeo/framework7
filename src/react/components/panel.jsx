import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { useIsomorphicLayoutEffect } from '../shared/use-isomorphic-layout-effect';
import { classNames, getExtraAttrs, noUndefinedProps, emit } from '../shared/utils';
import { colorClasses } from '../shared/mixins';
import { f7ready, f7 } from '../shared/f7';
import { watchProp } from '../shared/watch-prop';

/* dts-imports
import { Panel } from 'framework7/types';
*/

/* dts-props
  id?: string | number;
  className?: string;
  style?: React.CSSProperties;
  side? : string
  effect? : string
  cover? : boolean
  reveal? : boolean
  left? : boolean
  right? : boolean
  opened? : boolean
  resizable? : boolean
  backdrop? : boolean
  backdropEl? : string
  visibleBreakpoint? : number
  collapsedBreakpoint? : number
  swipe? : boolean
  swipeNoFollow? : boolean
  swipeOnlyClose? : boolean
  swipeActiveArea? : number
  swipeThreshold? : number
  COLOR_PROPS
  onPanelOpen? : (event?: any) => void
  onPanelOpened? : (event?: any) => void
  onPanelClose? : (event?: any) => void
  onPanelClosed? : (event?: any) => void
  onPanelBackdropClick? : (event?: any) => void
  onPanelSwipe? : (event?: any) => void
  onPanelSwipeOpen? : (event?: any) => void
  onPanelBreakpoint? : (event?: any) => void
  onPanelCollapsedBreakpoint? : (event?: any) => void
  onPanelResize? : (...args: any[]) => void
  ref?: React.MutableRefObject<{el: HTMLElement | null; f7Panel: () => Panel.Panel}>;
*/

const Panel = forwardRef((props, ref) => {
  const f7Panel = useRef(null);
  const {
    className,
    id,
    style,
    children,
    side,
    effect,
    // cover,
    reveal,
    left,
    // right,
    opened,
    resizable,
    backdrop = true,
    backdropEl,
    containerEl,
    visibleBreakpoint,
    collapsedBreakpoint,
    swipe,
    swipeNoFollow,
    swipeOnlyClose,
    swipeActiveArea = 0,
    swipeThreshold = 0,
  } = props;

  const extraAttrs = getExtraAttrs(props);

  const elRef = useRef(null);

  const isOpened = useRef(false);
  const isClosing = useRef(false);
  const isCollapsed = useRef(false);
  const isBreakpoint = useRef(false);

  const onOpen = (event) => {
    isOpened.current = true;
    isClosing.current = false;
    emit(props, 'panelOpen', event);
  };
  const onOpened = (event) => {
    emit(props, 'panelOpened', event);
  };
  const onClose = (event) => {
    isOpened.current = false;
    isClosing.current = true;
    emit(props, 'panelClose', event);
  };
  const onClosed = (event) => {
    isClosing.current = false;
    emit(props, 'panelClosed', event);
  };
  const onBackdropClick = (event) => {
    emit(props, 'click panelBackdropClick', event);
  };
  const onSwipe = (event) => {
    emit(props, 'panelSwipe', event);
  };
  const onSwipeOpen = (event) => {
    emit(props, 'panelSwipeOpen', event);
  };
  const onBreakpoint = (event) => {
    isBreakpoint.current = true;
    isCollapsed.current = false;
    emit(props, 'panelBreakpoint', event);
  };
  const onCollapsedBreakpoint = (event) => {
    isBreakpoint.current = false;
    isCollapsed.current = true;
    emit(props, 'panelCollapsedBreakpoint', event);
  };
  const onResize = (...args) => {
    emit(props, 'panelResize', ...args);
  };

  useImperativeHandle(ref, () => ({
    el: elRef.current,
    f7Panel: () => f7Panel.current,
  }));

  watchProp(resizable, (newValue) => {
    if (!f7Panel.current) return;
    if (newValue) f7Panel.current.enableResizable();
    else f7Panel.current.disableResizable();
  });
  watchProp(opened, (newValue) => {
    if (!f7Panel.current) return;
    if (newValue) {
      f7Panel.current.open();
    } else {
      f7Panel.current.close();
    }
  });

  const onMount = () => {
    f7ready(() => {
      const $ = f7.$;
      if (!$) return;
      if ($('.panel-backdrop').length === 0) {
        $('<div class="panel-backdrop"></div>').insertBefore(elRef.current);
      }
      const params = noUndefinedProps({
        el: elRef.current,
        resizable,
        backdrop,
        backdropEl,
        containerEl,
        visibleBreakpoint,
        collapsedBreakpoint,
        swipe,
        swipeNoFollow,
        swipeOnlyClose,
        swipeActiveArea,
        swipeThreshold,
        on: {
          open: onOpen,
          opened: onOpened,
          close: onClose,
          closed: onClosed,
          backdropClick: onBackdropClick,
          swipe: onSwipe,
          swipeOpen: onSwipeOpen,
          collapsedBreakpoint: onCollapsedBreakpoint,
          breakpoint: onBreakpoint,
          resize: onResize,
        },
      });
      f7Panel.current = f7.panel.create(params);
      if (opened) {
        f7Panel.current.open(false);
      }
    });
  };

  const onDestroy = () => {
    if (f7Panel.current && f7Panel.current.destroy) {
      f7Panel.current.destroy();
    }
    f7Panel.current = null;
  };

  useIsomorphicLayoutEffect(() => {
    onMount();
    return onDestroy;
  }, []);

  const sideComputed = side || (left ? 'left' : 'right');
  const effectComputed = effect || (reveal ? 'reveal' : 'cover');
  const classes = classNames(
    className,
    'panel',
    {
      'panel-in': isOpened.current && !isClosing.current && !isBreakpoint.current,
      'panel-in-breakpoint': isBreakpoint.current,
      'panel-in-collapsed': isCollapsed.current,
      'panel-resizable': resizable,
      [`panel-${sideComputed}`]: sideComputed,
      [`panel-${effectComputed}`]: effectComputed,
    },
    colorClasses(props),
  );

  return (
    <div id={id} style={style} className={classes} ref={elRef} {...extraAttrs}>
      {children}
      {resizable && <div className="panel-resize-handler"></div>}
    </div>
  );
});

Panel.displayName = 'f7-panel';

export default Panel;
