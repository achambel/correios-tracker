const Item = function(referenceNumber, referenceDescription) {
  const now = new Date();
  return {
    referenceNumber: referenceNumber,
    referenceDescription: referenceDescription,
    lastStatus: "",
    lastStatusDate: "",
    lastPlace: "",
    statusChanged: false,
    tracks: [],
    checkedAt: "",
    checkRestriction: false,
    archived: false,
    nextCheck: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    ),
    setNextCheck: function(settings) {
      const baseDate = this.checkedAt || new Date();

      if (settings.checkUnitInterval === "minute") {
        this.nextCheck.setMinutes(
          baseDate.getMinutes() + settings.checkInterval
        );
      } else if (settings.checkUnitInterval === "hour") {
        this.nextCheck.setHours(baseDate.getHours() + settings.checkInterval);
      } else if (settings.checkUnitInterval === "day") {
        this.nextCheck.setDate(baseDate.getDate() + settings.checkInterval);
      }
    }
  };
};

function trackerCallback(response) {
  trackable(response);
}

async function trackable(response) {
  const tracks = response.historico
    .map(h => {
      return {
        date: moment(h.data, "DD/MM/YYYY HH:mm").toISOString(),
        details: h.detalhes,
        place: h.local,
        status: h.situacao
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

  const settings = await getSettings();
  if (settings.showNotification && item.statusChanged) {
    showNotification(item);
    playSound("notification");
  }
}

async function trackerFailCallback(fail, referenceNumber) {
  if (fail.status === 404) {
    let item = new Item(referenceNumber);
    item.lastStatus = "Objeto não encontrado";
    item.checkedAt = new Date();
    await saveTrackable(item);
  }
}

async function tracker(referenceNumber) {
  const settings = await getSettings();
  const now = new Date();
  if (!settings.checkRange.includes(now.getHours())) {
    const restrictions = settings.checkRange.join(", ");
    console.info(`Horário ${now.toLocaleString()} está restrito para verificação.
      Configurado para permitir apenas nessas horas: ${restrictions}`);
    updateItemWithRestriction(referenceNumber);
    return;
  }
  const response = await crawler(referenceNumber);
  if (response.historico.length) {
    trackable(response);
  } else {
    trackerFailCallback({ status: 404 }, referenceNumber);
  }
}

async function crawler(referenceNumber) {
  const url =
    "https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm";
  const raw = await $.post(url, { objetos: referenceNumber }).then(data =>
    $.parseHTML(data)
  );
  const response = {
    codigo: referenceNumber,
    historico: []
  };
  $(raw)
    .find("table.listEvent.sro tbody tr")
    .each((index, elm) => {
      const td = $(elm).find("td");
      data = $(td)
        .first()
        .text()
        .replace(/[\r\n]/g, "")
        .trim();
      eventArr = $(td)
        .last()
        .html()
        .split("<br>");
      response.historico.push(prepareHistory(data, eventArr));
    });

  return response;
}

function prepareHistory(td1, td2) {
  let historico = {};
  [historico.situacao, historico.detalhes, ...rest] = td2
    .map(x => x.replace(/[\n\r]/g, "").trim())
    .map(y => $($.parseHTML(y)).text());

  const regex = /(^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})(.*)/g;
  [_, historico.data, historico.local, ...rest] = regex
    .exec(td1)
    .map(x => x.trim());

  return historico;
}

async function updateItemWithRestriction(referenceNumber) {
  const item = await getItem(referenceNumber);
  if (item) {
    item.checkedAt = new Date();
    item.checkRestriction = true;
    saveTrackable(item);
  }
}

async function saveTrackable(item) {
  const settings = await getSettings();
  if (typeof item.setNextCheck === "function") {
    item.setNextCheck(settings);
  }

  const itemExisting = await getItem(item.referenceNumber);
  if (itemExisting) {
    const regex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
    const legacyPattern = regex.test(itemExisting.lastStatusDate);
    if (itemExisting.lastStatusDate) {
      const lastStatusDate = legacyPattern
        ? moment(itemExisting.lastStatusDate, "DD/MM/YYYY HH:mm")
        : moment(itemExisting.lastStatusDate);
      const currentStatusDate = moment(item.lastStatusDate);
      item.statusChanged = currentStatusDate.isAfter(lastStatusDate);
    } else if (
      itemExisting.lastStatusDate === "" &&
      moment(item.lastStatusDate).isValid()
    ) {
      item.statusChanged = true;
    }

    item.referenceDescription = itemExisting.referenceDescription;
    item = Object.assign(itemExisting, item);
  }

  const save = {};
  save[item.referenceNumber] = JSON.stringify(item);
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(save, () => {
      if (chrome.runtime.lastError) {
        message({
          type: "negative",
          icon: "frown",
          content: chrome.runtime.lastError.message
        });
        return reject(false);
      }
      chrome.runtime.sendMessage({ action: "loadTrackItems" });
      loadTrackItems(item.referenceNumber);
      return resolve(item);
    });
  });
}

