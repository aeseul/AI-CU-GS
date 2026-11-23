import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import type { BrandId, SavedFavorite, UserProfile, VerifiedRecommendation } from '../types.ts';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function clampString(val: string, maxLen: number, fallback: string): string {
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function isValidBrand(brand: string): brand is BrandId {
  return brand === 'GS25' || brand === 'CU' || brand === 'SEVEN_ELEVEN' || brand === 'EMART24';
}

export async function ensureUserProfile(user: User, preferredNickname?: string): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let userExists = false;
  try {
    const snap = await getDoc(userRef);
    userExists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!userExists) {
    const safeNickname = clampString(
      preferredNickname || user.displayName || user.email?.split('@')[0] || '편의점미식가',
      40,
      '편의점미식가',
    );
    try {
      await setDoc(userRef, {
        uid: user.uid,
        nickname: safeNickname,
        preferredBrand: 'GS25',
        defaultBudget: 5000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  }

  if (user.email) {
    const privatePath = `users/${user.uid}/private/info`;
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const safeEmail = clampString(user.email, 160, 'unknown@example.com');
    try {
      const privateSnap = await getDoc(privateRef);
      if (!privateSnap.exists() || privateSnap.data()?.email !== safeEmail) {
        await setDoc(
          privateRef,
          {
            uid: user.uid,
            email: safeEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: false },
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }
}

export function subscribeUserProfile(
  user: User,
  onChange: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data();
      onChange({
        uid: String(data.uid || user.uid),
        nickname: String(data.nickname || user.displayName || '편의점미식가'),
        preferredBrand: isValidBrand(String(data.preferredBrand))
          ? (data.preferredBrand as BrandId)
          : 'GS25',
        defaultBudget:
          typeof data.defaultBudget === 'number' && data.defaultBudget >= 1
            ? Math.round(data.defaultBudget)
            : 5000,
        email: user.email || undefined,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    },
  );
}

export async function updateUserProfileInFirestore(
  user: User,
  updates: {
    nickname: string;
    preferredBrand: BrandId;
    defaultBudget: number;
  },
): Promise<void> {
  await ensureUserProfile(user, updates.nickname);

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeNickname = clampString(updates.nickname, 40, '편의점미식가');
  const safeBrand: BrandId = isValidBrand(updates.preferredBrand) ? updates.preferredBrand : 'GS25';
  const safeBudget = Math.min(1000000, Math.max(1000, Math.round(updates.defaultBudget || 5000)));

  try {
    await updateDoc(userRef, {
      nickname: safeNickname,
      preferredBrand: safeBrand,
      defaultBudget: safeBudget,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeFavorites(
  user: User,
  onChange: (favorites: SavedFavorite[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = `users/${user.uid}/favorites`;
  const q = query(
    collection(db, 'users', user.uid, 'favorites'),
    where('userId', '==', user.uid),
    limit(30),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const next: SavedFavorite[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data?.recommendationPayload) {
          const createdIso =
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString();
          next.push({
            id: String(data.id || docSnap.id),
            savedAt: createdIso,
            storeName: String(data.storeName || 'GS25 매장'),
            brand: (data.brand || 'GS25') as BrandId,
            recommendation: data.recommendationPayload as VerifiedRecommendation,
          });
        }
      }
      next.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      onChange(next);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    },
  );
}

export async function saveFavoriteToFirestore(
  user: User,
  favorite: SavedFavorite,
): Promise<void> {
  await ensureUserProfile(user);

  const safeId = sanitizeId(favorite.id);
  const path = `users/${user.uid}/favorites/${safeId}`;
  const ref = doc(db, 'users', user.uid, 'favorites', safeId);

  try {
    const existingFav = await getDoc(ref);
    if (existingFav.exists()) {
      return;
    }
    await setDoc(ref, {
      id: safeId,
      userId: user.uid,
      brand: favorite.brand,
      storeName: clampString(favorite.storeName, 120, 'GS25 매장'),
      comboTitle: clampString(favorite.recommendation.title, 120, '편의점 꿀조합'),
      totalPrice: Math.max(0, Math.round(favorite.recommendation.totalPrice)),
      budget: Math.max(1, Math.round(favorite.recommendation.budget)),
      recommendationPayload: JSON.parse(JSON.stringify(favorite.recommendation)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteFavoriteFromFirestore(
  user: User,
  favoriteId: string,
): Promise<void> {
  const safeId = sanitizeId(favoriteId);
  const path = `users/${user.uid}/favorites/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'favorites', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeRecommendationHistory(
  user: User,
  onChange: (items: VerifiedRecommendation[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = `users/${user.uid}/recommendations`;
  const q = query(
    collection(db, 'users', user.uid, 'recommendations'),
    where('userId', '==', user.uid),
    limit(20),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows: Array<{ createdAtMs: number; item: VerifiedRecommendation }> = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data?.recommendationPayload) {
          const createdAtMs =
            typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : 0;
          rows.push({
            createdAtMs,
            item: data.recommendationPayload as VerifiedRecommendation,
          });
        }
      }
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onChange(rows.slice(0, 12).map((r) => r.item));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    },
  );
}

export async function saveRecommendationHistoryToFirestore(
  user: User,
  brand: BrandId,
  storeName: string,
  combo: VerifiedRecommendation,
): Promise<void> {
  await ensureUserProfile(user);

  const safeId = sanitizeId(combo.id);
  const path = `users/${user.uid}/recommendations/${safeId}`;
  const ref = doc(db, 'users', user.uid, 'recommendations', safeId);

  try {
    const existingRec = await getDoc(ref);
    if (existingRec.exists()) {
      return;
    }
    await setDoc(ref, {
      id: safeId,
      userId: user.uid,
      brand,
      storeName: clampString(storeName, 120, 'GS25 매장'),
      comboTitle: clampString(combo.title, 120, '편의점 꿀조합'),
      totalPrice: Math.max(0, Math.round(combo.totalPrice)),
      budget: Math.max(1, Math.round(combo.budget)),
      recommendationPayload: JSON.parse(JSON.stringify(combo)),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
