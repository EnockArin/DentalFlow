import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  locations: [],
  activeLocation: null,
  loading: false,
  error: null,
  transferHistory: [],
};

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setLocations: (state, action) => {
      state.locations = action.payload;
    },
    addLocation: (state, action) => {
      state.locations.push(action.payload);
    },
    updateLocation: (state, action) => {
      const index = state.locations.findIndex(loc => loc.id === action.payload.id);
      if (index !== -1) {
        state.locations[index] = { ...state.locations[index], ...action.payload };
      }
    },
    deleteLocation: (state, action) => {
      state.locations = state.locations.filter(loc => loc.id !== action.payload);
    },
    setActiveLocation: (state, action) => {
      state.activeLocation = action.payload;
    },
    clearActiveLocation: (state) => {
      state.activeLocation = null;
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
  setLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  setActiveLocation,
  clearActiveLocation,
  setTransferHistory,
  addTransfer,
  setError,
  clearError,
} = locationsSlice.actions;

export default locationsSlice.reducer;