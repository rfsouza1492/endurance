/**
 * Notion Read Operations
 * Integração com Notion via MCP ou placeholder
 */

import { fetchPageMCP, searchPagesMCP } from './mcpClient';
import type { NotionPage } from './types';

export type { NotionPage };

/**
 * Read a page from Notion
 * @param pageId - The Notion page ID
 * @returns The page data
 */
export async function readPage(pageId: string): Promise<NotionPage> {
  try {
    // Tenta usar MCP se disponível
    if (process.env.USE_NOTION_MCP === 'true') {
      const page = await fetchPageMCP(pageId);
      
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'notion_read_page',
        pageId,
        method: 'mcp',
      }));
      
      return page;
    } else {
      // Fallback para placeholder
      console.warn(`[Notion Read] Placeholder: readPage(${pageId})`);
      
      return {
        id: pageId,
        title: 'Placeholder Page',
        properties: {},
      };
    }
  } catch (error) {
    // Em caso de erro, usa fallback se permitido
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'notion_read_page_error',
      pageId,
      error: error instanceof Error ? error.message : String(error),
    }));
    
    if (process.env.NOTION_MCP_FALLBACK !== 'false') {
      return {
        id: pageId,
        title: 'Placeholder Page',
        properties: {},
      };
    } else {
      throw error;
    }
  }
}

/**
 * Get agent log page
 * @param agentId - The agent ID
 * @returns The log page ID
 */
export async function getAgentLogPage(agentId: string): Promise<string | null> {
  try {
    // Tenta usar MCP se disponível
    if (process.env.USE_NOTION_MCP === 'true') {
      const query = `agent log ${agentId}`;
      const results = await searchPagesMCP(query);
      
      // Procura por página de log do agente
      const logPage = results.find(page => 
        page.title.toLowerCase().includes('log') && 
        page.title.toLowerCase().includes(agentId.toLowerCase())
      );
      
      if (logPage) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'notion_get_agent_log_page',
          agentId,
          pageId: logPage.id,
          method: 'mcp',
        }));
        
        return logPage.id;
      }
      
      return null;
    } else {
      // Fallback para placeholder
      console.warn(`[Notion Read] Placeholder: getAgentLogPage(${agentId})`);
      
      return null;
    }
  } catch (error) {
    // Em caso de erro, usa fallback
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'notion_get_agent_log_page_error',
      agentId,
      error: error instanceof Error ? error.message : String(error),
    }));
    
    return null;
  }
}

