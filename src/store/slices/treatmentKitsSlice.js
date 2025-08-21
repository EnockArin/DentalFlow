import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  kits: [],
  loading: false,
  error: null,
  activeKit: null,
};

const treatmentKitsSlice = createSlice({
  name: 'treatmentKits',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setKits: (state, action) => {
      state.kits = action.payload;
    },
    addKit: (state, action) => {
      state.kits.push(action.payload);
    },
    updateKit: (state, action) => {
      const index = state.kits.findIndex(kit => kit.id === action.payload.id);
      if (index !== -1) {
        state.kits[index] = { ...state.kits[index], ...action.payload };
      }
    },
    deleteKit: (state, action) => {
      state.kits = state.kits.filter(kit => kit.id !== action.payload);
    },
    setActiveKit: (state, action) => {
      state.activeKit = action.payload;
    },
    clearActiveKit: (state) => {
      state.activeKit = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLoading,
  setKits,
  addKit,
  updateKit,
  deleteKit,
  setActiveKit,
  clearActiveKit,
  setError,
} = treatmentKitsSlice.actions;

export default treatmentKitsSlice.reducer;