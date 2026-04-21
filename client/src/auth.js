import { supabase } from "./supabaseClient";

const allowedEmailSet = new Set(
  (import.meta.env.VITE_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    throw error;
  }
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data?.session || null;
};

export const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token || null;
};

export const fetchJson = async (url, options = {}) => {
  // It relies on getAccessToken from the same file
  const token = await getAccessToken(); 
  
  
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  // If a token is available, attach the Authorization header
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  
  return data;
};

export const validateUserAccess = async (email) => {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  if (allowedEmailSet.has(normalizedEmail)) {
    return true;
  }

  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.email);
};
