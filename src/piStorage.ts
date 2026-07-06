import { StoredPI } from "./types";

const DB_NAME = "aqueouss-pi-store";
const DB_VERSION = 1;
const STORE_NAME = "saved_pis";
const MAX_STORED = 5;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "piNumber" });
      }
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        fn(store).then(resolve).catch(reject);

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePI(entry: StoredPI): Promise<void> {
  try {
    await runTransaction("readwrite", async (store) => {
      store.put(entry);

      const all = await idbRequest(store.getAll() as IDBRequest<StoredPI[]>);
      const sorted = all.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );

      for (const item of sorted.slice(MAX_STORED)) {
        store.delete(item.piNumber);
      }
    });
  } catch (err) {
    console.warn("Failed to save PI to IndexedDB:", err);
  }
}

export async function getSavedPIs(): Promise<StoredPI[]> {
  try {
    const all = await runTransaction("readonly", (store) =>
      idbRequest(store.getAll() as IDBRequest<StoredPI[]>)
    );
    return all.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch (err) {
    console.warn("Failed to read saved PIs from IndexedDB:", err);
    return [];
  }
}

export async function getSavedPI(piNumber: string): Promise<StoredPI | null> {
  try {
    const result = await runTransaction("readonly", (store) =>
      idbRequest(store.get(piNumber) as IDBRequest<StoredPI | undefined>)
    );
    return result ?? null;
  } catch (err) {
    console.warn("Failed to read saved PI from IndexedDB:", err);
    return null;
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadStoredPI(piNumber: string): Promise<boolean> {
  const stored = await getSavedPI(piNumber);
  if (!stored?.pdfBlob) return false;

  triggerBlobDownload(stored.pdfBlob, `PI_${piNumber.replace(/\//g, "-")}.pdf`);
  return true;
}

export { triggerBlobDownload };
