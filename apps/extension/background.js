const LOCAL_API = "http://127.0.0.1:41234/save";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "vaulty-save-page",
    title: "Save Page to Vaulty",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "vaulty-save-selection",
    title: "Save Highlighted Text",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "vaulty-save-link",
    title: "Save Link to Vaulty",
    contexts: ["link"],
  });

  chrome.contextMenus.create({
    id: "vaulty-save-image",
    title: "Save Image to Vaulty",
    contexts: ["image"],
  });
});

async function saveToVaulty(data) {
  try {
    const response = await fetch(LOCAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: "Saved to Vaulty",
        message: "Successfully saved your item to Vaulty.",
      });
    } else {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: "Vaulty Error",
        message:
          "Failed to save item. Make sure Vaulty desktop app is running.",
      });
    }
  } catch (e) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "Vaulty Error",
      message: "Could not connect to Vaulty. Is the desktop app running?",
    });
  }
}

// Click the extension icon to save the current page
chrome.action.onClicked.addListener((tab) => {
  if (tab.url) {
    saveToVaulty({
      type: "link",
      content: tab.url,
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "vaulty-save-page") {
    saveToVaulty({
      type: "link",
      content: info.pageUrl,
    });
  } else if (info.menuItemId === "vaulty-save-selection") {
    saveToVaulty({
      type: "note",
      content: info.selectionText,
    });
  } else if (info.menuItemId === "vaulty-save-link") {
    saveToVaulty({
      type: "link",
      content: info.linkUrl,
    });
  } else if (info.menuItemId === "vaulty-save-image") {
    // Send the image URL to Vaulty. The Vaulty app will download it.
    saveToVaulty({
      type: "image",
      imageUrlToDownload: info.srcUrl,
      content: info.pageUrl || "", // Optional context
    });
  }
});
