const Item = function(referenceNumber) {
  
  return {
    referenceNumber: referenceNumber,
    lastStatus: '',
    via: '',
    tracks: [],
    checkedAt: '',
    nextCheck: new Date(),
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

  const html = $.parseHTML(response);
  trackable(html);

}

function trackable(html) {
  
  const referenceNumber = $(html).find('dl.tnt-block-parcel dd').text();
  const lastStatus = $(html).find("dd.tnt-item-status").text();
  const via = $(html).find('dl.tnt-block-service dd span.description').text('').parent().text().trim();
  const history = $(html).find('table.tnt-tracking-history tbody tr');
  let tracks = [];

  $(history).each( (index, tr) => {

    let track = {

        date: $(tr).find('td:eq(0)').text(),
        time: $(tr).find('td:eq(1)').text(),
        status: $(tr).find('td:eq(2)').text(),
        trackPoint: $(tr).find('td:eq(3)').text()

    };

    tracks.push(track);

  });

  let item = new Item(referenceNumber);
  item.lastStatus = lastStatus;
  item.checkedAt = new Date();
  item.via = via;
  item.tracks = tracks;

  saveTrackable(item);

  const options = {
    body: `Last status: ${item.lastStatus}\nChecked at: ${formatDate(item.checkedAt)}`
   };

   new Notification(item.referenceNumber, options);

} 

function tracker(referenceNumber) {

  const url = "https://www.royalmail.com/business/track-your-item";
  const data = {"parcel_tracking_number": referenceNumber};

  $.get(url, data, trackerCallback);

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

      trackItems[itemExists] = item;
    } 
    else {
      trackItems.push(item);
   }

   const save = {'trackItems': JSON.stringify(trackItems)};
   chrome.storage.sync.set(save, loadTrackItems);

  });

}

function checkAll() {

  getTrackItems().then( items => {

    items.forEach( item => tracker(item.referenceNumber) );
  })

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