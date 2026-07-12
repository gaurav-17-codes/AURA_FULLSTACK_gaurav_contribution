/**
 * Base Connector Interface
 * 
 * Every integration (Google, Slack, Notion, Linear, Microsoft) implements this interface.
 * This ensures adding a new connector in Phase 2 never touches another connector's code.
 */

export interface ConnectorInterface {
  /**
   * Runs the OAuth flow and stores tokens securely
   */
  authorize(userId: string): Promise<{ authUrl: string }>;

  /**
   * Handles the OAuth callback and exchanges code for tokens
   */
  handleCallback(code: string, userId: string): Promise<void>;

  /**
   * Calls the external API and returns raw data
   */
  fetch(userId: string): Promise<any>;

  /**
   * Transforms raw data into Task/Event/Message/Document canonical format
   */
  mapToCanonical(rawData: any, tenantId: string): Promise<CanonicalData>;

  /**
   * Orchestrates fetch + map + enqueue on a schedule or webhook trigger
   */
  sync(userId: string, tenantId: string): Promise<SyncResult>;

  /**
   * Health check method (extensible for Phase 2)
   */
  healthCheck?(userId: string): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>;
}

export interface CanonicalData {
  tasks: CanonicalTask[];
  events: CanonicalEvent[];
  messages: CanonicalMessage[];
  documents: CanonicalDocument[];
}

export interface CanonicalTask {
  title: string;
  status?: string;
  due_date?: string;
  source: string;
  source_id: string;
}

export interface CanonicalEvent {
  title: string;
  start_time?: string;
  end_time?: string;
  attendees?: any;
  source: string;
  source_id: string;
}

export interface CanonicalMessage {
  sender?: string;
  subject?: string;
  snippet?: string;
  flagged?: boolean;
  source: string;
  source_id: string;
}

export interface CanonicalDocument {
  title: string;
  url?: string;
  last_modified?: string;
  source: string;
  source_id: string;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors?: string[];
}
