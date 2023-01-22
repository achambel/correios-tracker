import { Item } from "./item.js";

import {
  getSettings,
  getItems,
  getActiveItems,
  getArchivedItems,
  getItem,
  saveTrackable,
  createNotification,
  tracker,
  willNotify,
  getUserProfile,
  sendMessage,
} from "./backend.js";

import {
  applyTheme,
  noObjects,
  momentFromNow,
  hasTracks,
  lastTrack,
  playSound,
  message,
  highlightItem,
} from "./utils.js";

import { messageActions, statusesClass } from "./constants.js";

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(["_setAccount", "UA-112767555-1"]);
_gaq.push(["_trackPageview"]);

const defaultSettings = {
  name: "settings",
  value: {
    checkInterval: 60,
    checkUnitInterval: "minute",
    showNotification: true,
    checkRange: generateHourRange(),
    lastUpdated: new Date(),
    audioEnabled: true,
    darkTheme: true,
  },
};

async function initializeSettings() {
  const settings = await getSettings();
  return new Promise((resolve) => {
    let save = {};
    if (!settings) {
      save[defaultSettings.name] = JSON.stringify(defaultSettings.value);
      chrome.storage.sync.set(save);
      resolve(defaultSettings.value);
    } else {
      const merge = Object.assign(defaultSettings.value, settings);
      save[defaultSettings.name] = JSON.stringify(merge);
      chrome.storage.sync.set(save);
      resolve(merge);
    }
  });
}

async function checkAll() {
  const items = await getActiveItems();
  await Promise.all(items.map((item) => doTracker(item.referenceNumber)));
}

function saveSettings(e) {
  e.preventDefault();

  const settings = {
    checkInterval: parseInt(document.getElementById("checkInterval").value),
    checkUnitInterval: document.getElementById("checkUnitInterval").value,
    showNotification: document.getElementById("showNotification").checked,
    checkRange: [].map.call(
      document.getElementById("range").selectedOptions,
      (ele) => parseInt(ele.value)
    ),
    lastUpdated: new Date(),
    audioEnabled: document.getElementById("audioEnabled").checked,
    darkTheme: document.getElementById("theme").checked,
  };

  document.getElementById("settingsLastUpdated").textContent =
    settings.lastUpdated.toLocaleString();

  chrome.storage.sync.set({ settings: JSON.stringify(settings) }, function () {
    $("#message-modal .header").text("Mensagem");
    $("#message-modal .content").html(
      "<h3>As configurações foram salvas com sucesso e surtirão efeito na próxima verificação!</h3>"
    );
    $("#message-modal").modal("show");
  });
}

async function saveReferenceNumber(e) {
  e.preventDefault();
  const referenceNumberElement = document.getElementById("referenceNumber");
  const referenceNumber = referenceNumberElement.value.toUpperCase();
  const referenceDescriptionElement = document.getElementById(
    "referenceDescription"
  );
  const referenceDescription = referenceDescriptionElement.value;

  let item = new Item(referenceNumber, referenceDescription);
  item = await saveTrackable(item);
  renderActiveItems();
  highlightItemAfter({ referenceNumber });

  if (item) {
    const content = `Objeto <b>${item.referenceNumber} (${item.referenceDescription})</b> adicionado com sucesso!`;
    message({ type: "positive", icon: "smile", content: content });
  }

  referenceNumberElement.value = "";
  referenceDescriptionElement.value = "";
}

