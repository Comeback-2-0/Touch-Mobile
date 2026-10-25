import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};
type HiddenState = {
  hidden: Record<string, true>;
  loaded: boolean;
  load: () => Promise<void>;
  hide: (userId: string, communityId: string, postId: string) => Promise<void>;
  isHidden: (userId: string, communityId: string, postId: string) => boolean;
};
const key = (user: string, community: string, post: string) =>
  JSON.stringify([user, community, post]);
export function createHiddenPostsStore(storage: Storage = AsyncStorage) {
  let loading: Promise<void> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  return create<HiddenState>((set, get) => ({
    hidden: {},
    loaded: false,
    load: () => {
      if (!loading)
        loading = storage
          .getItem('touch.hiddenCommunityPosts.v1')
          .then(raw => {
            const parsed = raw ? JSON.parse(raw) : {};
            const hidden: Record<string, true> = {};
            if (
              parsed &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed)
            ) {
              Object.entries(parsed).forEach(([id, value]) => {
                if (value === true) hidden[id] = true;
              });
            }
            set({hidden, loaded: true});
          })
          .catch(error => {
            loading = undefined;
            throw error;
          });
      return loading;
    },
    hide: async (user, community, post) => {
      if (!user || !community || !post)
        throw Error('Post could not be identified');
      await get().load();
      const work = writes
        .catch(() => undefined)
        .then(async () => {
          const hidden = {
            ...get().hidden,
            [key(user, community, post)]: true as const,
          };
          await storage.setItem(
            'touch.hiddenCommunityPosts.v1',
            JSON.stringify(hidden),
          );
          set({hidden});
        });
      writes = work;
      await work;
    },
    isHidden: (user, community, post) =>
      Boolean(get().hidden[key(user, community, post)]),
  }));
}
export const useHiddenPostsStore = createHiddenPostsStore();
