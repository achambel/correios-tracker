import { getSettings } from "./backend.js";

function formatDate(date) {
  if (!date) return date;

  const language = window.navigator.language;
  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };

  return date.toLocaleDateString(language, options);
}

export function dateTimeReviver(_key, value) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  if (typeof value === "string" && dateFormat.test(value)) {
    return new Date(value);
  }

  return value;
}

export const statusesClass = {
  OBJETO_ENTREGUE_AO_DESTINATÁRIO: "green",
};

export function message(options) {
  let opt = {
    type: "info",
    icon: "info",
    content: "",
  };

  if (typeof options === "object") {
    opt = Object.assign(opt, options);
    const container = document.querySelector("#message-container");
    container.setAttribute("class", "ui icon message");
    container.classList.add(opt.type);

    const icon = document.querySelector("#message-icon");
    icon.setAttribute("class", `icon ${opt.icon}`);

    const content = document.querySelector("#message-content");
    content.innerHTML = opt.content;

    $(".message .close").on("click", function () {
      container.classList.add("hidden");
    });
  }
}

export async function playSound(type) {
  const settings = await getSettings();

  if (settings.audioEnabled) {
    let file = "../audio/cheerful.mp3";
    if (type === "bin") {
      file = "../audio/bin.mp3";
    } else if (type === "archive") {
      file = "../audio/archive.mp3";
    } else if (type === "restore") {
      file = "../audio/restore.mp3";
    }
    const audio = new Audio();
    audio.src = file;
    audio.play();
  }
}

export function highlightItem(item) {
  const tr = document.querySelector(`tr[data-reference-number="${item}"]`);
  if (!tr) return;
  tr.classList.add("recently-updated");
  setTimeout(() => {
    tr.classList.remove("recently-updated");
  }, 1000);
}

export function noObjects() {
  return `<div id="message-container" class="ui info icon message">
            <i class="info icon"></i>
            <div class="content">
              <p>Vamos lá, comece adicionando um objeto para rastrear!</p>
            </div>
          </div>`;
}

export function applyTheme(darkTheme) {
  const href = `css/themes/dark.css`;
  const link = document.querySelector(`link[href="${href}"]`);

  if (!link && darkTheme) {
    const tag = document.createElement("link");
    tag.rel = "stylesheet";
    tag.type = "text/css";
    tag.href = href;
    document.head.appendChild(tag);
  } else if (link) {
    link.remove();
  }
  const elm = document.getElementById("theme");
  if (elm) elm.checked = darkTheme;
}

export function sort(items, prop, order) {
  if (!items.length) return [];

  items.sort((a, b) => {
    const isDate = Date.parse(a[prop]);
    if (order === "asc") {
      return isDate
        ? Date.parse(a[prop]) - Date.parse(b[prop])
        : a[prop] > b[prop];
    } else if (order === "desc") {
      return isDate
        ? Date.parse(b[prop]) - Date.parse(a[prop])
        : b[prop] > a[prop];
    } else {
      throw new Error("You should define the order for sort the items");
    }
  });

  return items;
}

export function momentFromNow() {
  $("[data-moment]").each(function () {
    const date = this.dataset.moment;
    const formatted = this.dataset.formatted;
    if (date) {
      const current = moment(new Date(date));
      const text =
        formatted !== undefined
          ? current.format("DD/MM/YYYY HH:mm") + " - " + current.fromNow()
          : current.fromNow();
      $(this).text(text);
    }
  });
}

export function hasTracks(item) {
  return item.tracks.length > 0;
}

export function lastTrack(item) {
  return item.tracks[0];
}

export function isEmpty(obj = {}) {
  return Object.keys(obj).length === 0;
}
