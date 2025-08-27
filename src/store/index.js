import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import treatmentKitsReducer from './slices/treatmentKitsSlice';
import practicesReducer from './slices/practicesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
    treatmentKits: treatmentKitsReducer,
    practices: practicesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Completely disable serializable check to prevent animation freezing
    }),
});

// Type definitions for TypeScript (if needed in the future):
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;