function renderTrackItems(
  items,
  sorter = { prop: "lastStatusDate", order: "desc" }
) {
  if (!items.length) return noObjects();

  let template = `
    <table class="ui red striped table">
      <thead>
        <th><input type="checkbox" title="Selecionar todos" id="selectAll"></th>
        <th data-sort="referenceNumber" class="${
          sorter.prop === "referenceNumber" ? sorter.order : ""
        }">Objeto</th>
        <th data-sort="checkedAt" class="${
          sorter.prop === "checkedAt" ? sorter.order : ""
        }">Verificado</th>
        <th data-sort="lastStatus" class="${
          sorter.prop === "lastStatus" ? sorter.order : ""
        }">Status</th>
        <th data-sort="lastStatusDate" class="${
          sorter.prop === "lastStatusDate" ? sorter.order : ""
        }">Data</th>
        <th data-sort="lastPlace" class="${
          sorter.prop === "lastPlace" ? sorter.order : ""
        }">Local</th>
        <th>Histórico</th>
        <th class="center aligned">Ações</th>
        <th data-sort="nextCheck" class="${
          sorter.prop === "nextCheck" ? sorter.order : ""
        }">Próxima verificação</th>
      </thead>
      <tbody>
        {{lines}}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="9">
            <button class="ui labeled icon inverted orange button" id="checkAll">
              <i class="alarm icon"></i>
              Verificar todos agora
            </button>
            <span id="batchAction">
              <button class="ui labeled icon button" id="archiveAll">
                <i class="folder open icon"></i>
                Arquivar selecionados
              </button>
              <button class="ui labeled icon inverted red button" id="removeAll">
                <i class="trash icon"></i>
                Remover selecionados
              </button>
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  const lines = items
    .map((item) => {
      return ` <tr
                  class="${item.checkRestriction ? "check-restriction" : ""}"
                  title="${
                    item.checkRestriction
                      ? "Não verificado porque havia restrição de hora configurada"
                      : ""
                  }"
                  data-reference-number="${item.referenceNumber}">
                <td><input class="batch" type="checkbox" value="${
                  item.referenceNumber
                }"></td>
                <td>${item.referenceNumber} (${item.referenceDescription})</td>
                <td data-moment="${item.checkedAt}"></td>
                <td><span class="ui small ${
                  statusesClass[item.lastStatus] || "primary"
                } label">${item.lastStatus}</span></td>
                <td data-moment="${
                  hasTracks(item) ? lastTrack(item).date : ""
                }" data-formatted></td>
                <td>${hasTracks(item) ? lastTrack(item).place : ""}</td>
                <td>
                    <button class="ui labeled icon inverted tiny green button show-track-history">
                      <i class="clock icon"></i>
                      mostrar
                    </button>
                </td>
                <td>
                  <div class="ui dropdown button">
                    <i class="dropdown icon"></i>
                    <div class="menu">
                      <div data-number="${
                        item.referenceNumber
                      }" class="item check-now">
                        <i class="alarm icon"></i>
                        Verificar
                      </div>
                      <div data-number="${
                        item.referenceNumber
                      }" class="item archive-trackable">
                        <i class="folder open icon"></i>
                        Arquivar
                      </div>
                      <div data-number="${
                        item.referenceNumber
                      }" class="item remove-trackable">
                        <i class="trash icon"></i>
                        Remover
                      </div>
                    </div>
                  </div>
                </td>
                <td data-moment="${item.nextCheck}"></td>
              </tr>
            `;
    })
    .join("");

  if (lines) {
    template = template.replace(/{{lines}}/g, lines);
  }
  return template;
}

function renderTrackHistory(item) {
  let template = `
    <table class="ui red striped table">
      <caption class="ui red header">Número do Objeto: ${item.referenceNumber} (${item.referenceDescription})</caption>
      <thead>
        <th>Data</th>
        <th>Duração</th>
        <th>Status</th>
        <th>Local</th>
        <th>Unidade Destino</th>
      </thead>
      <tbody>
        {{lines}}
      </tbody>
    </table>
  `;

  const lines = item.tracks
    .map((track) => {
      return `<tr>
                <td>${moment(track.date).format("DD/MM/YYYY HH:mm")}</td>
                <td data-moment="${moment(track.date)}"></td>
                <td>
                  <span class="ui small ${
                    statusesClass[track.status] || "primary"
                  } label">
                    ${track.status}
                  </span>
                </td>
                <td>${track.place}</td>
                <td>${track.details}</td>
              </tr>
            `;
    })
    .join("");

  if (lines) {
    template = template.replace(/{{lines}}/g, lines);
  } else {
    template = "<h3>Não há histórico ainda!</h3>";
  }

  return template;
}

async function loadTrackHistory(referenceNumber, callback) {
  const items = await getItems();
  const itemFiltered = items.filter(
    (item) => item.referenceNumber === referenceNumber
  );
  if (itemFiltered.length) {
    if (typeof callback === "function") {
      callback(renderTrackHistory(itemFiltered[0]));
      momentFromNow();
    }
  }
}

function showTrackHistory(history) {
  $("#message-modal .header").text("Histórico");
  $("#message-modal .content").html(history);
  $("#message-modal").modal("show");
}

async function updateCounters() {
  const items = await getActiveItems();
  $("#objectCounter").text(items.length);

  const archiveds = await getArchivedItems();
  $("#archivedCounter").text(archiveds.length);
}

async function removeTrackable(referenceNumber) {
  playSound("bin");
  $(`tr[data-reference-number=${referenceNumber}]`).transition({
    animation: "fly right",
    onComplete: async () => {
      $(`tr[data-reference-number=${referenceNumber}]`).remove();
      const item = await getItem(referenceNumber);
      await chrome.storage.sync.remove(referenceNumber);
      updateCounters();
      item.archived ? renderArchivedItems() : renderActiveItems();
    },
  });
}

async function archiveTrackable(referenceNumber) {
  playSound("archive");
  $(`tr[data-reference-number=${referenceNumber}]`).transition({
    animation: "fly right",
    onComplete: async () => {
      const item = await getItem(referenceNumber);
      item.archived = true;
      await saveTrackable(item);
      updateCounters();
    },
  });
}

async function restoreTrackable(referenceNumber) {
  playSound("restore");
  $(`tr[data-reference-number=${referenceNumber}]`).transition({
    animation: "fly right",
    onComplete: async () => {
      let item = await getItem(referenceNumber);
      item.archived = false;
      item = await saveTrackable(item);
      updateCounters();
      renderArchivedItems();
    },
  });
}

async function renderArchivedItems() {
  const items = await getArchivedItems();
  let template = `
    <div class="ui segment">
      <h3 class="ui dividing header">Objetos Arquivados</h3>
      <table class="ui red striped table">
        <thead>
          <th>Objeto</th>
          <th>Status</th>
          <th>Data</th>
          <th>Histórico</th>
          <th>Ações</th>
        </thead>
        <tbody>
          {{lines}}
        </tbody>
      </table>
  `;
  const lines = items
    .map((item) => {
      return `<tr data-reference-number="${item.referenceNumber}">
                <td>${item.referenceNumber}(${item.referenceDescription})</td>
                <td>
                  <span class="ui small ${
                    statusesClass[item.lastStatus] || "primary"
                  } label">
                    ${item.lastStatus}
                  </span>
                </td>
                <td data-moment="${
                  hasTracks(item)
                    ? moment(lastTrack(item).date, "DD/MM/YYYY HH:mm").format()
                    : ""
                }"></td>
                <td>
                  <button class="ui labeled icon inverted tiny green button show-track-history">
                    <i class="clock icon"></i>
                    mostrar
                  </button>
                </td>
                <td>
                  <button class="ui labeled icon inverted tiny blue button restore-trackable">
                    <i class="reply icon"></i>
                    restaurar
                  </button>
                  <button class="ui labeled icon red inverted tiny button remove-trackable">
                    <i class="trash icon"></i>
                    remover
                  </button>
                </td>
              </tr>
            `;
    })
    .join("");

  if (lines) {
    template = template.replace(/{{lines}}/g, lines) + "</div>";
  } else {
    template =
      '<div class="ui segment"><h3 class="ui header">Nenhum Objeto Arquivado!</h3></div>';
  }
  $("#container").html(template);

  $(".show-track-history").click(function () {
    loadTrackHistory(
      this.parentElement.parentElement.dataset.referenceNumber,
      showTrackHistory
    );
  });

  $(".remove-trackable").click(function () {
    removeTrackable(this.parentElement.parentElement.dataset.referenceNumber);
  });

  $(".restore-trackable").click(function () {
    restoreTrackable(this.parentElement.parentElement.dataset.referenceNumber);
  });

  momentFromNow();
}

function renderRangeOptions(checkRange) {
  let options = [];

  generateHourRange().forEach((hour) => {
    const hourFormatted = hour.toString().padStart(2, "0");
    const selected = checkRange.indexOf(hour) >= 0;

    options.push(
      `<option value="${hour}" ${
        selected ? "selected" : ""
      }>${hourFormatted}h</option>`
    );
  });

  const select = document.getElementById("range");
  select.innerHTML = options.join("");
}

function generateHourRange() {
  let hours = [];

  for (let i = 0; i < 24; i++) {
    hours.push(i);
  }

  return hours;
}

function renderActiveItems() {
  const template = `<form id="formSaveReferenceNumber" class="ui form segment">
          <div class="ui items">
            <div class="item">
              <div class="middle aligned content">
                <div class="ui">
                  <h3 class="ui dividing header">Lista de Objetos</h3>
                  <div class="three fields">
                    <div class="field">
                      <label for="referenceNumber">Número do objeto: </label>
                      <input type="text" class="input" id="referenceNumber"
                                               maxlength="21"
                                               placeholder="Ex. AA100833276BR"
                                               pattern="[\\w\\d]{9,21}"
                                               required>
                    </div>
                    <div class="field">
                      <label for="referenceDescription">Descrição do objeto: </label>
                      <input type="text" class="input" id="referenceDescription"
                                               maxlength="64"
                                               placeholder="Ex. Livro - Submarino"
                                               required>
                    </div>
                    <div class="field">
                      <label>&nbsp;</label>
                      <button class="ui labeled icon button">
                        <i class="mail icon"></i>
                        Adicionar
                      </button>
                      <button
                        class="ui labeled icon button"
                        id="importFile"
                        title="Importar arquivo texto com número do objeto e descrição separados por vírgula. Exemplo:\nAA100833276BR,Livro\nAA100833777CH,Cerveja">
                        <i class="file icon"></i>
                        Importar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        <div id="message-container" class="ui hidden icon message">
          <i id="message-icon" class="icon"></i>
          <div class="content">
            <p id="message-content"></p>
          </div>
          <i class="close icon"></i>
        </div>
        <div id="trackItems"></div>`;

  $("#container").html(template);
  $("#formSaveReferenceNumber").on("submit", saveReferenceNumber);
  $("#importFile").click(function (e) {
    e.preventDefault();
    inputFileHandler();
  });
  loadTrackItems();
}

async function renderSettings() {
  const template = `
        <div class="ui segment">
          <h3 class="ui header">Configurações - Última alteração ocorreu em
            <a class="ui label">
              <i class="calendar icon"></i>
              <span id="settingsLastUpdated"></span>
            </a>
          </h3>

        <div class="content">
        <form id="formSettings" class="ui form">

          <div class="inline fields">
            <label class="label" for="checkInterval">Verificar status a cada </label>

            <div class="field">
              <input type="number" class="input" id="checkInterval" value="60" min="1" max="99" required>
            </div>

            <div class="field">
              <select id="checkUnitInterval" class="ui fluid dropdown">
                <option value="minute">Minuto(s)</option>
                <option value="hour">Hora(s)</option>
                <option value="day">Dia(s)</option>
              </select>
            </div>

            <div class="field">
              <div class="ui toggle checkbox">
                <input type="checkbox" id="showNotification" checked>
                <label class="label" style="cursor: pointer;" for="showNotification">Mostrar notificação quando completar a verificação?</label>
              </div>
            </div>

            <div class="field">
              <div class="ui toggle checkbox">
                <input type="checkbox" id="audioEnabled" checked>
                <label class="label" style="cursor: pointer;" for="audioEnabled">
                  Tocar áudio para ações?
                </label>
              </div>
            </div>

          </div>

          <div class="inline fields">
            <label class="label">Verificar apenas nessas horas</label>
            <div class="field">
              <select id="range" multiple title="Permite selecionar múltiplos horários"></select>
            </div>
          </div>

          <button class="ui icon button">
                  <i class="save icon"></i>
                  Salvar
                </button>
        </form>
        </div>
      </div>`;

  $("#container").html(template);
  $("#formSettings").on("submit", saveSettings);
  const settings = await getSettings();
  document.getElementById("checkInterval").value = settings.checkInterval;
  document.querySelector(
    `#checkUnitInterval option[value=${settings.checkUnitInterval}]`
  ).selected = true;
  document.getElementById("showNotification").checked =
    settings.showNotification;
  renderRangeOptions(settings.checkRange);
  document.getElementById("settingsLastUpdated").textContent =
    settings.lastUpdated.toLocaleString();
  document.getElementById("audioEnabled").checked = settings.audioEnabled;
  document.getElementById("theme").checked = settings.darkTheme;
}

