import { createContext, useContext, ReactNode } from 'react';
import {
  ScannerState,
  useDuplicateScanner,
} from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';

interface ScannerContextType extends ScannerState {
  startScan: () => Promise<void>;
  stopScan: () => void;
  reset: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const scanner = useDuplicateScanner();

  return <ScannerContext.Provider value={scanner}>{children}</ScannerContext.Provider>;
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}
