import {
  aliasConflictOnPost,
  browseStatusLine,
  countThreadComments,
  membersCopy,
  sortCommentsForThread,
  communityVisitorActions,
  COMMUNITY_CREATION_JOIN_MODES,
  suggestCommunityAlias,
  progressiveCommentItems,
  communityJoinActionLabel,
} from '../app/screens/community/communityUx';

describe('community comment helpers', () => {
  it('counts nested replies', () => {
    expect(countThreadComments([{replies: [{}, {}]}, {replies: []}])).toBe(4);
  });

  it('flags names already used on the post', () => {
    const post = {
      alias: 'anon-post',
      comments: [{alias: 'Sky', mine: false, replies: []}],
    };
    expect(aliasConflictOnPost('sky', post)).toMatch(/already used/i);
    expect(aliasConflictOnPost('River', post)).toBe('');
  });

  it('keeps chronological order so likes do not reshuffle', () => {
    const sorted = sortCommentsForThread([
      {id: 'new', likes: 9, createdAt: '2026-09-02', replies: []},
      {id: 'old', likes: 0, createdAt: '2026-09-01', replies: []},
    ]);
    expect(sorted.map(item => item.id)).toEqual(['old', 'new']);
  });
});

describe('community browse copy', () => {
  it('offers only open and approval join modes when creating a community', () => {
    expect(COMMUNITY_CREATION_JOIN_MODES).toEqual(['open', 'approval']);
    expect(COMMUNITY_CREATION_JOIN_MODES).not.toContain('invite-only');
  });

  it('suggests readable post aliases instead of hex identifiers', () => {
    expect(suggestCommunityAlias()).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it('progressively discloses comments instead of rendering the whole thread', () => {
    const comments = ['one', 'two', 'three', 'four'];
    expect(progressiveCommentItems(comments, false)).toEqual(['one', 'two', 'three']);
    expect(progressiveCommentItems(comments, true)).toEqual(comments);
  });
  it('keeps public feeds readable while gating visitor interactions', () => {
    expect(communityVisitorActions({contentVisibility: 'public', joinMode: 'open'}, null)).toEqual({
      canRead: true,
      canJoin: true,
      canInteract: false,
      showJoinButton: true,
      showMemberActions: false,
      queueVisible: false,
    });
  });

  it('labels approval-only visitors with a request action', () => {
    expect(communityJoinActionLabel({joinMode: 'approval'})).toBe('Request to join');
  });

  it('enables all actions after joining an open public community', () => {
    expect(communityVisitorActions({contentVisibility: 'public', joinMode: 'open'}, {status: 'active'})).toEqual({
      canRead: true,
      canJoin: false,
      canInteract: true,
      showJoinButton: false,
      showMemberActions: true,
      queueVisible: true,
    });
  });

  it('compacts large member counts', () => {
    expect(membersCopy(1)).toBe('1 member');
    expect(membersCopy(42)).toBe('42 members');
    expect(membersCopy(999)).toBe('999 members');
    expect(membersCopy(1000)).toBe('1k+ members');
    expect(membersCopy(1500)).toBe('1.5k+ members');
    expect(membersCopy(12000)).toBe('12k+ members');
  });

  it('shows only member count on browse cards', () => {
    expect(
      browseStatusLine({
        membersCount: 42,
        joinMode: 'approval',
        contentVisibility: 'members',
      }),
    ).toBe('42 members');
  });
});