function sortItems() {
  $(".ui.table th").click(function () {
    if (!this.dataset.sort) return;
    const order = $(this).hasClass("asc") ? "desc" : "asc";
    $(".ui.table th").removeClass();
    $(this).addClass(order);
    loadTrackItems(null, { prop: this.dataset.sort, order: order });
  });
}

function inputFileHandler() {
  const inputFile = document.getElementById("inputFile");
  inputFile.click();
  inputFile.onchange = function () {
    handleFile(this.files);
    this.value = null;
  };
}

function handleFile(files) {
  if (!files.length) return;
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const batch = addObjectFromFile(text);
    if (batch.errors.length) {
      message({
        type: "error",
        icon: "envelope alternate outline",
        content: "Objetos inválidos:<br>" + batch.errors.join("<br>"),
      });
    } else {
      message({
        type: "success",
        icon: "envelope alternate outline",
        content: `Arquivo ${file.name} importado com sucesso!`,
      });
    }
  };
  reader.readAsText(file);
}

function addObjectFromFile(text) {
  const arr = text.split("\n");
  const errors = [];
  arr.forEach((txt) => {
    const line = txt.trim().split(",");
    const number = line[0];
    const description = line.length > 1 ? line[1].trim() : "";
    const regex = /^[\w\d]{9,21}$/;
    if (regex.test(number)) {
      const item = new Item(number, description);
      saveTrackable(item);
    } else if (line.join().length) {
      errors.push(txt);
    }
  });
  return { errors: errors };
}

