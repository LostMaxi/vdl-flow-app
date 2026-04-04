// ◎ 2026-04-03 — useGoogleDrive.ts
// Google Identity Services OAuth 2.0 + Drive API v3
// 功能：登入/登出、建立 VDL-FLOW 專用資料夾、存檔/列表/讀取專案

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── 型別 ───────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

export interface DriveProjectEntry {
  fileId: string;
  name: string;
  modifiedTime: string;
}

// ─── 常數 ───────────────────────────────────────────────────────

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const FOLDER_NAME = 'VDL-FLOW Projects';
const MIME_FOLDER = 'application/vnd.google-apps.folder';
const MIME_JSON = 'application/json';

// ─── GIS 全域型別 ────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse & { error?: string }) => void;
          }): { requestAccessToken(): void };
        };
      };
    };
  }
}

// ─── Drive REST helpers ─────────────────────────────────────────

async function driveRequest<T>(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function findFolder(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='${MIME_FOLDER}' and trashed=false`);
  const data = await driveRequest<{ files: DriveFile[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
  );
  return data.files[0]?.id ?? null;
}

async function createFolder(token: string): Promise<string> {
  const data = await driveRequest<{ id: string }>(
    token,
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: MIME_FOLDER }),
    },
  );
  return data.id;
}

async function ensureFolder(token: string): Promise<string> {
  const existing = await findFolder(token);
  if (existing) return existing;
  return createFolder(token);
}

async function listFilesInFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const data = await driveRequest<{ files: DriveFile[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=50&spaces=drive`,
  );
  return data.files;
}

async function uploadFile(
  token: string,
  folderId: string,
  fileName: string,
  content: string,
  existingFileId?: string,
): Promise<string> {
  const metadata = existingFileId
    ? { name: fileName }
    : { name: fileName, parents: [folderId] };

  const boundary = '---vdl_flow_boundary---';
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: ${MIME_JSON}\r\n\r\n` +
    content +
    `\r\n--${boundary}--`;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function downloadFile(token: string, fileId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.text();
}

async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`UserInfo failed: ${res.status}`);
  return res.json() as Promise<GoogleUser>;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useGoogleDrive() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveProjectEntry[]>([]);
  const folderIdRef = useRef<string | null>(null);
  const clientRef = useRef<{ requestAccessToken(): void } | null>(null);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ?? '';

  // 初始化 GIS Token Client
  useEffect(() => {
    if (!clientId || clientRef.current) return;
    const check = () => {
      if (!window.google?.accounts?.oauth2) {
        setTimeout(check, 200);
        return;
      }
      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp) => {
          if (resp.error) {
            setError(resp.error);
            setLoading(false);
            return;
          }
          setToken(resp.access_token);
          try {
            const info = await fetchUserInfo(resp.access_token);
            setUser(info);
            setError(null);
          } catch (e) {
            setError(String(e));
          }
          setLoading(false);
        },
      });
    };
    check();
  }, [clientId]);

  // ─── 登入 ─────────────────────────────────────────────────────
  const signIn = useCallback(() => {
    if (!clientRef.current) {
      setError('Google Identity Services not loaded — check VITE_GOOGLE_CLIENT_ID');
      return;
    }
    setLoading(true);
    clientRef.current.requestAccessToken();
  }, []);

  // ─── 登出 ─────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    if (token) {
      // 撤銷 token
      fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    setDriveFiles([]);
    folderIdRef.current = null;
  }, [token]);

  // ─── 列出 Drive 上的專案檔案 ──────────────────────────────────
  const listProjects = useCallback(async (): Promise<DriveProjectEntry[]> => {
    if (!token) return [];
    setLoading(true);
    setError(null);
    try {
      const folderId = await ensureFolder(token);
      folderIdRef.current = folderId;
      const files = await listFilesInFolder(token, folderId);
      const entries: DriveProjectEntry[] = files.map(f => ({
        fileId: f.id,
        name: f.name.replace(/\.json$/, ''),
        modifiedTime: f.modifiedTime,
      }));
      setDriveFiles(entries);
      return entries;
    } catch (e) {
      setError(String(e));
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ─── 存檔到 Drive ─────────────────────────────────────────────
  const saveToDrive = useCallback(async (
    projectName: string,
    data: string,
    existingFileId?: string,
  ): Promise<string | null> => {
    if (!token) return null;
    setLoading(true);
    setError(null);
    try {
      const folderId = folderIdRef.current ?? await ensureFolder(token);
      folderIdRef.current = folderId;
      const fileName = `${projectName}.json`;
      const fileId = await uploadFile(token, folderId, fileName, data, existingFileId);
      // 重新整理列表
      await listProjects();
      return fileId;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, listProjects]);

  // ─── 從 Drive 讀取 ────────────────────────────────────────────
  const loadFromDrive = useCallback(async (fileId: string): Promise<string | null> => {
    if (!token) return null;
    setLoading(true);
    setError(null);
    try {
      const content = await downloadFile(token, fileId);
      return content;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const isReady = !!clientId && !!window.google?.accounts;
  const isSignedIn = !!token && !!user;

  return {
    // 狀態
    user,
    isReady,
    isSignedIn,
    loading,
    error,
    driveFiles,
    // 動作
    signIn,
    signOut,
    listProjects,
    saveToDrive,
    loadFromDrive,
  };
}
