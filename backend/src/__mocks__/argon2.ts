export const hash = jest.fn(async (password: string) => `hashed_${password}`);
export const verify = jest.fn(
  async (hash: string, password: string) => hash === `hashed_${password}`,
);
