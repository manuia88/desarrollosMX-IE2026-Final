'use client';

import { useEffect } from 'react';

export function AxeBoot() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    Promise.all([import('react'), import('react-dom'), import('@axe-core/react')])
      .then(([React, ReactDOM, axe]) => {
        axe.default(React.default, ReactDOM.default, 1000);
      })
      .catch(() => {
        /* dev-only, no-op on failure */
      });
  }, []);
  return null;
}
