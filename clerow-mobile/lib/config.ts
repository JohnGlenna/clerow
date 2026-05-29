import Constants from 'expo-constants';

// Public client config, set in app.json `extra`. The Supabase anon key is a
// publishable key (safe to ship); apiBaseUrl is the deployed clerow-web (Vercel).
type Extra = { supabaseUrl: string; supabaseAnonKey: string; apiBaseUrl: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

function required(key: keyof Extra): string {
  const value = extra[key];
  if (!value || value.includes('REPLACE-WITH')) {
    throw new Error(`Missing app.json → expo.extra.${key}. Set it before running the app.`);
  }
  return value;
}

export const config = {
  supabaseUrl: required('supabaseUrl'),
  supabaseAnonKey: required('supabaseAnonKey'),
  // Lazy: validated only when an API call is actually made, so the app can still
  // launch and authenticate before the Vercel URL is filled in.
  get apiBaseUrl() {
    return required('apiBaseUrl').replace(/\/$/, '');
  },
};
