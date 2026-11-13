import type { components, paths } from './generated/types.js';

export type { paths, components };
export type Schemas = components['schemas'];
export type Device = Schemas['Device'];
export type Category = Schemas['Category'];
export type Assignment = Schemas['Assignment'];
export type User = Schemas['User'];
export type Problem = Schemas['Problem'];
export type AuthResponse = Schemas['AuthResponse'];
export type DashboardStats = Schemas['DashboardStats'];
