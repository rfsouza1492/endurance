/**
 * Notion Write Operations
 * Integração com Notion via MCP ou placeholder
 */

import { updatePageMCP, createPageMCP } from './mcpClient';
import type { NotionPageProperties } from './types';

export type { NotionPageProperties };

/**
 * Append a log entry to an agent's log page in Notion
 * @param agentId - The agent ID
 * @param pageId - The Notion page ID where the log should be appended
 * @param content - The log content to append
 */
export async function appendAgentLog(
  agentId: string,
  pageId: string,
  content: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `\n\n---\n**${timestamp}** (Agent: ${agentId})\n${content}`;

  try {
    // Tenta usar MCP se disponível
    if (process.env.USE_NOTION_MCP === 'true') {
      // Busca o conteúdo atual da página e adiciona o log
      // Por enquanto, usa updatePageMCP para adicionar conteúdo
      await updatePageMCP(pageId, logEntry);
      
      console.log(JSON.stringify({
        timestamp,
        action: 'notion_append_log',
        agentId,
        pageId,
        method: 'mcp',
        contentLength: content.length,
      }));
    } else {
      // Fallback para placeholder
      console.log(JSON.stringify({
        timestamp,
        action: 'notion_append_log',
        agentId,
        pageId,
        method: 'placeholder',
        content,
      }));
    }
  } catch (error) {
    // Em caso de erro, loga mas não falha
    console.error(JSON.stringify({
      timestamp,
      action: 'notion_append_log_error',
      agentId,
      pageId,
      error: error instanceof Error ? error.message : String(error),
    }));
    
    // Se não for erro crítico, continua com placeholder
    if (process.env.NOTION_MCP_FALLBACK !== 'false') {
      console.log(JSON.stringify({
        timestamp,
        action: 'notion_append_log',
        agentId,
        pageId,
        method: 'placeholder_fallback',
        content,
      }));
    } else {
      throw error;
    }
  }
}

/**
 * Create a new page in Notion
 * @param agentId - The agent ID creating the page
 * @param title - The page title
 * @param properties - Additional page properties
 * @returns The created page ID
 */
export async function createPage(
  agentId: string,
  title: string,
  properties: NotionPageProperties = {}
): Promise<string> {
  const timestamp = new Date().toISOString();
  
  try {
    // Tenta usar MCP se disponível
    if (process.env.USE_NOTION_MCP === 'true') {
      const pageId = await createPageMCP(title, '', properties);
      
      console.log(JSON.stringify({
        timestamp,
        action: 'notion_create_page',
        agentId,
        pageId,
        method: 'mcp',
        title,
        properties,
      }));
      
      return pageId;
    } else {
      // Fallback para placeholder
      const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(JSON.stringify({
        timestamp,
        action: 'notion_create_page',
        agentId,
        pageId,
        method: 'placeholder',
        title,
        properties,
      }));
      
      return pageId;
    }
  } catch (error) {
    // Em caso de erro, loga e usa fallback se permitido
    console.error(JSON.stringify({
      timestamp,
      action: 'notion_create_page_error',
      agentId,
      error: error instanceof Error ? error.message : String(error),
    }));
    
    if (process.env.NOTION_MCP_FALLBACK !== 'false') {
      const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(JSON.stringify({
        timestamp,
        action: 'notion_create_page',
        agentId,
        pageId,
        method: 'placeholder_fallback',
        title,
        properties,
      }));
      
      return pageId;
    } else {
      throw error;
    }
  }
}

