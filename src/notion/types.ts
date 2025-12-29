/**
 * Notion Types
 * Tipos compartilhados para operações do Notion
 */

export interface NotionPageProperties {
  [key: string]: unknown;
}

export interface NotionPage {
  id: string;
  title: string;
  properties: Record<string, unknown>;
}

