const Item = function(referenceNumber, referenceDescription) {

  return {
    referenceNumber: referenceNumber,
    referenceDescription: referenceDescription,
    lastStatus: '',
    tracks: [],
    checkedAt: '',
    nextCheck: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours(), new Date().getMinutes()),
    setNextCheck: function(settings) {

      const baseDate = this.checkedAt || new Date();

      if(settings.checkUnitInterval === 'minute') {

        this.nextCheck.setMinutes(baseDate.getMinutes() + settings.checkInterval);
      }
      else if(settings.checkUnitInterval === 'hour') {

        this.nextCheck.setHours(baseDate.getHours() + settings.checkInterval);
      }
      else if(settings.checkUnitInterval === 'day') {

        this.nextCheck.setDate(baseDate.getDate() + settings.checkInterval);
      }
    }
  }

};

function trackerCallback(response) {

  trackable(response);

}

function trackable(response) {

  let tracks = [];
  const orderedHistory = response.historico.sort( (a, b) => strDateBRToISODate(a.data) - strDateBRToISODate(b.data) );

  for (let i=orderedHistory.length-1; i>=0; i--) {

    let track = {

      date: orderedHistory[i].data,
      details: orderedHistory[i].detalhes,
      place: orderedHistory[i].local,
      status: orderedHistory[i].situacao

    };

    tracks.push(track);
  }

  let item = new Item(response.codigo);
  item.lastStatus = tracks[0].status;
  item.checkedAt = new Date();
  item.tracks = tracks;

  saveTrackable(item);

  const options = {
    body: `Último status: ${item.lastStatus}\nVerificado às: ${formatDate(item.checkedAt)}`,
    icon: '../256x256.png'
   };

   chrome.storage.sync.get('settings', storage => {

    const settings = JSON.parse(storage.settings);

    if (settings.showNotification) {

      new Notification(`${item.referenceNumber} (${item.referenceDescription})`, options);
    }

   });

}

function trackerFailCallback(fail, referenceNumber) {

  if (fail.status === 404) {
    let item = new Item(referenceNumber);
    item.lastStatus = 'Objeto não encontrado';
    item.checkedAt = new Date();
    saveTrackable(item);

    const options = {
      body: `${item.lastStatus}\nVerificado às: ${formatDate(item.checkedAt)}`,
      icon: '../256x256.png'
     };

     new Notification(item.referenceNumber, options);
  }

}

function tracker(referenceNumber) {

  const url = `https://api.postmon.com.br/v1/rastreio/ect/${referenceNumber}`;

  $.get(url, trackerCallback).fail( (f) => trackerFailCallback(f, referenceNumber) );

}

function saveTrackable(item) {

  chrome.storage.sync.get(null, (storage) => {

    const settings = JSON.parse(storage.settings);
    let trackItems = [];

    item.setNextCheck(settings);

    if(storage.hasOwnProperty('trackItems')) {

      trackItems = JSON.parse(storage.trackItems);
    }

    const itemExists = trackItems.findIndex(oldItem => oldItem.referenceNumber === item.referenceNumber);

    if(itemExists >= 0) {
      item.referenceDescription = trackItems[itemExists].referenceDescription
      trackItems[itemExists] = item;
    }
    else {
      trackItems.push(item);
   }

  const save = {'trackItems': JSON.stringify(trackItems)};
  chrome.storage.sync.set(save, () => {

    chrome.runtime.sendMessage({action: 'loadTrackItems'});
    loadTrackItems();
  });

  });

}

function loadTrackItems() {

  getTrackItems().then( items => {

    const trackItems = document.getElementById('trackItems');

    if (trackItems) {

      trackItems.innerHTML = renderTrackItems(items);
      $('.show-track-history').click( (e) => loadTrackHistory(e.target.parentElement.parentElement.dataset.referenceNumber, showTrackHistory));
      $('.remove-trackable').click( (e) => removeTrackable(e.target.parentElement.parentElement.dataset.referenceNumber));
      $('.check-now').click( (e) => tracker(e.target.parentElement.parentElement.dataset.referenceNumber));
      $('#checkAll').click(checkAll);
    }

    $(trackItems).transition('bounce');

  });

}

function checkAll() {

  getTrackItems().then( items => {

    items.forEach( item => tracker(item.referenceNumber) );
  });


}

function getTrackItems() {

  const promise = new Promise( (resolve, reject) => {

    let trackItems = [];

    chrome.storage.sync.get('trackItems', storage => {

      if(storage.hasOwnProperty('trackItems')) {

        trackItems = JSON.parse(storage.trackItems, dateTimeReviver);

      }

      resolve(trackItems);

    });

  });

  return promise;
}
