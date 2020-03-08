import * as React from 'react'
import useLocation from 'react-use/esm/useLocation'

export function useOnLocationChange(
  callback: React.EffectCallback,
  extraDeps: React.DependencyList = [],
) {
  const { href, pathname, search } = useLocation()
  React.useEffect(callback, [href, pathname, search, ...extraDeps])
}