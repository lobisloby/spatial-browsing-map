export type MessageType =
  | 'PAGE_VISITED'
  | 'PAGE_METADATA'
  | 'TAB_CREATED'
  | 'TAB_UPDATED'
  | 'TAB_REMOVED'
  | 'MAP_DATA_UPDATED'
  | 'GET_MAP_DATA'
  | 'CLEAR_SESSION'
  | 'TOGGLE_RECORDING'
  | 'OPEN_SIDE_PANEL';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
  tabId?: number;
}

export interface PageMetadataPayload {
  url: string;
  tabId: number;
  description?: string;
  ogImage?: string;
  wordCount?: number;
}