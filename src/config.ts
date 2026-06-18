// Default script URL for initial tests. Users can update this via UI settings.
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwq...YOUR_SHEET_DEPLOYMENT_URL/exec";

export const getApiUrl = (): string => {
  return localStorage.getItem("AQUEOUSS_API_URL") || DEFAULT_API_URL;
};

export const setApiUrl = (url: string): void => {
  localStorage.setItem("AQUEOUSS_API_URL", url);
};
