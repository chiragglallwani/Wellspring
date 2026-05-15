import type { AxiosResponse } from "axios";
import { api } from "./api";
import { getApiErrorMessage } from "@/lib/apiError";
import { setAuthTokens } from "@/lib/tokenStore";
import { clearSession } from "./authSession";
import type {
  LoginFormValues,
  RegisterFormValues,
  StoredAuthProfile,
} from "@/types/types";
import { getStore } from "@/store";
import { userLogin } from "@/store/slices/authSlice";

type LoginResponseData = {
  user: {
    userFullName: string;
    userEmail: string;
    tenantName: string;
  };
  accessToken: string;
  csrfToken: string;
};

function mapApiUserToProfile(raw: LoginResponseData["user"]): StoredAuthProfile {
  return {
    name: raw.userFullName,
    email: raw.userEmail,
    tenantName: raw.tenantName,
  };
}

function applyLoginResponse(res: AxiosResponse) {
  const data = res.data?.data as LoginResponseData | undefined;
  if (!data?.user || !data.accessToken || !data.csrfToken) {
    throw new Error("Sign-in succeeded but the server did not return a valid session.");
  }
  setAuthTokens(data.accessToken, data.csrfToken);
  getStore().dispatch(userLogin({ userInfo: mapApiUserToProfile(data.user) }));
}

export async function login(payload: LoginFormValues) {
  try {
    const res = await api.post("/auth/login", payload);
    applyLoginResponse(res);
    return res;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to sign in. Please try again."));
  }
}

export async function signup(payload: RegisterFormValues) {
  try {
    return await api.post("/auth/signup", {
      name: payload.tenant_name,
      email: payload.email,
      password: payload.password,
    });
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Unable to create your account. Please try again."),
    );
  }
}

export async function logout() {
  try {
    await api.post("/auth/logout", {});
  } catch {
    // Clear local session even if the API call fails (e.g. token already expired).
  } finally {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }
}