async function loadTrackItems(transitionItem, sorter) {
  const items = await getActiveItems(sorter);
  const trackItems = document.getElementById("trackItems");

  if (trackItems) {
    trackItems.innerHTML = renderTrackItems(items, sorter);
    $(".ui.dropdown").dropdown();
    $(".show-track-history").click((e) =>
      loadTrackHistory(
        e.target.parentElement.parentElement.dataset.referenceNumber,
        showTrackHistory
      )
    );
    $(".remove-trackable").click((e) =>
      removeTrackable(e.target.dataset.number)
    );
    $(".check-now").click(async (e) => {
      const referenceNumber = e.target.dataset.number;
      await doTracker(referenceNumber);
      highlightItemAfter({ referenceNumber });
    });
    $("#checkAll").click(checkAll);
    $(".archive-trackable").click((e) =>
      archiveTrackable(e.target.dataset.number)
    );
    updateCounters();
    momentFromNow();
    sortItems();

    const batch = document.querySelectorAll(".batch");
    const batchAction = document.getElementById("batchAction");

    batch.forEach((elm) => {
      elm.addEventListener("input", (e) => {
        const totalSelected =
          document.querySelectorAll(".batch:checked").length;
        batchAction.style.display = totalSelected ? "inline" : "none";

        e.target.checked
          ? e.target.parentElement.parentElement.classList.add("active-batch")
          : e.target.parentElement.parentElement.classList.remove(
              "active-batch"
            );
      });
    });

    $("#selectAll").click((e) => {
      var event = new Event("input");
      batch.forEach((elm) => {
        elm.checked = e.target.checked;
        elm.dispatchEvent(event);
      });
    });

    $("#archiveAll").click((_) => batchActions(archiveTrackable));
    $("#removeAll").click((_) => batchActions(removeTrackable));
  }

  if (transitionItem) {
    highlightItem(transitionItem);
  }
}