async function loadTrackItems(transitionItem, sorter) {
  const items = await getActiveItems(sorter);
  const trackItems = document.getElementById("trackItems");

  if (trackItems) {
    trackItems.innerHTML = renderTrackItems(items, sorter);
    $(".ui.dropdown").dropdown();
    $(".show-track-history").click(e =>
      loadTrackHistory(
        e.target.parentElement.parentElement.dataset.referenceNumber,
        showTrackHistory
      )
    );
    $(".remove-trackable").click(e => removeTrackable(e.target.dataset.number));
    $(".check-now").click(e => tracker(e.target.dataset.number));
    $("#checkAll").click(checkAll);
    $(".archive-trackable").click(e =>
      archiveTrackable(e.target.dataset.number)
    );
    updateCounters();
    momentFromNow();
    sortItems();

    const batch = document.querySelectorAll(".batch");
    const batchAction = document.getElementById("batchAction");

    batch.forEach(elm => {
      elm.addEventListener("input", e => {
        const totalSelected = document.querySelectorAll(".batch:checked")
          .length;
        batchAction.style.display = totalSelected ? "inline" : "none";

        e.target.checked
          ? e.target.parentElement.parentElement.classList.add("active-batch")
          : e.target.parentElement.parentElement.classList.remove(
              "active-batch"
            );
      });
    });

    $("#selectAll").click(e => {
      var event = new Event("input");
      batch.forEach(elm => {
        elm.checked = e.target.checked;
        elm.dispatchEvent(event);
      });
    });

    $("#archiveAll").click(_ => batchActions(archiveTrackable));
    $("#removeAll").click(_ => batchActions(removeTrackable));
  }

  if (transitionItem) {
    highlightItem(transitionItem);
  }
}

function batchActions(fn) {
  const batches = document.querySelectorAll(".batch:checked");
  batches.forEach(item => fn(item.value));
}

async function checkAll() {
  const items = await getActiveItems();
  items.forEach((item, i) => {
    tracker(item.referenceNumber);
  });
}

function migrateStorageStrategy(key, legacyItems) {
  // until version 0.4 items were storaged like that:
  // {trackItems: [Item]}
  // There were a limit of 8,192 bytes per item.
  // Find by QUOTA_BYTES_PER_ITEM on https://developer.chrome.com/apps/storage#property-sync
  legacyItems.forEach((item, index) => {
    // timeout necessary because restriction MAX_WRITE_OPERATIONS_PER_MINUTE
    // 2 per second. :(
    setTimeout(() => saveTrackable(item), 500 * index);
  });
  chrome.storage.sync.remove(key);
}

async function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("settings", storage => {
      if (storage.settings) {
        resolve(JSON.parse(storage.settings, dateTimeReviver));
      } else {
        resolve(false);
      }
    });
  });
}

async function getItems() {
  let trackItems = [];
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, storage => {
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

async function getLegacyItems() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("trackItems", storage => {
      if (storage.trackItems) {
        resolve(JSON.parse(storage.trackItems));
      } else {
        resolve([]);
      }
    });
  });
}

async function getItem(referenceNumber) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(referenceNumber, storage => {
      if (storage[referenceNumber]) {
        resolve(JSON.parse(storage[referenceNumber]));
      } else {
        resolve(false);
      }
    });
  });
}

async function getActiveItems(
  sorter = { prop: "lastStatusDate", order: "desc" }
) {
  let items = await getItems();
  items = items.filter(i => !i.archived);
  if (typeof sorter === "object") {
    items = sort(items, sorter.prop, sorter.order);
  }
  return items;
}

async function getArchivedItems() {
  const items = await getItems();
  return items.filter(i => i.archived);
}
