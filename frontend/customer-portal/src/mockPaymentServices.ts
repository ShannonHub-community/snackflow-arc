/**
 * mockPaymentServices.ts
 * Handlers for simulated backend logic, order tracking timers, and global states.
 */

// 1. Short Order ID Generator: [A-Z][0-9]{2}
export const generateShortId = (): string => {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${letter}${num}`;
};

// 2. PhonePe Redirect Simulator: 2-second timeout
export const simulatePhonePeRedirect = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 2000);
  });
};

// 3. Global Store Status
export const isStoreOpen = true;

// 4. REVISED Mock Order Database for quick pay lookups
export interface MockOrderItem {
  name: string;
  quantity: number;
  price: number;
  note?: string;
}

export interface MockOrder {
  id: string;
  items: MockOrderItem[];
  total: number;
}

export const mockOrdersDatabase: Record<string, MockOrder> = {
  "C11": {
    id: "C11",
    total: 250,
    items: [
      { name: "Classic Bombay Burger", quantity: 1, price: 150 },
      { name: "Iced Cardamom Latte", quantity: 1, price: 100 }
    ]
  },
  "C12": {
    id: "C12",
    total: 300,
    items: [
      { name: "Sandwich", quantity: 2, price: 120 },
      { name: "Tea", quantity: 2, price: 30 }
    ]
  },
  "C13": {
    id: "C13",
    total: 250,
    items: [
      { name: "Pizza", quantity: 1, price: 250, note: "Extra cheese" }
    ]
  }
};

export const fetchMockOrder = (id: string): MockOrder | null => {
  return mockOrdersDatabase[id.toUpperCase()] || null;
};

export const fetchAllMockOrders = (): MockOrder[] => {
  return Object.values(mockOrdersDatabase);
};
