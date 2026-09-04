import { fetchWithRetry } from './utils.mjs';

const endpoint = 'https://api.buffer.com';
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function isCompleteOrInFlight(post) {
  return post?.status === 'sent' || ['scheduled', 'sending'].includes(post?.status);
}

export class BufferClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async graphql(query, variables = {}) {
    const response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    }, 3);
    const body = await response.json();
    if (!response.ok) throw new Error(`Buffer HTTP ${response.status}`);
    if (body.errors?.length) throw new Error(`Buffer API: ${body.errors.map((error) => error.message).join('; ')}`);
    return body.data;
  }

  async discover({ pinterestBoardName, channelOverrides = {} }) {
    const accountData = await this.graphql(`query Account { account { organizations { id name } } }`);
    const organizations = accountData.account?.organizations || [];
    if (organizations.length !== 1) throw new Error(`Expected one Buffer organization, found ${organizations.length}`);
    const organizationId = organizations[0].id;
    const channelData = await this.graphql(`
      query Channels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id name displayName service isDisconnected isLocked isQueuePaused
          metadata {
            ... on PinterestMetadata { boards { name serviceId url } }
          }
        }
      }
    `, { organizationId });
    const usable = channelData.channels.filter((channel) => !channel.isDisconnected && !channel.isLocked);
    const pick = (service) => {
      const override = channelOverrides[service];
      if (override) {
        const exact = usable.find((channel) => channel.id === override);
        if (!exact) throw new Error(`Configured ${service} channel is unavailable: ${override}`);
        return exact;
      }
      const matches = usable.filter((channel) => String(channel.service).toLowerCase() === service);
      if (matches.length !== 1) throw new Error(`Expected one usable ${service} channel in Buffer, found ${matches.length}`);
      return matches[0];
    };

    const channels = {
      instagram: pick('instagram'),
      pinterest: pick('pinterest'),
      tiktok: pick('tiktok')
    };
    const boards = channels.pinterest.metadata?.boards || [];
    const wanted = pinterestBoardName.trim().toLocaleLowerCase('en');
    const board = boards.find((candidate) => candidate.name.trim().toLocaleLowerCase('en') === wanted)
      || (boards.length === 1 ? boards[0] : null);
    if (!board) throw new Error(`Pinterest board “${pinterestBoardName}” was not found in Buffer`);
    return { organizationId, channels, board };
  }

  async getPost(postId) {
    const data = await this.graphql(`
      query Post($input: PostInput!) {
        post(input: $input) {
          id text status createdAt updatedAt dueAt sentAt externalLink
        }
      }
    `, { input: { id: postId } });
    return data.post || null;
  }

  async waitForPost(postId, { attempts = 8, delayMs = 5000 } = {}) {
    let post = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      post = await this.getPost(postId);
      if (!post || post.status === 'sent' || post.status === 'error') return post;
      if (attempt < attempts - 1) await sleep(delayMs);
    }
    return post;
  }

  async matchingRecentPost({ organizationId, channelId, text }) {
    const data = await this.graphql(`
      query RecentPosts($organizationId: OrganizationId!, $channelIds: [ChannelId!]) {
        posts(first: 20, input: {
          organizationId: $organizationId,
          filter: { channelIds: $channelIds },
          sort: [{ field: createdAt, direction: desc }]
        }) {
          edges { node { id text createdAt updatedAt dueAt sentAt externalLink status } }
        }
      }
    `, { organizationId, channelIds: [channelId] });
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const matches = data.posts?.edges?.map((edge) => edge.node)
      .filter((post) => post.text === text && new Date(post.createdAt).getTime() >= cutoff) || [];
    return matches.find((post) => post.status !== 'error') || matches[0] || null;
  }

  async createPost(input) {
    const data = await this.graphql(`
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          ... on PostActionSuccess {
            post { id text dueAt status createdAt updatedAt sentAt externalLink channelId }
          }
          ... on MutationError { message }
        }
      }
    `, { input });
    if (data.createPost?.message) throw new Error(`Buffer rejected post: ${data.createPost.message}`);
    if (!data.createPost?.post?.id) throw new Error('Buffer returned no post ID');
    return data.createPost.post;
  }
}

export function instagramInput({ channelId, text, imageUrl, videoUrl, altText, asReel = false }) {
  const assets = asReel
    ? [{ video: { url: videoUrl, metadata: { thumbnailOffset: 1000 } } }]
    : [{ image: { url: imageUrl, metadata: { altText } } }];
  return {
    text,
    channelId,
    schedulingType: 'automatic',
    mode: 'shareNow',
    needsApproval: false,
    aiAssisted: true,
    assets,
    metadata: {
      instagram: {
        type: asReel ? 'reel' : 'post',
        shouldShareToFeed: true,
        isAiGenerated: true
      }
    }
  };
}

export function pinterestInput({ channelId, text, imageUrl, boardServiceId, title, destinationUrl }) {
  return {
    text,
    channelId,
    schedulingType: 'automatic',
    mode: 'shareNow',
    needsApproval: false,
    aiAssisted: true,
    assets: [{ image: { url: imageUrl, metadata: { altText: title } } }],
    metadata: { pinterest: { boardServiceId, title, url: destinationUrl } }
  };
}

export function tiktokInput({ channelId, text, videoUrl }) {
  return {
    text,
    channelId,
    schedulingType: 'automatic',
    mode: 'shareNow',
    needsApproval: false,
    aiAssisted: true,
    assets: [{ video: { url: videoUrl, metadata: { thumbnailOffset: 1000 } } }],
    metadata: { tiktok: { isAiGenerated: true } }
  };
}
