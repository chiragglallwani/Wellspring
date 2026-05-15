import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StoredAuthProfile } from "@/types/types";

export type AuthState = {
  userLoggedIn: boolean;
  userInfo: StoredAuthProfile | null;
};

const initialState: AuthState = {
  userLoggedIn: false,
  userInfo: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userLogin: (
      state,
      action: PayloadAction<{ userInfo: StoredAuthProfile }>,
    ) => {
      state.userInfo = {
        name: action.payload.userInfo.name,
        email: action.payload.userInfo.email,
        tenantName: action.payload.userInfo.tenantName,
      };
      state.userLoggedIn = true;
    },
    userLogout: (state) => {
      state.userInfo = null;
      state.userLoggedIn = false;
    },
  },
});

export const { userLogin, userLogout } = authSlice.actions;

export default authSlice.reducer;
