// Single source of truth for the seeded demo accounts. Used by the
// startup seeding plugin and by the /api/auth/demo-status endpoint.

export interface DemoUser {
  email: string;
  display_name: string;
  password: string;
}

export const DEMO_USERS: DemoUser[] = [
  { email: "alice@example.com", display_name: "Alice Müller", password: "demo123" },
  { email: "bob@example.com", display_name: "Bob Schneider", password: "demo123" },
  { email: "charlie@example.com", display_name: "Charlie Fischer", password: "demo123" },
];

export const DEMO_EMAILS = DEMO_USERS.map((u) => u.email);
