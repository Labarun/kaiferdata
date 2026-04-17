/**
 * useCloseOnRouteChange
 * Closes any open menu / sheet / drawer when the route changes.
 * Pass the setter from your useState — fires only when path changes.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useCloseOnRouteChange(setOpen: (open: boolean) => void) {
  const { pathname } = useLocation();
  const prev = useRef(pathname);
  useEffect(() => {
    if (prev.current !== pathname) {
      setOpen(false);
      prev.current = pathname;
    }
  }, [pathname, setOpen]);
}
