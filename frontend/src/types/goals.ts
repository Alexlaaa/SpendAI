// frontend/src/types/goals.ts

export enum GoalType {
  SHORT_TERM = "short-term",
  LONG_TERM = "long-term",
}

// Define types for Goal DTOs (mirroring backend DTOs)
export interface CreateGoalPayload {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string; // ISO string format
  type: GoalType;
  category?: string;
  priority?: number;
}

export interface UpdateGoalPayload {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string | null;
  type?: GoalType;
  category?: string;
  priority?: number;
}

// Define Contribution type for response
interface Contribution {
  amount: number;
  date: string; // Use string for date consistency in frontend
}

export interface GoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  type: GoalType;
  category?: string;
  priority?: number;
  contributions: Contribution[];
  createdAt: string;
  updatedAt: string;
}
