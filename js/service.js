function trackerCallback(response) {

  const html = $.parseHTML(response);
  trackable(html);

}

function trackable(html) {
  
  const referenceNumber = $(html).find('dl.tnt-block-parcel dd').text();
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

  item = {

    referenceNumber: referenceNumber,
    via: via,
    tracks: tracks,
    checkedAt: new Date(),
    nextCheck: new Date()
  };

  saveTrackable(item);

} 

function tracker(referenceNumber = 'LB209070959GB') {
  // "LB209070959GB"
  const url = "https://www.royalmail.com/business/track-your-item";
  const data = {"parcel_tracking_number": referenceNumber};

  $.get(url, data, trackerCallback);

}

function saveTrackable(item) {

  chrome.storage.sync.get('settings', (storage) => {
     
     const settings = JSON.parse(storage.settings);

     if(settings.ckeckUnitInterval === 'minute') {

        item.nextCheck.setMinutes(item.nextCheck.getMinutes() + settings.checkInterval);
     
     }
     
     else if(settings.ckeckUnitInterval === 'hour') {

        item.nextCheck.setHours(item.checkedAt.getHours() + settings.checkInterval);
     
     }

     else if(settings.ckeckUnitInterval === 'day') {

        item.nextCheck.setDate(item.checkedAt.getDate() + settings.checkInterval);

     }

     const save = {'item': JSON.stringify(item)};
     chrome.storage.sync.set(save);



  });

}


