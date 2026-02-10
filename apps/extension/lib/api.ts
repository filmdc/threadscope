export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(
      { type: 'API_REQUEST', endpoint, options },
      (response) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response as T);
      }
    );
  });
}

export const api = {
  getMe: () => apiRequest('/me'),
  getPost: (mediaId: string) => apiRequest(`/post/${mediaId}`),
  batchPosts: (mediaIds: string[]) =>
    apiRequest('/post/batch', {
      method: 'POST',
      body: JSON.stringify({ mediaIds }),
    }),
  getCreator: (username: string) => apiRequest(`/creator/${username}`),
  getKeywordTrend: (keyword: string) => apiRequest(`/keyword/${keyword}/trend`),
  getNotifications: () => apiRequest('/notifications'),
  getScheduled: () => apiRequest('/scheduled'),
  trackCreator: (creatorId: string) =>
    apiRequest('/track/creator', {
      method: 'POST',
      body: JSON.stringify({ creatorId }),
    }),
  trackPost: (publicPostId: string) =>
    apiRequest('/track/post', {
      method: 'POST',
      body: JSON.stringify({ publicPostId }),
    }),
};
