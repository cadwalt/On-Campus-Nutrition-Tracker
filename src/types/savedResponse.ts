export interface SavedResponse {
  id: string;
  userId: string;
  folderId: string;
  prompt: string;
  response: string;
  savedAt: number; // timestamp
  tags?: string[];
}

export interface SavedFolder {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  responseCount: number;
}