function batchActions(fn) {
  const batches = document.querySelectorAll(".batch:checked");
  batches.forEach((item) => fn(item.value));
}

async function doTracker(referenceNumber) {
  const user = await getUserProfile();
  if (!user) {
    showNoUserModal();
    return;
  }

  const item = await tracker(referenceNumber);

  if (await willNotify(item)) {
    notify(item);
  }

  renderActiveItems();
}

async function notify(item = new Item()) {
  createNotification(item);
  playSound("notification");
}

function highlightItemAfter({ referenceNumber, ttl = 500 }) {
  setTimeout(() => highlightItem(referenceNumber), ttl);
}

function showNoUserModal() {
  $("#nouser-modal").modal("show");
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await initializeSettings();
  renderActiveItems();
  applyTheme(settings.darkTheme);
  setInterval(() => momentFromNow(), 60000);
});

document.getElementById("theme").addEventListener("click", async (e) => {
  const settings = await getSettings();
  settings.darkTheme = e.target.checked;

  const save = {};
  save[defaultSettings.name] = JSON.stringify(settings);
  chrome.storage.sync.set(save);
  applyTheme(settings.darkTheme);
});

$(".menu a.item").click(function () {
  $(".menu .item.active").removeClass("active");
  $(this).addClass("active");
});

$("#archived-link").click(() => renderArchivedItems());
$("#active-items-link").click(() => renderActiveItems());
$("#settings-link").click(() => renderSettings());

$("#help-link").click(() => $("#help-modal").modal("show"));

chrome.runtime.onMessage.addListener((req, _sender, _response) => {
  if (req.action === messageActions.RELOAD_ACTIVE_ITEMS) {
    renderActiveItems();
  } else if (req.action === messageActions.USER_NOT_FOUND) {
    showNoUserModal();
  }
});
