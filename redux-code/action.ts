import { ActionTypes } from "./action-types";

export const reduxAction = (payload: any, type: ActionTypes) => ({
  type,
  payload
});



// Scanner results
export const setApkResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_APK_RESULTS);
export const setWhatsappResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_WHATSAPP_RESULTS);
export const setJunkFileResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_JUNK_FILE_RESULTS);
export const setLargeFileResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_LARGE_FILE_RESULTS);
export const setOldFileResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_OLD_FILE_RESULTS);
export const setCacheLogsResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_CACHE_LOGS_RESULTS);
export const setDuplicateResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_DUPLICATE_RESULTS);
export const setUnusedAppsResults = (payload: any[]) => reduxAction(payload, ActionTypes.SET_UNUSED_APPS_RESULTS);

// Clear results
export const clearApkResults = () => ({ type: ActionTypes.CLEAR_APK_RESULTS });
export const clearWhatsappResults = () => ({ type: ActionTypes.CLEAR_WHATSAPP_RESULTS });
export const clearJunkFileResults = () => ({ type: ActionTypes.CLEAR_JUNK_FILE_RESULTS });
export const clearLargeFileResults = () => ({ type: ActionTypes.CLEAR_LARGE_FILE_RESULTS });
export const clearOldFileResults = () => ({ type: ActionTypes.CLEAR_OLD_FILE_RESULTS });
export const clearCacheLogsResults = () => ({ type: ActionTypes.CLEAR_CACHE_LOGS_RESULTS });
export const clearDuplicateResults = () => ({ type: ActionTypes.CLEAR_DUPLICATE_RESULTS });
export const clearUnusedAppsResults = () => ({ type: ActionTypes.CLEAR_UNUSED_APPS_RESULTS });

// Selected items
export const setSelectedItems = (screen: string, items: string[]) => 
  reduxAction({ screen, items }, ActionTypes.SET_SELECTED_ITEMS);
export const toggleItemSelection = (screen: string, itemId: string) => 
  reduxAction({ screen, itemId }, ActionTypes.TOGGLE_ITEM_SELECTION);
export const clearSelections = (screen: string) => 
  reduxAction({ screen }, ActionTypes.CLEAR_SELECTIONS);

// Loading states
export const setLoading = (screen: string, loading: boolean) => 
  reduxAction({ screen, loading }, ActionTypes.SET_LOADING);

// Scan progress
export const setScanProgress = (payload: any) => reduxAction(payload, ActionTypes.SET_SCAN_PROGRESS);
export const clearScanProgress = () => ({ type: ActionTypes.CLEAR_SCAN_PROGRESS });

// Storage and system info
export const setStorageInfo = (payload: { total: number; used: number; free: number }) => 
  reduxAction(payload, ActionTypes.SET_STORAGE_INFO);
export const setSystemHealth = (payload: any) => reduxAction(payload, ActionTypes.SET_SYSTEM_HEALTH);
export const setFeatureProgress = (payload: Record<string, number>) => 
  reduxAction(payload, ActionTypes.SET_FEATURE_PROGRESS);

export default {};
