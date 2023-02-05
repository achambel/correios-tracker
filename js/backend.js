import { dateTimeReviver, sort } from "./utils.js";
import { Item } from "./item.js";
import { crawler } from "./service.js";
import { messageActions, storageKeys, text } from "./constants.js";

export async function getSettings() {
  const db = await chrome.storage.sync.get("settings");
  if (db["settings"]) {
    return JSON.parse(db["settings"]);
  }

  return false;
}

export async function getItems() {
  let trackItems = [];
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (storage) => {
      const regex = /^[\w\d]{9,21}$/;

      for (const [key, value] of Object.entries(storage)) {
        if (regex.test(key) && typeof value === "string") {
          const item = JSON.parse(value, dateTimeReviver);
          if (item.referenceNumber) {
            trackItems.push(item);
          }
        }
      }

      resolve(trackItems);
    });
  });
}

export async function getItem(referenceNumber) {
  const db = await chrome.storage.sync.get(referenceNumber);
  if (db[referenceNumber]) {
    return JSON.parse(db[referenceNumber]);
  }

  return false;
}

export async function getActiveItems(
  sorter = { prop: "lastStatusDate", order: "desc" }
) {
  let items = await getItems();
  items = items.filter((i) => !i.archived);
  if (typeof sorter === "object") {
    items = sort(items, sorter.prop, sorter.order);
  }
  return items;
}

export async function getArchivedItems() {
  const items = await getItems();
  return items.filter((i) => i.archived);
}

export function createNotification(item = {}) {
  const { lastStatus, checkedAt, referenceDescription, referenceNumber } = item;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "../256x256.png",
    title: `${referenceNumber} ${referenceDescription || ""}`,
    message: `${lastStatus}\nVerificado às ${checkedAt}`,
  });
}

export function createGenericNotification({ title, message }) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "../256x256.png",
    title,
    message,
  });
}

export async function getCurrentTab() {
  let queryOptions = {
    url: chrome.runtime.getURL("index.html"),
  };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function isStatusChanged({ existingStatusDate, currentStatusDate }) {
  if (existingStatusDate === "" && currentStatusDate) return true;

  return Date.parse(currentStatusDate) > Date.parse(existingStatusDate);
}

export async function saveTrackable(item) {
  const settings = await getSettings();
  if (typeof item.setNextCheck === "function") {
    item.setNextCheck(settings);
  }

  const itemExisting = await getItem(item.referenceNumber);

  if (itemExisting) {
    item.statusChanged = isStatusChanged({
      existingStatusDate: itemExisting.lastStatusDate,
      currentStatusDate: item.lastStatusDate,
    });

    if (!item.isSuccess) {
      item.tracks = itemExisting.tracks;
    }

    item.referenceDescription = itemExisting.referenceDescription;
    item = { ...itemExisting, ...item };
  }

  const save = {};
  save[item.referenceNumber] = JSON.stringify(item);
  chrome.storage.sync.set(save);

  return item;
}

export async function trackable(response) {
  const { referenceNumber, isSuccess, lastStatus, eventos = [] } = response;

  let item = new Item(referenceNumber);
  item.lastStatus = lastStatus;
  item.checkedAt = new Date();
  item.isSuccess = isSuccess;

  if (eventos.length) {
    item.tracks = prepareTracks(eventos);
    item.lastStatus = item.tracks[0].status;
    item.lastStatusDate = item.tracks[0].date;
    item.lastPlace = item.tracks[0].place;
  }

  item = await saveTrackable(item);

  return item;
}

function prepareTracks(eventos = []) {
  return eventos
    .map((h) => {
      return {
        date: h.data,
        details: h.detalhes,
        place: h.local,
        status: h.situacao,
      };
    })
    .sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
}

async function updateItemWithRestriction(referenceNumber) {
  const item = await getItem(referenceNumber);
  if (item) {
    item.checkedAt = new Date();
    item.checkRestriction = true;
    saveTrackable(item);
  }
}

export async function tracker(referenceNumber) {
  const settings = await getSettings();
  const now = new Date();
  if (!settings.checkRange.includes(now.getHours())) {
    const restrictions = settings.checkRange.join(", ");
    console.info(`Horário ${now.toLocaleString()} está restrito para verificação.
      Configurado para permitir apenas nessas horas: ${restrictions}`);
    updateItemWithRestriction(referenceNumber);
    return;
  }
  const token = await getToken();
  const user_stats = await getUserStats();
  const userData = { user_stats };

  const response = await crawler({ referenceNumber, userData, token });
  const item = await trackable(response);

  return item;
}

export async function willNotify(item = new Item()) {
  const settings = await getSettings();
  return settings.showNotification && item.statusChanged;
}

async function getUserStats() {
  const total_objetos = (await getItems()) || [];
  const settings = await getSettings();

  return {
    run_every: `${settings.checkInterval} ${settings.checkUnitInterval}`,
    total_objetos: total_objetos.length,
  };
}

export async function getToken() {
  const token = await getUserToken();

  return token;
}

export async function sendMessage(message) {
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

export async function setUserToken({ token = null }) {
  await chrome.storage.sync.set({ [storageKeys.USER_TOKEN]: { token } });
}

export async function removeUserToken() {
  await chrome.storage.sync.remove(storageKeys.USER_TOKEN);
}

export async function getUserToken() {
  const db = await chrome.storage.sync.get(storageKeys.USER_TOKEN);

  const { token } = db[storageKeys.USER_TOKEN] || {};

  return token;
}

export async function userNotAuthenticated() {
  await removeUserToken();
  sendMessage(messageActions.TOKEN_NOT_FOUND);

  const badgeText = await chrome.action.getBadgeText({});
  if (badgeText === text.LOGIN) return;

  await chrome.action.setBadgeText({ text: text.LOGIN }, () => {});
  await chrome.action.setBadgeBackgroundColor({ color: "#e06c57" });

  createGenericNotification({
    title: "Usuário não autenticado",
    message: "Faça o login antes de continuar",
  });
}
