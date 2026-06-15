import { USER_ROLES } from "../constants/appEnums";
import { mapAppUserToDatabaseProfile, mapDatabaseProfileToAppUser } from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";

function getAuthRedirectUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth`;
}

function normalizeAuthError(error) {
  if (!error) {
    return null;
  }

  return {
    ...error,
    message: error.message || "Something went wrong while authenticating.",
  };
}

function buildProfileFromAuthUser(authUser, profile = null) {
  if (!authUser) {
    return null;
  }

  const fallbackProfile = {
    id: authUser.id,
    full_name:
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "Storet User",
    email: authUser.email || "",
    role: authUser.user_metadata?.role || USER_ROLES.RENTER,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at,
  };

  return mapDatabaseProfileToAppUser(profile || fallbackProfile, {
    email: authUser.email,
    isAuthenticated: true,
  });
}

async function fetchProfileForAuthUser(supabase, authUser) {
  if (!authUser?.id) {
    return {
      profile: null,
      error: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  return {
    profile,
    error: profileError,
  };
}

async function ensureProfileForAuthUser(supabase, authUser, profileInput = {}) {
  if (!authUser?.id) {
    return {
      profile: null,
      error: null,
    };
  }

  const { profile, error } = await fetchProfileForAuthUser(supabase, authUser);

  if (error) {
    return {
      profile: null,
      error,
    };
  }

  if (profile) {
    return {
      profile,
      error: null,
    };
  }

  const profilePayload = mapAppUserToDatabaseProfile({
    id: authUser.id,
    fullName:
      profileInput.fullName ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "Storet User",
    email: profileInput.email || authUser.email || "",
    role: profileInput.role || authUser.user_metadata?.role || USER_ROLES.RENTER,
  });

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select("*")
    .single();

  return {
    profile: insertedProfile,
    error: insertError,
  };
}

export const authService = {
  async getSession() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { data, error: sessionError } = await supabase.auth.getSession();
    return formatServiceResponse(data?.session || null, normalizeAuthError(sessionError));
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
      return formatServiceResponse(null, normalizeAuthError(userError));
    }

    const { profile, error: profileError } = await ensureProfileForAuthUser(
      supabase,
      user
    );

    if (profileError) {
      return formatServiceResponse(null, normalizeAuthError(profileError));
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
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (signUpError || !data?.user) {
      return formatServiceResponse(null, normalizeAuthError(signUpError));
    }

    if (!data.session) {
      return formatServiceResponse({
        session: null,
        user: buildProfileFromAuthUser(data.user, {
          id: data.user.id,
          full_name: fullName,
          email,
          role,
        }),
        needsEmailConfirmation: true,
      });
    }

    const { profile, error: profileError } = await ensureProfileForAuthUser(
      supabase,
      data.user,
      {
        fullName,
        email,
        role,
      }
    );

    if (profileError) {
      return formatServiceResponse(null, normalizeAuthError(profileError));
    }

    return formatServiceResponse({
      session: data.session,
      user: buildProfileFromAuthUser(data.user, profile),
      needsEmailConfirmation: false,
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
      return formatServiceResponse(null, normalizeAuthError(signInError));
    }

    const { profile, error: profileError } = await ensureProfileForAuthUser(
      supabase,
      data.user
    );

    if (profileError) {
      return formatServiceResponse(null, normalizeAuthError(profileError));
    }

    return formatServiceResponse({
      session: data.session,
      user: buildProfileFromAuthUser(data.user, profile),
      needsEmailConfirmation: false,
    });
  },

  async signOut() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { error: signOutError } = await supabase.auth.signOut();
    return formatServiceResponse(true, normalizeAuthError(signOutError));
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
