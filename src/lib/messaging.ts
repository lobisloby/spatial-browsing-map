// src/lib/messaging.ts
import type { ExtensionMessage, MessageType } from '@/types/messages';

export function sendMessage<T>(
  type: MessageType,
  payload: T,
  tabId?: number,
): Promise<unknown> {
  const message: ExtensionMessage<T> = {
    type,
    payload,
    timestamp: Date.now(),
    tabId,
  };

  if (tabId) {
    return chrome.tabs.sendMessage(tabId, message);
  }
  return chrome.runtime.sendMessage(message);
}

export function onMessage(
  callback: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => void | boolean,
): void {
  chrome.runtime.onMessage.addListener(callback);
}

export function sendToSidePanel<T>(
  type: MessageType,
  payload: T,
): Promise<unknown> {
  return chrome.runtime.sendMessage({
    type,
    payload,
    timestamp: Date.now(),
  });
}