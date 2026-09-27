// app/utils/api.ts
import axios from 'axios';
import { Comment } from '../navigation/types/Post';
import {
  clearAuthTokens,
  getAuthTokens,
  saveAuthTokens,
} from './authTokenStorage';

const DEBUG_API_URL = 'https://ij-backend.dophera.tech';
const RELEASE_API_URL = 'https://kali-backend.dophera.tech';
// const RELEASE_API_URL = 'https://touch-load-balancer.ij-roy.workers.dev';

export const API_URL = __DEV__ ? DEBUG_API_URL : RELEASE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

let authFailureHandler: (() => void) | null = null;

export const setAuthFailureHandler = (handler: (() => void) | null) => {
  authFailureHandler = handler;
};

api.interceptors.request.use(async config => {
  const tokens = await getAuthTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const tokens = await getAuthTokens();
      if (!tokens?.refreshToken) throw new Error('Missing refresh token');

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: tokens.refreshToken,
      });

      await saveAuthTokens(response.data);
      originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      await clearAuthTokens();
      authFailureHandler?.();
      return Promise.reject(refreshError);
    }
  },
);

export const likePost = (postId: string) =>
  api.post(`/posts/${postId}/like`);

export const dislikePost = (postId: string) =>
  api.post(`/posts/${postId}/dislike`);

export const commentOnPost = (postId: string, text: string) =>
  api.post(`/posts/${postId}/comment`, { text });

// ------------------- REPLIES API -------------------
export const fetchReplies = (commentId: string) =>
  api.get<Comment[]>(`/comments/${commentId}/replies`);

// ----------- COMMENT ACTION APIs -----------

//  These toggle the like/dislike state
export const likeComment = (commentId: string) =>
  api.post(`/comments/${commentId}/like`);

export const dislikeComment = (commentId: string) =>
  api.post(`/comments/${commentId}/dislike`);

export const reportComment = (commentId: string) =>
  api.post(`/comments/${commentId}/report`);

export const replyToComment = (commentId: string, text: string) =>
  api.post(`/comments/${commentId}/replies`, { text });

export const uploadPost = async (formData: FormData) =>
  api.post('/posts/create', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const uploadReel = (formData: FormData) =>
  api.post('/api/reels/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

type BugReportPayload = {
  whatHappened: string;
  stepsToReproduce: string;
  screenshot?: {
    uri: string;
    fileName?: string;
    type?: string;
  } | null;
};

type FeatureRequestPayload = {
  title: string;
  description: string;
};

type FeedbackSubmitResponse = {
  id: string;
};

export const submitBugReport = async (payload: BugReportPayload): Promise<FeedbackSubmitResponse> => {
  if (!payload.screenshot) {
    const response = await api.post<FeedbackSubmitResponse>('/feedback/bug-reports', {
      whatHappened: payload.whatHappened,
      stepsToReproduce: payload.stepsToReproduce,
    });
    return response.data;
  }

  const formData = new FormData();
  formData.append('whatHappened', payload.whatHappened);
  formData.append('stepsToReproduce', payload.stepsToReproduce);
  formData.append('screenshot', {
    uri: payload.screenshot.uri,
    name: payload.screenshot.fileName || 'bug-screenshot.jpg',
    type: payload.screenshot.type || 'image/jpeg',
  } as any);

  const response = await api.post<FeedbackSubmitResponse>('/feedback/bug-reports', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const submitFeatureRequest = async (
  payload: FeatureRequestPayload,
): Promise<FeedbackSubmitResponse> => {
  const response = await api.post<FeedbackSubmitResponse>('/feedback/feature-requests', payload);
  return response.data;
};

export const fetchReelMoods = () =>
  api.get('/api/reels/moods');

export const fetchReelsFeed = (mood: string, page: number) =>
  api.get(`/api/reels/feed?mood=${mood}&page=${page}`);

// ------------------- REELS APIs -------------------

export const fetchReelComments = (reelId: string) =>
  api.get(`/api/reels/${reelId}/comments`);

export const addReelComment = (reelId: string, text: string) =>
  api.post(`/api/reels/${reelId}/comments`, { reelId, text });

export const likeReel = (reelId: string) =>
  api.post('/api/reels/like', { reelId });

export const saveReel = (reelId: string) =>
  api.post('/api/reels/save', { reelId });

export const reportReel = (reelId: string) =>
  api.post('/api/reels/report', { reelId });

export const sendWatchTime = (reelId: string, mood: string, duration: number) =>
  api.post('/api/reels/watch', { reelId, mood, duration });
