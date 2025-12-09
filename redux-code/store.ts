import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, createStore } from "redux";
import { persistReducer, persistStore } from 'redux-persist';
import appReducer from "./reducer";

// Configure persistence
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  version: 1,
  migrate: (state: any) => {
    // Handle migration from old state structure (userState -> appState)
    // This runs before combineReducers, so we need to transform the entire state
    if (!state) {
      return Promise.resolve(undefined);
    }
    
    // If state has userState (old structure), migrate it
    if (state.userState) {
      return Promise.resolve({
        appState: state.userState,
        _persist: {
          ...(state._persist || {}),
          version: 1,
        },
      });
    }
    
    // If state already has appState, ensure version is set
    if (state.appState) {
      return Promise.resolve({
        ...state,
        _persist: {
          ...(state._persist || {}),
          version: 1,
        },
      });
    }
    
    // Invalid state structure - start fresh
    return Promise.resolve(undefined);
  },
  blacklist: ['loadingStates', 'scanProgress'], // Don't persist temporary UI states
};

// Combine reducers
const rootReducer = combineReducers({
  appState: appReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Infer RootState type for TypeScript
export type RootState = ReturnType<typeof rootReducer>;

// Create store
const store = createStore(persistedReducer);

// Create persistor
const persistor = persistStore(store);

// Export store and persistor
export { persistor, store };

export default {};