// src/types/chrome.ts
export interface ChromeTab extends chrome.tabs.Tab {
  id: number;
  url: string;
  title: string;
}

export interface WebNavigationDetails {
  tabId: number;
  url: string;
  frameId: number;
  parentFrameId: number;
  timeStamp: number;
  transitionType: string;
  transitionQualifiers: string[];
}