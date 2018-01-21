function formatDate(date) {
  
  if(!date) return date;

  const language = window.navigator.language;
  const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };

  return date.toLocaleDateString(language, options);

}

function dateTimeReviver(key, value) {
  
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  
  if (typeof value === "string" && dateFormat.test(value)) {
        return new Date(value);
  }
    
  return value;
}

function strDateBRToISODate(str) {
  
  const arr = str.split(" ");
  
  return Date.parse(
      arr[0]
        .split("/")
        .reverse()
        .join("-") + "T" + arr[1]);

}

const statusesClass = {
	OBJETO_ENTREGUE_AO_DESTINATÁRIO: 'green'
}

function message (options) {
  let opt = {
    type: 'info',
    icon: 'info',
    content: ''
  }

  if (typeof options === 'object') {
    opt = Object.assign(opt, options)
    const container = document.querySelector('#message-container')
    container.classList.add(opt.type)
    container.classList.remove('hidden')

    const icon = document.querySelector('#message-icon')
    icon.classList.add(opt.icon)

    const content = document.querySelector('#message-content')
    content.innerHTML = opt.content

    $('.message .close').on('click', function() {
      container.classList.add('hidden')
    })
  }
}

async function playSound (type) {
  const settings = await getSettings()

  if (settings.audioEnabled) {
    const file = type === 'bin' ? '../audio/bin.mp3' : '../audio/cheerful.mp3'
    const audio = new Audio()
    audio.src = file
    audio.play()
  }
}

function showNotification(item) {
  const options = {
    body: `${item.lastStatus}\nVerificado às: ${formatDate(item.checkedAt)}`,
    icon: '../256x256.png'
   }
  const notification = new Notification(item.referenceNumber, options)
  notification.onclick = function (event) {
    event.preventDefault()
    chrome.runtime.sendMessage({action: 'openOptionsTab', item: item})
    openOptionsTab(item)
  }
}

function highlightItem (item) {
  if (!item) return
  const tr = document.querySelector(`tr[data-reference-number="${item}"]`)
  tr.classList.add('recently-updated')
  setTimeout(() => {
    tr.classList.remove('recently-updated')
  }, 1000)
} 

function openOptionsTab (item) {
  chrome.tabs.query({url: chrome.extension.getURL('options.html')}, tabs => {
    if (tabs.length) {
      const tab = tabs[0]
      chrome.tabs.update(tab.id, {active: true}, function () {
        highlightItem(item.referenceNumber)
      })
    } else {
      chrome.tabs.create({url: chrome.extension.getURL('../options.html')})
      setTimeout(() => console.log('bla'), 2000)
    }
  })
}

function noObjects () {
  return `<div id="message-container" class="ui info icon message">
            <i class="info icon"></i>
            <div class="content">
              <p>Vamos lá, comece adicionando um objeto para rastrear!</p>
            </div>
          </div>`
}

function applyTheme (darkTheme) {
  const href = `css/themes/dark.css`
  const link = document.querySelector(`link[href="${href}"]`)

  if (!link && darkTheme) {
    const tag = document.createElement('link')
    tag.rel = 'stylesheet' 
    tag.type = 'text/css'
    tag.href = href
    document.head.appendChild(tag)
  } else if (link) {
    link.remove()
  }
}

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-112767555-1']);
_gaq.push(['_trackPageview']);