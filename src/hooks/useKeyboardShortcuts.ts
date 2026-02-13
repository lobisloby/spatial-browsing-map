// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { useMapStore } from './useMapStore';

export function useKeyboardShortcuts() {
  const {
    selectedNodeId,
    nodes,
    selectNode,
    toggleCollapse,
    zoomIn,
    zoomOut,
    fitToView,
    removeNode,
    centerOnNode,
  } = useMapStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if focused on input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case 'Escape':
          selectNode(null);
          break;

        case '=':
        case '+':
          if (isMod) {
            e.preventDefault();
            zoomIn();
          }
          break;

        case '-':
          if (isMod) {
            e.preventDefault();
            zoomOut();
          }
          break;

        case '0':
          if (isMod) {
            e.preventDefault();
            fitToView();
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (selectedNodeId && !isMod) {
            removeNode(selectedNodeId);
            selectNode(null);
          }
          break;

        case ' ':
          if (selectedNodeId) {
            e.preventDefault();
            toggleCollapse(selectedNodeId);
          }
          break;

        case 'Enter':
          if (selectedNodeId) {
            const node = nodes[selectedNodeId];
            if (node) {
              chrome.tabs.create({ url: node.url });
            }
          }
          break;

        case 'f':
          if (isMod) {
            e.preventDefault();
            // Focus search input
            const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
            searchInput?.focus();
          }
          break;

        case 'c':
          if (selectedNodeId && isMod) {
            e.preventDefault();
            centerOnNode(selectedNodeId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, selectNode, toggleCollapse, zoomIn, zoomOut, fitToView, removeNode, centerOnNode]);
}