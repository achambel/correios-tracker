import {
  getActiveItems,
  getCurrentTab,
  tracker,
  willNotify,
  createNotification,
} from "./backend.js";

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
      } else {
        console.info(`Alarm name: ${alarm.name}`);
        console.info(
          `It's ${scheduledTime} and next checking should be at ${item.nextCheck}`
        );
      }
    }
  }
});

async function notifyIfItem(item) {
  if (!item) return;

  if (await willNotify(item)) {
    createNotification(item);
  }
}

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("../options.html") });
});

chrome.notifications.onClicked.addListener(async () => {
  const tab = await getCurrentTab();

  if (tab) {
    chrome.tabs.update(tab.id, { active: true });
    return;
  }

  chrome.tabs.create({ url: chrome.runtime.getURL("../options.html") });
});
