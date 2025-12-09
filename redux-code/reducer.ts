import type { ApkFile } from "../app/(Screens)/APKRemoverScreen/APKScanner";
import type { ScanResult } from "../app/(Screens)/CacheLogsScreen/CacheLogsScanner";
import type { DuplicateGroup } from "../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner";
import type { JunkFileItem } from "../app/(Screens)/JunkFileScannerScreen/JunkFileScanner";
import type { LargeFileResult } from "../app/(Screens)/LargeFilesScreen/LargeFileScanner";
import type { OldFileInfo } from "../app/(Screens)/OldFilesScreen/OldFilesScanner";
import type { UnusedAppInfo } from "../app/(Screens)/UnusedAppsScreen/UnusedAppsScanner";
import type { WhatsAppScanResult } from "../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner";
import type { SmartScanProgress } from "../utils/smartScan";
import type { SystemHealthResult } from "../utils/systemHealth";
import { ActionTypes } from "./action-types";

export interface AppState {
  // Scanner results
  apkResults: ApkFile[];
  whatsappResults: WhatsAppScanResult[];
  junkFileResults: JunkFileItem[];
  largeFileResults: LargeFileResult[];
  oldFileResults: OldFileInfo[];
  cacheLogsResults: ScanResult[];
  duplicateResults: DuplicateGroup[];
  unusedAppsResults: UnusedAppInfo[];
  
  // Selected items per screen (keyed by screen name) - stored as arrays for persistence
  selectedItems: {
    apk: string[];
    whatsapp: string[];
    junk: string[];
    large: string[];
    old: string[];
    cache: string[];
    duplicate: string[];
    unused: string[];
  };
  
  // Loading states per screen
  loadingStates: {
    apk: boolean;
    whatsapp: boolean;
    junk: boolean;
    large: boolean;
    old: boolean;
    cache: boolean;
    duplicate: boolean;
    unused: boolean;
    smartScan: boolean;
  };
  
  // Scan progress
  scanProgress: SmartScanProgress | null;
  
  // Storage and system info
  storageInfo: {
    total: number;
    used: number;
    free: number;
  } | null;
  
  systemHealth: SystemHealthResult | null;
  
  // Feature progress (for home screen)
  featureProgress: Record<string, number>;
  
  // User data (if needed)
  user: any | null;
}

const initialState: AppState = {
  apkResults: [],
  whatsappResults: [],
  junkFileResults: [],
  largeFileResults: [],
  oldFileResults: [],
  cacheLogsResults: [],
  duplicateResults: [],
  unusedAppsResults: [],
  selectedItems: {
    apk: [],
    whatsapp: [],
    junk: [],
    large: [],
    old: [],
    cache: [],
    duplicate: [],
    unused: [],
  },
  loadingStates: {
    apk: false,
    whatsapp: false,
    junk: false,
    large: false,
    old: false,
    cache: false,
    duplicate: false,
    unused: false,
    smartScan: false,
  },
  scanProgress: null,
  storageInfo: null,
  systemHealth: null,
  featureProgress: {},
  user: null,
};

const appReducer = (state: AppState | undefined = initialState, action: any): AppState => {
  // Handle migration from old state structure if needed
  if (state && (state as any).userState) {
    // This shouldn't happen if migration works, but as a safety net
    state = initialState;
  }
  switch (action.type) {
    case ActionTypes.USER_DATA:
      return { ...state, user: action.payload };
    
    case ActionTypes.CLEAR_USER:
      return { ...state, user: null };
    
    // Scanner results
    case ActionTypes.SET_APK_RESULTS:
      return { ...state, apkResults: action.payload };
    case ActionTypes.SET_WHATSAPP_RESULTS:
      return { ...state, whatsappResults: action.payload };
    case ActionTypes.SET_JUNK_FILE_RESULTS:
      return { ...state, junkFileResults: action.payload };
    case ActionTypes.SET_LARGE_FILE_RESULTS:
      return { ...state, largeFileResults: action.payload };
    case ActionTypes.SET_OLD_FILE_RESULTS:
      return { ...state, oldFileResults: action.payload };
    case ActionTypes.SET_CACHE_LOGS_RESULTS:
      return { ...state, cacheLogsResults: action.payload };
    case ActionTypes.SET_DUPLICATE_RESULTS:
      return { ...state, duplicateResults: action.payload };
    case ActionTypes.SET_UNUSED_APPS_RESULTS:
      return { ...state, unusedAppsResults: action.payload };
    
    // Clear results
    case ActionTypes.CLEAR_APK_RESULTS:
      return { ...state, apkResults: [] };
    case ActionTypes.CLEAR_WHATSAPP_RESULTS:
      return { ...state, whatsappResults: [] };
    case ActionTypes.CLEAR_JUNK_FILE_RESULTS:
      return { ...state, junkFileResults: [] };
    case ActionTypes.CLEAR_LARGE_FILE_RESULTS:
      return { ...state, largeFileResults: [] };
    case ActionTypes.CLEAR_OLD_FILE_RESULTS:
      return { ...state, oldFileResults: [] };
    case ActionTypes.CLEAR_CACHE_LOGS_RESULTS:
      return { ...state, cacheLogsResults: [] };
    case ActionTypes.CLEAR_DUPLICATE_RESULTS:
      return { ...state, duplicateResults: [] };
    case ActionTypes.CLEAR_UNUSED_APPS_RESULTS:
      return { ...state, unusedAppsResults: [] };
    
    // Selected items
    case ActionTypes.SET_SELECTED_ITEMS: {
      const { screen, items } = action.payload;
      return {
        ...state,
        selectedItems: {
          ...state.selectedItems,
          [screen]: items,
        },
      };
    }
    case ActionTypes.TOGGLE_ITEM_SELECTION: {
      const { screen, itemId } = action.payload;
      const currentArray = state.selectedItems[screen as keyof typeof state.selectedItems];
      const index = currentArray.indexOf(itemId);
      const newArray = index >= 0
        ? currentArray.filter(id => id !== itemId)
        : [...currentArray, itemId];
      return {
        ...state,
        selectedItems: {
          ...state.selectedItems,
          [screen]: newArray,
        },
      };
    }
    case ActionTypes.CLEAR_SELECTIONS: {
      const { screen } = action.payload;
      return {
        ...state,
        selectedItems: {
          ...state.selectedItems,
          [screen]: [],
        },
      };
    }
    
    // Loading states
    case ActionTypes.SET_LOADING: {
      const { screen, loading } = action.payload;
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [screen]: loading,
        },
      };
    }
    
    // Scan progress
    case ActionTypes.SET_SCAN_PROGRESS:
      return { ...state, scanProgress: action.payload };
    case ActionTypes.CLEAR_SCAN_PROGRESS:
      return { ...state, scanProgress: null };
    
    // Storage and system info
    case ActionTypes.SET_STORAGE_INFO:
      return { ...state, storageInfo: action.payload };
    case ActionTypes.SET_SYSTEM_HEALTH:
      return { ...state, systemHealth: action.payload };
    case ActionTypes.SET_FEATURE_PROGRESS:
      return { ...state, featureProgress: action.payload };
    
    default:
      return state;
  }
};

export default appReducer;



