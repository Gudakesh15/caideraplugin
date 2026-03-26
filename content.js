(() => {
  function getSelectedText() {
    try {
      const selection = window.getSelection();
      return (selection ? selection.toString() : "").trim();
    } catch (_error) {
      return "";
    }
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.type === "GET_SELECTED_TEXT") {
      sendResponse({ text: getSelectedText() });
    }
    return true;
  });
})();
