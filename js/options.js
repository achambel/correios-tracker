let defaultSettings = {
    name: 'settings',
    value: JSON.stringify(
      {
            checkInterval: 60,
            ckeckUnitInterval: 'minute',
            showNotification: true
      }
    )
};

function initializeSettings() {

  chrome.storage.sync.get(null, function(item) {

    if(!item.hasOwnProperty(defaultSettings.name)) {
        const settings = { 'settings': defaultSettings.value };
        chrome.storage.sync.set(settings);
    }

  });
}

function message(text) {
  document.getElementById('message').textContent = text;
}

function saveSettings(e) {

  e.preventDefault();

  const settings = {
      checkInterval: document.getElementById('checkInterval').value,
      ckeckUnitInterval: document.getElementById('ckeckUnitInterval').value,
      showNotification: document.getElementById('showNotification').checked
  };

  chrome.storage.sync.set({'settings': JSON.stringify(settings)}, function() {

    message('Settings saved');

  });

}

document.addEventListener('DOMContentLoaded', initializeSettings);
document.getElementById('formSettings').addEventListener('submit', saveSettings);
