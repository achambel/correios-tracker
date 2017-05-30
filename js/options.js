const defaultSettings = {
    name: 'settings',
    value: JSON.stringify(
      {
            checkInterval: 60,
            checkUnitInterval: 'minute',
            showNotification: true
      }
    )
};

function initializeSettings() {

  chrome.storage.sync.get(null, (storage) => {

    if(!storage.hasOwnProperty(defaultSettings.name)) {
        const settings = { 'settings': defaultSettings.value };
        chrome.storage.sync.set(settings);
    }

  });
}

function loadSettings() {
  
  chrome.storage.sync.get('settings', (storage) => {

    if(storage.hasOwnProperty(defaultSettings.name)) {
      
      const settings = JSON.parse(storage.settings);
      document.getElementById('checkInterval').value = settings.checkInterval;
      document.querySelector(`#checkUnitInterval option[value=${settings.checkUnitInterval}]`).selected = true;
      document.getElementById('showNotification').checked = settings.showNotification;
    }

  });
}

function message(text) {
  document.getElementById('message').textContent = text;
}

function saveSettings(e) {

  e.preventDefault();

  const settings = {
      checkInterval: parseInt(document.getElementById('checkInterval').value),
      checkUnitInterval: document.getElementById('checkUnitInterval').value,
      showNotification: document.getElementById('showNotification').checked
  };

  chrome.storage.sync.set({'settings': JSON.stringify(settings)}, function() {

    message('Settings saved');

  });

}

function saveReferenceNumber(e) {
  
  e.preventDefault();
  const referenceNumber = document.getElementById('referenceNumber').value.toUpperCase();
  const item = new Item(referenceNumber);
  saveTrackable(item);

}

function renderTrackItems(items) {

  let template = `
    <table>
      <thead>
        <th>Reference Number</th>
        <th>Via</th>
        <th>Checked at</th>
        <th>Status</th>
        <th>Date</th>
        <th>Trackpoint</th>
        <th>Details</th>
        <th>Next checking</th>
        <th>Actions</th>
      </thead>
      <tbody>
        {{lines}}
      </tbody>
      <tfoot>
        <tr><td colspan="7"><button id="checkAll">Check all now</button></td></tr>
      </tfoot>
    </table>
  `;

  const lines = items.map( item => {
    
    return  ` <tr>
                <td>${item.referenceNumber}</td>
                <td>${item.via}</td>
                <td>${formatDate(item.checkedAt)}</td>
                <td>${item.lastStatus}</td>
                <td>${item.tracks.length ? item.tracks[0].date + ' ' + item.tracks[0].time : ''}</td>
                <td>${item.tracks.length ? item.tracks[0].trackPoint : ''}</td>
                <td>details</td>
                <td>${formatDate(item.nextCheck)}</td>
                <td>
                  <button class="check-now" data-reference-number="${item.referenceNumber}">check now</button>
                  <button class="remove-trackable" data-reference-number="${item.referenceNumber}">remove</button>
                </td>
              </tr>
            `
  }).join('');

  if(lines) {

    template = template.replace(/{{lines}}/g, lines);
    
  }
  else {

    template = '<p>You have no item, please add one.</p>';
  }

  return template;

}

function loadTrackItems() {
  
  getTrackItems().then( items => {

    const trackItems = document.getElementById('trackItems');
    trackItems.innerHTML = renderTrackItems(items);
    $('.remove-trackable').click( (e) => removeTrackable(e.target.dataset.referenceNumber));
    $('.check-now').click( (e) => tracker(e.target.dataset.referenceNumber));
    $('#checkAll').click(checkAll);

  });

}

function removeTrackable(referenceNumber) {

  chrome.storage.sync.get('trackItems', storage => {

    const trackItems = JSON.parse(storage.trackItems);
    const itemIndex = trackItems.findIndex(oldItem => oldItem.referenceNumber === referenceNumber);
    
    if(itemIndex >= 0) {

      trackItems.splice(itemIndex, 1);
      const save = {'trackItems': JSON.stringify(trackItems)};
      chrome.storage.sync.set(save, loadTrackItems);    
    }
    
  })

}

document.addEventListener('DOMContentLoaded', () => {
  initializeSettings();
  loadSettings();
  loadTrackItems();
});

document.getElementById('formSaveReferenceNumber').addEventListener('submit', saveReferenceNumber);
document.getElementById('formSettings').addEventListener('submit', saveSettings);
