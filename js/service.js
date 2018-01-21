const Item = function (referenceNumber, referenceDescription) {
  const now = new Date()
  return {
    referenceNumber: referenceNumber,
    referenceDescription: referenceDescription,
    lastStatus: '',
    lastStatusDate: '',
    statusChanged: false,
    tracks: [],
    checkedAt: '',
    checkRestriction: false,
    nextCheck: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()),
    setNextCheck: function(settings) {

      const baseDate = this.checkedAt || new Date()

      if (settings.checkUnitInterval === 'minute') {
        this.nextCheck.setMinutes(baseDate.getMinutes() + settings.checkInterval)
      } else if(settings.checkUnitInterval === 'hour') {
        this.nextCheck.setHours(baseDate.getHours() + settings.checkInterval)
      } else if(settings.checkUnitInterval === 'day') {
        this.nextCheck.setDate(baseDate.getDate() + settings.checkInterval)
      }
    }
  }
}

function trackerCallback (response) {
  trackable(response)
}

async function trackable (response) {
  let tracks = []
  const orderedHistory = response.historico.sort((a, b) => {
    return strDateBRToISODate(a.data) - strDateBRToISODate(b.data)
  })

  for (let i=orderedHistory.length-1; i>=0; i--) {
    let track = {
      date: orderedHistory[i].data,
      details: orderedHistory[i].detalhes,
      place: orderedHistory[i].local,
      status: orderedHistory[i].situacao
    }
    tracks.push(track)
  }

  let item = new Item(response.codigo)
  item.lastStatus = tracks[0].status
  item.lastStatusDate = tracks[0].date
  item.checkedAt = new Date()
  item.tracks = tracks
  item = await saveTrackable(item)
  
  const settings = await getSettings()
  if (settings.showNotification && item.statusChanged) {
    showNotification(item)
    playSound('notification')
  }
}

async function trackerFailCallback (fail, referenceNumber) {
  if (fail.status === 404) {
    let item = new Item(referenceNumber)
    item.lastStatus = 'Objeto não encontrado'
    item.checkedAt = new Date()
    await saveTrackable(item)
    showNotification(item)
    playSound('notification')
  }
}

async function tracker (referenceNumber) {
    const settings = await getSettings()
    const now = new Date()
    if (!settings.checkRange.includes(now.getHours())) {
      const restrictions = settings.checkRange.join(', ')
      console.info(`Horário ${now.toLocaleString()} está restrito para verificação.
      Configurado para permitir apenas nessas horas: ${restrictions}`)
      updateItemWithRestriction(referenceNumber)
      return
    }

    const url = `https://api.postmon.com.br/v1/rastreio/ect/${referenceNumber}`
    $.get(url, trackerCallback).fail((f) => trackerFailCallback(f, referenceNumber))
}

async function updateItemWithRestriction (referenceNumber) {
  const item = await getItem(referenceNumber)
  if (item) {
    item.checkedAt = new Date()
    item.checkRestriction = true
    saveTrackable(item)
  }
}

async function saveTrackable (item) {
  const settings = await getSettings()
  if (typeof item.setNextCheck === 'function') {
    item.setNextCheck(settings)
  }

  const itemExisting = await getItem(item.referenceNumber)
  if (itemExisting) {
    item.referenceDescription = itemExisting.referenceDescription
    item.statusChanged = itemExisting.lastStatusDate != item.lastStatusDate
    item = Object.assign(itemExisting, item)
  }
    
  const save = {}
  save[item.referenceNumber] = JSON.stringify(item)
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(save, () => {
      if (chrome.runtime.lastError) {
        message({type: 'negative', icon: 'frown', content: chrome.runtime.lastError.message})
        return reject(false)
      }
      chrome.runtime.sendMessage({action: 'loadTrackItems'})
      loadTrackItems(item.referenceNumber)
      return resolve(item)
    })
  })
  
}

async function loadTrackItems (transitionItem) {
  const items = await getItems()
  const trackItems = document.getElementById('trackItems')

  if (trackItems) {
    trackItems.innerHTML = renderTrackItems(items)
    $('.show-track-history').click( (e) => loadTrackHistory(e.target.parentElement.parentElement.dataset.referenceNumber, showTrackHistory))
    $('.remove-trackable').click( (e) => removeTrackable(e.target.parentElement.parentElement.dataset.referenceNumber))
    $('.check-now').click( (e) => tracker(e.target.parentElement.parentElement.dataset.referenceNumber))
    $('#checkAll').click(checkAll)
  }

  if (transitionItem) {
    highlightItem(transitionItem)
  }
}

async function checkAll() {
  const items = await getItems()
  items.forEach(item => tracker(item.referenceNumber))
}

function migrateStorageStrategy(key, legacyItems) {
  // until version 0.4 items were storaged like that:
  // {trackItems: [Item]}
  // There were a limit of 8,192 bytes per item.
  // Find by QUOTA_BYTES_PER_ITEM on https://developer.chrome.com/apps/storage#property-sync
  legacyItems.forEach((item, index) => {
    // timeout necessary because restriction MAX_WRITE_OPERATIONS_PER_MINUTE
    // 2 per second. :(
    setTimeout(() => saveTrackable(item), 500 * index)
  });
  chrome.storage.sync.remove(key)
}

async function getSettings () {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('settings', storage => {
      if (storage.settings) {
        resolve(JSON.parse(storage.settings, dateTimeReviver))
      } else {
        resolve(false)
      }
    })
  })
}

async function getItems () {
  let trackItems = [];
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, storage => {
      const regex = /^[\w\d]{9,21}$/
      
      for (const [key, value] of Object.entries(storage)) {
        if (regex.test(key)) {
          const item = JSON.parse(value, dateTimeReviver);
          if (item.hasOwnProperty('referenceNumber')) {
            trackItems.push(item)
          }
        }
      }

      resolve(trackItems)

    })
  })
}

async function getLegacyItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('trackItems', storage => {
      if (storage.trackItems) {
        resolve(JSON.parse(storage.trackItems))
      } else {
        resolve([])
      }
    });
  })
}

async function getItem (referenceNumber) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(referenceNumber, storage => {
      if (storage[referenceNumber]) {
        resolve(JSON.parse(storage[referenceNumber]))
      } else {
        resolve(false)
      }
    })
  })
}
