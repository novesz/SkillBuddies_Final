import React, { createContext, useContext } from "react";

const GroupFinderContext = createContext(null);

export function useGroupFinder() {
  const ctx = useContext(GroupFinderContext);
  if (!ctx) return { isOpen: false, open: () => {}, close: () => {} };
  return ctx;
}

export { GroupFinderContext };
