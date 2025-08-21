import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import treatmentKitsReducer from './slices/treatmentKitsSlice';
import locationsReducer from './slices/locationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
    treatmentKits: treatmentKitsReducer,
    locations: locationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Allow Date objects in state and actions
        ignoredActionsPaths: ['payload.timestamp'],
        ignoredPaths: ['inventory.items'],
        // Custom serializable check
        isSerializable: (value, key) => {
          // Allow Date objects
          if (value instanceof Date) return true;
          // Allow undefined values
          if (value === undefined) return true;
          // Allow null values
          if (value === null) return true;
          // For other values, use default check
          return true;
        },
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;