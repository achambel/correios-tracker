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

function dateTimeReviver(key, value) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  if (typeof value === "string" && dateFormat.test(value)) {
    return new Date(value);
  }

  return value;
}

const statusesClass = {
  OBJETO_ENTREGUE_AO_DESTINATÁRIO: "green",
};

function message(options) {
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

async function playSound(type) {
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

function showNotification(item) {
  const options = {
    body: `${item.lastStatus}\nVerificado às: ${formatDate(item.checkedAt)}`,
    icon: "../256x256.png",
  };

  const description = item.referenceDescription
    ? `(${item.referenceDescription})`
    : "";
  const title = `${item.referenceNumber} ${description}`;

  const notification = new Notification(title, options);
  notification.onclick = function (event) {
    event.preventDefault();
    chrome.runtime.sendMessage({ action: "openOptionsTab", item: item });
    openOptionsTab(item);
  };
}

function highlightItem(item) {
  const tr = document.querySelector(`tr[data-reference-number="${item}"]`);
  if (!tr) return;
  tr.classList.add("recently-updated");
  setTimeout(() => {
    tr.classList.remove("recently-updated");
  }, 1000);
}

function openOptionsTab(item) {
  chrome.tabs.query(
    { url: chrome.extension.getURL("options.html") },
    (tabs) => {
      if (tabs.length) {
        const tab = tabs[0];
        chrome.tabs.update(tab.id, { active: true }, function () {
          highlightItem(item.referenceNumber);
        });
      } else {
        chrome.tabs.create({ url: chrome.extension.getURL("../options.html") });
      }
    }
  );
}

function noObjects() {
  return `<div id="message-container" class="ui info icon message">
            <i class="info icon"></i>
            <div class="content">
              <p>Vamos lá, comece adicionando um objeto para rastrear!</p>
            </div>
          </div>`;
}

function applyTheme(darkTheme) {
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

function sort(items, prop, order) {
  if (!items.length) return [];

  items.sort((a, b) => {
    const isDate = moment(a[prop]).isValid();
    if (order === "asc") {
      return isDate ? moment(a[prop]).diff(moment(b[prop])) : a[prop] > b[prop];
    } else if (order === "desc") {
      return isDate ? moment(b[prop]).diff(moment(a[prop])) : b[prop] > a[prop];
    } else {
      throw new Error("You should define the order for sort the items");
    }
  });

  return items;
}

function momentFromNow() {
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

function hasTracks(item) {
  return item.tracks.length > 0;
}

function firstTrack(item) {
  if (hasTracks(item)) {
    const index = item.tracks.length - 1;
    return item.tracks[index];
  }
}

function lastTrack(item) {
  return item.tracks[0];
}
