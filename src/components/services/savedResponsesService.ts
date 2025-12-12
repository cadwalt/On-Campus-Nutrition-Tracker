import { resolveFirebase } from '../../lib/resolveFirebase';
import type { SavedResponse, SavedFolder } from '../../types/savedResponse';

export const savedResponsesService = {
  // Save a new response
  async saveResponse(
    userId: string,
    folderId: string,
    prompt: string,
    response: string
  ): Promise<SavedResponse> {
    const { db } = await resolveFirebase();
    const { collection, addDoc, doc, updateDoc, increment } = await import('firebase/firestore');

    const savedResponse = {
      userId,
      folderId,
      prompt,
      response,
      savedAt: Date.now(),
      tags: []
    };

    const docRef = await addDoc(
      collection(db, 'users', userId, 'savedResponses'),
      savedResponse
    );

    // Keep folder response count in sync
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    await updateDoc(folderRef, {
      responseCount: increment(1),
      updatedAt: Date.now()
    });

    return {
      id: docRef.id,
      ...savedResponse
    } as SavedResponse;
  },

  // Get all folders for a user
  async getFolders(userId: string): Promise<SavedFolder[]> {
    const { db } = await resolveFirebase();
    const { collection, query, where, getDocs } = await import('firebase/firestore');

    const q = query(
      collection(db, 'users', userId, 'folders'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedFolder[];
  },

  // Create a new folder
  async createFolder(userId: string, folderName: string): Promise<SavedFolder> {
    const { db } = await resolveFirebase();
    const { collection, addDoc } = await import('firebase/firestore');

    const now = Date.now();
    const folderData = {
      userId,
      name: folderName,
      createdAt: now,
      updatedAt: now,
      responseCount: 0
    };

    const docRef = await addDoc(collection(db, 'users', userId, 'folders'), folderData);

    return {
      id: docRef.id,
      ...folderData
    } as SavedFolder;
  },

  // Rename a folder
  async renameFolder(userId: string, folderId: string, newName: string): Promise<void> {
    const { db } = await resolveFirebase();
    const { doc, updateDoc } = await import('firebase/firestore');

    await updateDoc(
      doc(db, 'users', userId, 'folders', folderId),
      {
        name: newName,
        updatedAt: Date.now()
      }
    );
  },

  // Get all saved responses in a folder
  async getResponsesInFolder(userId: string, folderId: string): Promise<SavedResponse[]> {
    const { db } = await resolveFirebase();
    const { collection, query, where, getDocs } = await import('firebase/firestore');

    const q = query(
      collection(db, 'users', userId, 'savedResponses'),
      where('folderId', '==', folderId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavedResponse))
      .sort((a, b) => b.savedAt - a.savedAt);
  },

  // Get all saved responses for a user
  async getAllResponses(userId: string): Promise<SavedResponse[]> {
    const { db } = await resolveFirebase();
    const { collection, query, where, getDocs } = await import('firebase/firestore');

    const q = query(
      collection(db, 'users', userId, 'savedResponses'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavedResponse))
      .sort((a, b) => b.savedAt - a.savedAt);
  },

  // Delete a response
  async deleteResponse(userId: string, responseId: string, folderId: string): Promise<void> {
    const { db } = await resolveFirebase();
    const { doc, deleteDoc, updateDoc, increment } = await import('firebase/firestore');

    await deleteDoc(doc(db, 'users', userId, 'savedResponses', responseId));

    // Decrement folder count but never below zero
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    await updateDoc(folderRef, {
      responseCount: increment(-1),
      updatedAt: Date.now()
    });
  },

  // Delete a folder
  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const { db } = await resolveFirebase();
    const { doc, deleteDoc } = await import('firebase/firestore');

    await deleteDoc(doc(db, 'users', userId, 'folders', folderId));
  },

  // Move response to different folder
  async moveResponseToFolder(
    userId: string,
    responseId: string,
    oldFolderId: string,
    newFolderId: string
  ): Promise<void> {
    const { db } = await resolveFirebase();
    const { doc, updateDoc, increment } = await import('firebase/firestore');

    await updateDoc(
      doc(db, 'users', userId, 'savedResponses', responseId),
      { folderId: newFolderId }
    );

    // keep counts in sync
    const oldFolderRef = doc(db, 'users', userId, 'folders', oldFolderId);
    const newFolderRef = doc(db, 'users', userId, 'folders', newFolderId);

    await updateDoc(oldFolderRef, {
      responseCount: increment(-1),
      updatedAt: Date.now()
    });

    await updateDoc(newFolderRef, {
      responseCount: increment(1),
      updatedAt: Date.now()
    });
  }
};
