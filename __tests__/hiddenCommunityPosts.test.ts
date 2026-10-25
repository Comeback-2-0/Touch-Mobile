import {createHiddenPostsStore} from '../app/screens/community/hiddenPostsStore';
test('post hiding persists and stays scoped to account, community and post', async () => {
  let disk: string | null = null;
  const storage = {
    getItem: async () => disk,
    setItem: async (_key: string, value: string) => {
      disk = value;
    },
  };
  const first = createHiddenPostsStore(storage);
  await first.getState().load();
  await first.getState().hide('user-a', 'community-a', 'post-a');
  const restored = createHiddenPostsStore(storage);
  await restored.getState().load();
  expect(restored.getState().isHidden('user-a', 'community-a', 'post-a')).toBe(
    true,
  );
  expect(restored.getState().isHidden('user-b', 'community-a', 'post-a')).toBe(
    false,
  );
  expect(restored.getState().isHidden('user-a', 'community-b', 'post-a')).toBe(
    false,
  );
  expect(restored.getState().isHidden('user-a', 'community-a', 'post-b')).toBe(
    false,
  );
});
test('storage failure does not claim a successful persistent hide', async () => {
  const store = createHiddenPostsStore({
    getItem: async () => null,
    setItem: async () => {
      throw Error('disk full');
    },
  });
  await store.getState().load();
  await expect(store.getState().hide('u', 'c', 'p')).rejects.toThrow(
    'disk full',
  );
  expect(store.getState().isHidden('u', 'c', 'p')).toBe(false);
});
