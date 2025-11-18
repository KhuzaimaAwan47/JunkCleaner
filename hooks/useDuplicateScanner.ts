import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDuplicateGroups, loadDuplicateGroups, saveDuplicateGroups } from '../utils/db';
import { DuplicateGroup, scanForDuplicates, ScanOptions, ScanProgress } from '../utils/fileScanner';

export interface ScannerState {
  isScanning: boolean;
  progress: ScanProgress;
  duplicates: DuplicateGroup[];
  error: string | null;
}

export function useDuplicateScanner() {
  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    progress: {
      current: 0,
      total: 0,
      currentFile: '',
      stage: 'scanning',
    },
    duplicates: [],
    error: null,
  });

  const lastUpdateTime = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const THROTTLE_MS = 50; // Reduced from 150ms to 50ms for smoother updates
  const hasLoadedInitialData = useRef<boolean>(false);

  // Load saved duplicates on mount
  useEffect(() => {
    if (hasLoadedInitialData.current) return;
    
    const loadSavedDuplicates = async () => {
      try {
        const savedDuplicates = await loadDuplicateGroups();
        if (savedDuplicates.length > 0) {
          setState(prev => ({
            ...prev,
            duplicates: savedDuplicates,
          }));
        }
      } catch (error) {
        console.error('Failed to load saved duplicates:', error);
      } finally {
        hasLoadedInitialData.current = true;
      }
    };

    void loadSavedDuplicates();
  }, []);

  const updateProgress = useCallback((progress: ScanProgress) => {
    // Don't update progress if scan has been cancelled
    if (isCancelledRef.current) {
      return;
    }

    const now = Date.now();
    setState(prev => {
      // Double-check cancellation state
      if (!prev.isScanning || isCancelledRef.current) {
        return prev;
      }

      const normalizedTotal = progress.total || prev.progress.total || 1;
      // Always update if total changed or stage changed, otherwise throttle
      const shouldForceUpdate =
        prev.progress.total !== normalizedTotal ||
        prev.progress.stage !== progress.stage ||
        now - lastUpdateTime.current >= THROTTLE_MS;

      if (!shouldForceUpdate && normalizedTotal === prev.progress.total) {
        return prev;
      }

      lastUpdateTime.current = now;
      return { ...prev, progress: { ...progress, total: normalizedTotal } };
    });
  }, [THROTTLE_MS]);

  const startScan = useCallback(async () => {
    if (state.isScanning) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false; // Reset cancellation flag

    setState({
      isScanning: true,
      progress: {
        current: 0,
        total: 0,
        currentFile: 'Starting scan...',
        stage: 'scanning',
      },
      duplicates: [],
      error: null,
    });

    lastUpdateTime.current = Date.now();

    try {
      const options: ScanOptions = { signal: controller.signal };
      const duplicates = await scanForDuplicates(updateProgress, options);

      setState(prev => ({
        isScanning: false,
        progress: {
          current: prev.progress.total || prev.progress.current || 1,
          total: prev.progress.total || prev.progress.current || 1,
          currentFile: 'Complete',
          stage: 'hashing',
        },
        duplicates,
        error: null,
      }));

      // Save duplicates to database (even if empty, to clear old saved data)
      try {
        await saveDuplicateGroups(duplicates);
      } catch (error) {
        console.error('Failed to save duplicates:', error);
        // Don't throw - saving is not critical for functionality
      }
    } catch (error) {
      // Check if it's a cancellation error
      const isCancelled = 
        (error as Error).name === 'SCAN_CANCELLED' ||
        (error as Error).message === 'SCAN_CANCELLED' ||
        (error as any)?.code === 'ABORT_ERR';
      
      if (isCancelled) {
        isCancelledRef.current = true; // Mark as cancelled
        setState(prev => ({
          isScanning: false,
          progress: {
            current: prev.progress.current || 0,
            total: prev.progress.total || 0,
            currentFile: 'Cancelled',
            stage: prev.progress.stage,
            scannedFiles: prev.progress.scannedFiles,
            totalFiles: prev.progress.totalFiles,
          },
          duplicates: [],
          error: null,
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setState(prev => ({
          isScanning: false,
          progress: {
            current: prev.progress.current || 0,
            total: prev.progress.total || 0,
            currentFile: '',
            stage: prev.progress.stage,
            scannedFiles: prev.progress.scannedFiles,
            totalFiles: prev.progress.totalFiles,
          },
          duplicates: [],
          error: errorMessage,
        }));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [updateProgress, state.isScanning]);

  const stopScan = useCallback(() => {
    // Mark as cancelled to prevent further progress updates
    isCancelledRef.current = true;
    
    // Immediately update UI state to show stopping
    setState(prev => ({
      ...prev,
      isScanning: false,
      progress: {
        ...prev.progress,
        currentFile: 'Cancelled',
      },
    }));
    
    // Abort the scan operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(async () => {
    stopScan();
    isCancelledRef.current = false; // Reset cancellation flag
    
    // Clear saved duplicates from database
    try {
      await clearDuplicateGroups();
    } catch (error) {
      console.error('Failed to clear saved duplicates:', error);
    }
    
    setState({
      isScanning: false,
      progress: {
        current: 0,
        total: 0,
        currentFile: '',
        stage: 'scanning',
      },
      duplicates: [],
      error: null,
    });
  }, [stopScan]);

  return {
    ...state,
    startScan,
    stopScan,
    reset,
  };
}
