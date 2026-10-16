/**
 * Lifecycle status for containers (accounts, businesses, etc.).
 * Archived containers are hidden from the dashboard but kept for history.
 */
export enum ContainerStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}
