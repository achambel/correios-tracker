import { dateTimeReviver, sort } from "./utils.js";
import { Item } from "./item.js";
import { crawler } from "./service.js";

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
        if (regex.test(key)) {
          const item = JSON.parse(value, dateTimeReviver);
          if (item.hasOwnProperty("referenceNumber")) {
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
export async function getCurrentTab() {
  let queryOptions = {
    url: `chrome-extension://${chrome.runtime.id}/options.html`,
  };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function isStatusChanged(existingStatusDate = "", currentStatusDate = "") {
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
    item.statusChanged = isStatusChanged(
      itemExisting.lastStatusDate,
      item.lastStatusDate
    );

    item.referenceDescription = itemExisting.referenceDescription;
    item = Object.assign(itemExisting, item);
  }

  const save = {};
  save[item.referenceNumber] = JSON.stringify(item);
  chrome.storage.sync.set(save);

  return item;
}

export async function trackable(response) {
  const tracks = response.historico
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

  let item = new Item(response.codigo);
  item.lastStatus = tracks[0].status;
  item.lastStatusDate = tracks[0].date;
  item.lastPlace = tracks[0].place;
  item.checkedAt = new Date();
  item.tracks = tracks;
  item = await saveTrackable(item);

  return item;
}

async function trackerFailCallback(fail, referenceNumber) {
  let item = new Item(referenceNumber);
  item.checkedAt = new Date();

  switch (fail.status) {
    case 403:
      item.lastStatus = "Acesso remoto negado";
      break;
    case 404:
      item.lastStatus = "Objeto não encontrado";
      break;
    default:
      item.lastStatus = "";
  }

  await saveTrackable(item);
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
  const user_stats = await getUserStats();
  const response = await crawler({ referenceNumber, user_stats });
  if (response.historico.length) {
    const item = await trackable(response);
    return item;
  } else {
    trackerFailCallback({ status: 404 }, referenceNumber);
  }
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
