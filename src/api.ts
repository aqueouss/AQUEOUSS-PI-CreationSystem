import { getApiUrl } from "./config";
import { User, DashboardStats, PILogEntry, PICreationInput } from "./types";

// Helper for Mock Data
const getMockPIs = (): PILogEntry[] => {
  const data = localStorage.getItem("MOCK_PI_LOG");
  if (data) return JSON.parse(data);
  const initial: PILogEntry[] = [
    {
      piNumber: "AQ/2026-27/28695",
      date: "2026-06-17",
      customerName: "Aqueouss Test Customer",
      mobile: "9876543210",
      gstin: "07AAAAA1111A1Z1",
      taxableAmount: 10000,
      gstAmount: 1800,
      grandTotal: 11800,
      generatedBy: "Admin User"
    }
  ];
  localStorage.setItem("MOCK_PI_LOG", JSON.stringify(initial));
  return initial;
};

const getMockStats = (): DashboardStats => {
  const pis = getMockPIs();
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  
  const todayCount = pis.filter(p => p.date === todayStr).length;
  const monthCount = pis.filter(p => p.date.startsWith(thisMonthStr)).length;
  const lastPiNumber = pis.length > 0 ? pis[0].piNumber : "AQ/2026-27/28695";

  return { todayCount, monthCount, lastPiNumber };
};

// Check if using Mock Mode
export const isMockMode = (): boolean => {
  const url = getApiUrl();
  return url.includes("YOUR_SHEET_DEPLOYMENT_URL") || localStorage.getItem("USE_MOCK_MODE") === "true";
};

export const setMockMode = (enabled: boolean): void => {
  localStorage.setItem("USE_MOCK_MODE", enabled ? "true" : "false");
};

// Main API request helper
async function requestApi<T>(action: string, payload: any = {}): Promise<T> {
  if (isMockMode()) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (action === "login") {
      const { email, password } = payload;
      if (email === "admin@aqueouss.com" && password === "admin123") {
        return {
          status: "success",
          user: { name: "Admin User", email: "admin@aqueouss.com", role: "Admin" }
        } as unknown as T;
      } else if (email === "emp@aqueouss.com" && password === "emp123") {
        return {
          status: "success",
          user: { name: "Employee User", email: "emp@aqueouss.com", role: "Employee" }
        } as unknown as T;
      }
      throw new Error("Invalid email or password (Mock Mode)");
    }
    
    if (action === "getDashboard") {
      return {
        status: "success",
        stats: getMockStats(),
        recentPIs: getMockPIs()
      } as unknown as T;
    }
    
    if (action === "generatePI") {
      const pis = getMockPIs();
      let lastNum = 28695;
      if (pis.length > 0) {
        const parts = pis[0].piNumber.split("/");
        const lastPart = parts[parts.length - 1];
        lastNum = parseInt(lastPart, 10) || 28695;
      }
      const newNum = lastNum + 1;
      const generatedPiNumber = `AQ/2026-27/${newNum}`;
      
      const newEntry: PILogEntry = {
        piNumber: generatedPiNumber,
        date: payload.date || new Date().toISOString().split("T")[0],
        customerName: payload.customerName || "",
        mobile: payload.mobile || "",
        gstin: payload.gstin || "",
        taxableAmount: payload.taxableAmount || 0,
        gstAmount: payload.gstAmount || 0,
        grandTotal: payload.grandTotal || 0,
        generatedBy: payload.generatedBy || "Mock User"
      };
      
      // Prepend to list
      localStorage.setItem("MOCK_PI_LOG", JSON.stringify([newEntry, ...pis]));
      
      return {
        status: "success",
        piNumber: generatedPiNumber
      } as unknown as T;
    }
    
    throw new Error("Unsupported mock action");
  }

  const url = getApiUrl();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.status === "error") {
      throw new Error(result.message || "API returned error status");
    }

    return result;
  } catch (error: any) {
    console.error("API error:", error);
    throw new Error(
      error.message || "Failed to connect to Google Sheets. Verify Web App deployment and internet connection."
    );
  }
}

// Export API functions
export const login = (email: string, password: string): Promise<{ user: User }> => {
  return requestApi<{ user: User }>("login", { email, password });
};

export const getDashboardData = (): Promise<{ stats: DashboardStats; recentPIs: PILogEntry[] }> => {
  return requestApi<{ stats: DashboardStats; recentPIs: PILogEntry[] }>("getDashboard");
};

export const generatePI = (
  input: PICreationInput,
  totals: { taxable: number; gst: number; grand: number },
  username: string
): Promise<{ piNumber: string }> => {
  return requestApi<{ piNumber: string }>("generatePI", {
    date: input.date || new Date().toISOString().split("T")[0],
    customerName: input.customerName,
    mobile: input.mobile,
    gstin: input.gstin,
    taxableAmount: totals.taxable,
    gstAmount: totals.gst,
    grandTotal: totals.grand,
    generatedBy: username
  });
};
