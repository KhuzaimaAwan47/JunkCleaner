import type { DuplicateGroup } from "../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner";
import type { LargeFileResult } from "../app/(Screens)/LargeFilesScreen/LargeFileScanner";
import type { OldFileInfo } from "../app/(Screens)/OldFilesScreen/OldFilesScanner";
import type { WhatsAppScanResult } from "../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner";
import type { APKFileInfo } from "../app/(Screens)/APKCleanerScreen/APKCleanerScanner";
import type { SmartScanProgress } from "../utils/smartScan";
import type { SystemHealthResult } from "../utils/systemHealth";
import type { CategoryFile } from "../utils/fileCategoryCalculator";
import { ActionTypes } from "./action-types";

export interface AppState {
  // Scanner results
  whatsappResults: WhatsAppScanResult[];
  largeFileResults: LargeFileResult[];
  oldFileResults: OldFileInfo[];
  duplicateResults: DuplicateGroup[];
  videosResults: CategoryFile[];
  imagesResults: CategoryFile[];
  audiosResults: CategoryFile[];
  documentsResults: CategoryFile[];
  apkResults: APKFileInfo[];
  
  // Selected items per screen (keyed by screen name) - stored as arrays for persistence
  selectedItems: {
    whatsapp: string[];
    large: string[];
    old: string[];
    duplicate: string[];
    videos: string[];
    images: string[];
    audios: string[];
    documents: string[];
    apk: string[];
  };
  
  // Loading states per screen
  loadingStates: {
    whatsapp: boolean;
    large: boolean;
    old: boolean;
    duplicate: boolean;
    apk: boolean;
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
  whatsappResults: [],
  largeFileResults: [],
  oldFileResults: [],
  duplicateResults: [],
  videosResults: [],
  imagesResults: [],
  audiosResults: [],
  documentsResults: [],
  apkResults: [],
  selectedItems: {
    whatsapp: [],
    large: [],
    old: [],
    duplicate: [],
    videos: [],
    images: [],
    audios: [],
    documents: [],
    apk: [],
  },
  loadingStates: {
    whatsapp: false,
    large: false,
    old: false,
    duplicate: false,
    apk: false,
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
    
    // Scanner results
    case ActionTypes.SET_WHATSAPP_RESULTS:
      return { ...state, whatsappResults: action.payload };
    case ActionTypes.SET_LARGE_FILE_RESULTS:
      return { ...state, largeFileResults: action.payload };
    case ActionTypes.SET_OLD_FILE_RESULTS:
      return { ...state, oldFileResults: action.payload };
    case ActionTypes.SET_DUPLICATE_RESULTS:
      return { ...state, duplicateResults: action.payload };
    case ActionTypes.SET_VIDEOS_RESULTS:
      return { ...state, videosResults: action.payload };
    case ActionTypes.SET_IMAGES_RESULTS:
      return { ...state, imagesResults: action.payload };
    case ActionTypes.SET_AUDIOS_RESULTS:
      return { ...state, audiosResults: action.payload };
    case ActionTypes.SET_DOCUMENTS_RESULTS:
      return { ...state, documentsResults: action.payload };
    case ActionTypes.SET_APK_RESULTS:
      return { ...state, apkResults: action.payload };
    
    // Clear results
    case ActionTypes.CLEAR_WHATSAPP_RESULTS:
      return { ...state, whatsappResults: [] };
    case ActionTypes.CLEAR_LARGE_FILE_RESULTS:
      return { ...state, largeFileResults: [] };
    case ActionTypes.CLEAR_OLD_FILE_RESULTS:
      return { ...state, oldFileResults: [] };
    case ActionTypes.CLEAR_DUPLICATE_RESULTS:
      return { ...state, duplicateResults: [] };
    case ActionTypes.CLEAR_VIDEOS_RESULTS:
      return { ...state, videosResults: [] };
    case ActionTypes.CLEAR_IMAGES_RESULTS:
      return { ...state, imagesResults: [] };
    case ActionTypes.CLEAR_AUDIOS_RESULTS:
      return { ...state, audiosResults: [] };
    case ActionTypes.CLEAR_DOCUMENTS_RESULTS:
      return { ...state, documentsResults: [] };
    case ActionTypes.CLEAR_APK_RESULTS:
      return { ...state, apkResults: [] };
    
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



