import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { initDatabase, loadVideosResults, saveVideosResults } from '../../../utils/db';
import { setVideosResults } from '../../../redux-code/action';
import { scanVideos, type ScanProgress } from './VideosScanner';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';

export const useVideosScanner = () => {
  const dispatch = useDispatch();
  const [isScanning, setIsScanning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [progress, setProgress] = useState<ScanProgress>({ total: 0, current: 0 });
  const [videos, setVideos] = useState<CategoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Load saved results on mount so UI can render immediately with prior scan data
  useEffect(() => {
    let isMounted = true;

    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadVideosResults();
        if (isMounted && savedResults.length > 0) {
          setVideos(savedResults);
          dispatch(setVideosResults(savedResults));
          // Mark progress as complete so summary / rescan logic behaves like other screens
          setProgress((prev) => ({
            ...prev,
            total: savedResults.length,
            current: savedResults.length,
            stage: 'restored',
          }));
        }
      } catch (error) {
        console.error('Failed to load saved videos results:', error);
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
    setVideos([]);
    setError(null);
    cancelRef.current = false;

    try {
      const results = await scanVideos(
        (prog) => {
          if (!cancelRef.current) {
            setProgress(prog);
          }
        },
        cancelRef,
      );

      if (!cancelRef.current) {
        setVideos(results);
        dispatch(setVideosResults(results));
        setProgress((prev) => ({ ...prev, stage: 'complete' }));
        
        // Save results to database
        if (results.length > 0) {
          try {
            await initDatabase();
            await saveVideosResults(results);
            console.log(`Saved ${results.length} videos to database`);
          } catch (dbError) {
            console.error('Failed to save videos to database:', dbError);
            // Don't throw - allow scan to complete even if save fails
          }
        } else {
          // Even if no videos, clear old results
          try {
            await initDatabase();
            await saveVideosResults([]);
          } catch (dbError) {
            console.error('Failed to clear videos in database:', dbError);
          }
        }
      } else {
        setProgress((prev) => ({ ...prev, stage: 'cancelled', currentFile: 'Cancelled' }));
      }
    } catch (err) {
      if (!cancelRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to scan for videos';
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
    videos,
    error,
    startScan,
    stopScan,
  };
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function UseVideosScannerRoute(): null {
  return null;
}

