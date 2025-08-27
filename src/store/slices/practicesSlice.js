import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  practices: [],
  activePractice: null,
  loading: false,
  error: null,
  transferHistory: [],
};

const practicesSlice = createSlice({
  name: 'practices',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setPractices: (state, action) => {
      state.practices = action.payload;
    },
    addPractice: (state, action) => {
      state.practices.push(action.payload);
    },
    updatePractice: (state, action) => {
      const index = state.practices.findIndex(practice => practice.id === action.payload.id);
      if (index !== -1) {
        state.practices[index] = { ...state.practices[index], ...action.payload };
      }
    },
    deletePractice: (state, action) => {
      state.practices = state.practices.filter(practice => practice.id !== action.payload);
    },
    setActivePractice: (state, action) => {
      state.activePractice = action.payload;
    },
    clearActivePractice: (state) => {
      state.activePractice = null;
    },
    setTransferHistory: (state, action) => {
      state.transferHistory = action.payload;
    },
    addTransfer: (state, action) => {
      state.transferHistory.unshift(action.payload);
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
  setPractices,
  addPractice,
  updatePractice,
  deletePractice,
  setActivePractice,
  clearActivePractice,
  setTransferHistory,
  addTransfer,
  setError,
  clearError,
} = practicesSlice.actions;

export default practicesSlice.reducer;