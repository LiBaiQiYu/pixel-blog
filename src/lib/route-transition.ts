export const ROUTE_TRANSITION_EVENT = 'pixel:route-transition';

export const startRouteTransition = (label = '正在加载') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { label } })
  );
};
