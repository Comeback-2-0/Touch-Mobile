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
  communityJoinHeaderLabel,
  communityCommentCount,
  formatCommunityCount,
} from '../app/screens/community/communityUx';
import {
  TOUCH_SITE_URL,
  COMMUNITY_SHARE_EXCERPT_LIMIT,
  buildCommunityPostShareLink,
  buildCommunityPostShareMessage,
  buildWhatsAppShareUrl,
} from '../app/navigation/communityLinking';

describe('community post sharing', () => {
  it('uses the current Touch site domain for public share links', () => {
    expect(TOUCH_SITE_URL).toBe('https://app.touch.dophera.tech');
  });
  it('builds a public exact-post message with a character-limited excerpt and alias', () => {
    expect(
      buildCommunityPostShareMessage({
        communityName: 'Kind Lantern',
        alias: 'Kind Lantern',
        text: 'First line of the post\nSecond line continues\nThird line stays private to the preview.',
        communityId: 'community 1',
        contentId: 'post/2',
        visibility: 'public',
      }),
    ).toBe(
      'First line of the post Second line continues Third line stays private to the preview.\n\nRead the complete post by Kind Lantern on Touch\nhttps://app.touch.dophera.tech/c/community%201/p/post%2F2',
    );
  });

  it('does not disclose private post text or media in the shared message', () => {
    expect(
      buildCommunityPostShareMessage({
        communityName: 'Secret Circle',
        alias: 'Kind Lantern',
        text: 'Do not leak this text',
        communityId: 'c1',
        contentId: 'p1',
        visibility: 'members',
      }),
    ).toBe('See this latest post by Kind Lantern on Touch\nhttps://app.touch.dophera.tech/c/c1/p/p1');
  });

  it('limits public share excerpts by characters', () => {
    const message = buildCommunityPostShareMessage({
      communityName: 'Movies',
      alias: 'Curious Kite',
      text: 'A'.repeat(COMMUNITY_SHARE_EXCERPT_LIMIT + 40),
      communityId: 'c1',
      contentId: 'p1',
      visibility: 'public',
    });
    const excerpt = message.split('\n\n')[0];
    expect(excerpt).toHaveLength(COMMUNITY_SHARE_EXCERPT_LIMIT);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('targets WhatsApp with the encoded exact-post message', () => {
    const message = 'Read the complete post by Kind Lantern on Touch\nhttps://app.touch.dophera.tech/c/c1/p/p1';
    expect(buildWhatsAppShareUrl(message)).toBe(`whatsapp://send?text=${encodeURIComponent(message)}`);
  });
});

describe('community comment helpers', () => {
  it('uses the backend total comment count without requiring comments to be loaded', () => {
    expect(communityCommentCount({commentsCount: 12, comments: []})).toBe(12);
    expect(communityCommentCount({comments: [{}, {}]})).toBe(2);
  });

  it('formats large engagement counts compactly', () => {
    expect(formatCommunityCount(0)).toBe('0');
    expect(formatCommunityCount(999)).toBe('999');
    expect(formatCommunityCount(1000)).toBe('1k');
    expect(formatCommunityCount(1250)).toBe('1.3k');
    expect(formatCommunityCount(299563)).toBe('299.6k');
    expect(formatCommunityCount(1000000)).toBe('1M');
  });

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

  it('shows pending approval state in the public approval header', () => {
    expect(communityJoinHeaderLabel({joinMode: 'approval'}, 'pending')).toBe('Request sent');
    expect(communityJoinHeaderLabel({joinMode: 'approval'}, 'declined')).toBe('Request again');
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
