import { USER_ROLES } from "../constants/appEnums";
import { mapAppUserToDatabaseProfile, mapDatabaseProfileToAppUser } from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";

function buildProfileFromAuthUser(authUser, profile = null) {
  if (!authUser) {
    return null;
  }

  const fallbackProfile = {
    id: authUser.id,
    full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "Storet User",
    email: authUser.email || "",
    role: authUser.user_metadata?.role || USER_ROLES.RENTER,
  };

  return mapDatabaseProfileToAppUser(profile || fallbackProfile, {
    email: authUser.email,
    isAuthenticated: true,
  });
}

export const authService = {
  async getSession() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { data, error: sessionError } = await supabase.auth.getSession();
    return formatServiceResponse(data?.session || null, sessionError);
  },

  async getCurrentUserProfile() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse(null, userError);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return formatServiceResponse(null, profileError);
    }

    return formatServiceResponse(buildProfileFromAuthUser(user, profile));
  },

  async signUp({ fullName, email, password, role = USER_ROLES.RENTER }) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (signUpError || !data?.user) {
      return formatServiceResponse(null, signUpError);
    }

    const profilePayload = mapAppUserToDatabaseProfile({
      id: data.user.id,
      fullName,
      email,
      role,
    });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select("*")
      .single();

    if (profileError) {
      return formatServiceResponse(null, profileError);
    }

    return formatServiceResponse({
      session: data.session,
      user: buildProfileFromAuthUser(data.user, profile),
    });
  },

  async signIn({ email, password }) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data?.user) {
      return formatServiceResponse(null, signInError);
    }

    const profileResponse = await authService.getCurrentUserProfile();

    if (profileResponse.error) {
      return profileResponse;
    }

    return formatServiceResponse({
      session: data.session,
      user: profileResponse.data,
    });
  },

  async signOut() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { error: signOutError } = await supabase.auth.signOut();
    return formatServiceResponse(true, signOutError);
  },

  onAuthStateChange(callback) {
    const { supabase } = requireSupabase();

    if (!supabase) {
      return {
        unsubscribe: () => {},
      };
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback?.(event, session);
    });

    return data?.subscription || { unsubscribe: () => {} };
  },
};
