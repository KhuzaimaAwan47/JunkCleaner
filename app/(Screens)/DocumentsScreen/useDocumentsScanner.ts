import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { initDatabase, loadDocumentsResults, saveDocumentsResults } from '../../../utils/db';
import { setDocumentsResults } from '../../../redux-code/action';
import { scanDocuments, type ScanProgress } from './DocumentsScanner';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';

export const useDocumentsScanner = () => {
  const dispatch = useDispatch();
  const [isScanning, setIsScanning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [progress, setProgress] = useState<ScanProgress>({ total: 0, current: 0 });
  const [documents, setDocuments] = useState<CategoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Load saved results on mount so UI can render immediately with prior scan data
  useEffect(() => {
    let isMounted = true;

    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadDocumentsResults();
        if (isMounted && savedResults.length > 0) {
          setDocuments(savedResults);
          dispatch(setDocumentsResults(savedResults));
          // Mark progress as complete so summary / rescan logic behaves like other screens
          setProgress((prev) => ({
            ...prev,
            total: savedResults.length,
            current: savedResults.length,
            stage: 'restored',
          }));
        }
      } catch (error) {
        console.error('Failed to load saved documents results:', error);
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    loadSavedResults();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const startScan = useCallback(async () => {
    if (isScanning) {
      return;
    }

    setIsScanning(true);
    setProgress({ total: 0, current: 0 });
    setDocuments([]);
    setError(null);
    cancelRef.current = false;

    try {
      const results = await scanDocuments(
        (prog) => {
          if (!cancelRef.current) {
            setProgress(prog);
          }
        },
        cancelRef,
      );

      if (!cancelRef.current) {
        setDocuments(results);
        dispatch(setDocumentsResults(results));
        setProgress((prev) => ({ ...prev, stage: 'complete' }));
        
        // Save results to database
        if (results.length > 0) {
          try {
            await initDatabase();
            await saveDocumentsResults(results);
            console.log(`Saved ${results.length} documents to database`);
          } catch (dbError) {
            console.error('Failed to save documents to database:', dbError);
            // Don't throw - allow scan to complete even if save fails
          }
        } else {
          // Even if no documents, clear old results
          try {
            await initDatabase();
            await saveDocumentsResults([]);
          } catch (dbError) {
            console.error('Failed to clear documents in database:', dbError);
          }
        }
      } else {
        setProgress((prev) => ({ ...prev, stage: 'cancelled', currentFile: 'Cancelled' }));
      }
    } catch (err) {
      if (!cancelRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to scan for documents';
        setError(message);
      }
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, dispatch]);

  const stopScan = useCallback(() => {
    cancelRef.current = true;
    setIsScanning(false);
    setProgress((prev) => ({ ...prev, currentFile: 'Cancelled' }));
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return {
    isScanning,
    isRestoring,
    progress,
    documents,
    error,
    startScan,
    stopScan,
  };
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function UseDocumentsScannerRoute(): null {
  return null;
}

