import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfileByFirebaseUid, UserProfile } from '../api/userApi';
import { getMissingSupabaseTableName, isMissingSupabaseTableError } from '../utils/supabaseErrors';

const PROFILE_FETCH_RETRY_DELAY_MS = 500;
const PROFILE_FETCH_MAX_ATTEMPTS = 4;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    logout: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUserProfile = async (firebaseUid: string) => {
        for (let attempt = 1; attempt <= PROFILE_FETCH_MAX_ATTEMPTS; attempt += 1) {
            const profile = await getUserProfileByFirebaseUid(firebaseUid);
            if (profile) {
                return profile;
            }

            if (attempt < PROFILE_FETCH_MAX_ATTEMPTS) {
                // Sign-up can authenticate before the profile row finishes writing.
                await wait(PROFILE_FETCH_RETRY_DELAY_MS);
            }
        }

        return null;
    };

    const fetchProfile = async (firebaseUser: User) => {
        try {
            const profile = await loadUserProfile(firebaseUser.uid);

            // 프로필이 없으면 미등록 계정으로 간주하고 로그아웃 처리
            if (!profile) {
                await signOut(auth);
                setUser(null);
                setUserProfile(null);
                return;
            }
            
            // 일반 사용자만 승인 여부를 강제하고, 관리자는 세션을 유지한다.
            if (!profile.is_admin && !profile.is_approved) {
                await signOut(auth);
                setUser(null);
                setUserProfile(null);
                // alert('관리자 승인이 필요한 계정입니다.'); // 자동 로그인 시 계속 뜰 수 있어 생략하거나 필요 시 추가
                return;
            }

            setUserProfile(profile);
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            if (isMissingSupabaseTableError(error)) {
                const tableName = getMissingSupabaseTableName(error) || 'public.user_profiles';
                console.error(`[AuthContext] Supabase table missing: ${tableName}`);
            }
            await signOut(auth).catch(() => undefined);
            setUser(null);
            setUserProfile(null);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchProfile(currentUser);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
        setUserProfile(null);
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user);
        }
    };

    const isAdmin = userProfile?.is_admin === true;

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, logout, refreshProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
