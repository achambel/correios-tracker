import {
  getActiveItems,
  getCurrentTab,
  tracker,
  willNotify,
  createNotification,
} from "./backend.js";
import { messageActions } from "./constants.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("../options.html") });
});

chrome.alarms.create("checkTrackerItems", {
  when: Date.now(),
  periodInMinutes: 1,
});

chrome.alarms.onAlarm.addListener(async function (alarm) {
  if (alarm.name === "checkTrackerItems") {
    const items = await getActiveItems();
    if (!items) return;

    for await (const item of items) {
      const scheduledTime = new Date(alarm.scheduledTime);
      const nextCheck = new Date(item.nextCheck);
      if (nextCheck <= scheduledTime) {
        const actualItem = await tracker(item.referenceNumber);
        await notifyIfItem(actualItem);
      }
    }
    sendMessage(messageActions.RELOAD_ACTIVE_ITEMS);
  }
});

async function sendMessage(message) {
  const tab = await getCurrentTab();

  if (!tab) {
    console.log(
      "No active tabs at the moment. Will not send this message:",
      message
    );
    return;
  }

  if (tab.status !== chrome.tabs.TabStatus.COMPLETE) return;

  console.log("OK, sending message to tab ", tab, message);
  chrome.tabs.sendMessage(tab.id, { action: message });
}

async function notifyIfItem(item) {
  if (!item) return;

  if (await willNotify(item)) {
    createNotification(item);
  }
}

async function showTab() {
  const tab = await getCurrentTab();

  if (tab) {
    chrome.tabs.update(tab.id, { active: true });
    return;
  }

  chrome.tabs.create({ url: chrome.runtime.getURL("../options.html") });
}

chrome.action.onClicked.addListener(async () => await showTab());

chrome.notifications.onClicked.addListener(async () => await showTab());
