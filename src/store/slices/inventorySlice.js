import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  loading: false,
  error: null,
  lowStockItems: [],
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setItems: (state, action) => {
      state.items = action.payload;
      // Calculate low stock items
      state.lowStockItems = action.payload.filter(
        item => item.currentQuantity <= item.minStockLevel
      );
    },
    addItem: (state, action) => {
      state.items.push(action.payload);
      // Recalculate low stock items
      state.lowStockItems = state.items.filter(
        item => item.currentQuantity <= item.minStockLevel
      );
    },
    updateItem: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
        // Recalculate low stock items
        state.lowStockItems = state.items.filter(
          item => item.currentQuantity <= item.minStockLevel
        );
      }
    },
    deleteItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      // Recalculate low stock items
      state.lowStockItems = state.items.filter(
        item => item.currentQuantity <= item.minStockLevel
      );
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setItems,
  addItem,
  updateItem,
  deleteItem,
  setError,
  clearError,
} = inventorySlice.actions;

export default inventorySlice.reducer;