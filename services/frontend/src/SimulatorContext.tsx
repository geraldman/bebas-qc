import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SimulatorContextValue {
  isOpen: boolean;
  openSimulator: () => void;
  closeSimulator: () => void;
}

const SimulatorContext = createContext<SimulatorContextValue>({
  isOpen: false,
  openSimulator: () => {},
  closeSimulator: () => {},
});

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openSimulator = useCallback(() => setIsOpen(true), []);
  const closeSimulator = useCallback(() => setIsOpen(false), []);

  return (
    <SimulatorContext.Provider value={{ isOpen, openSimulator, closeSimulator }}>
      {children}
    </SimulatorContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulator() {
  return useContext(SimulatorContext);
}
