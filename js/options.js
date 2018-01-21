const defaultSettings = {
    name: 'settings',
    value: {
        checkInterval: 60,
        checkUnitInterval: 'minute',
        showNotification: true,
        checkRange: generateHourRange(),
        lastUpdated: new Date(),
        audioEnabled: true,
        darkTheme: true
    }
}

async function initializeSettings () {
  const settings = await getSettings()
  return new Promise((resolve, reject) => {
    let save = {}
    if (!settings) {
      save[defaultSettings.name] = JSON.stringify(defaultSettings.value)
      chrome.storage.sync.set(save)
      resolve(defaultSettings.value)
    } else {
      const merge = Object.assign(defaultSettings.value, settings)
      save[defaultSettings.name] = JSON.stringify(merge)
      chrome.storage.sync.set(save)
      resolve(merge)
    }

  })
}

function loadSettings (settings) {
  if (!settings) return
  document.getElementById('checkInterval').value = settings.checkInterval
  document.querySelector(`#checkUnitInterval option[value=${settings.checkUnitInterval}]`).selected = true
  document.getElementById('showNotification').checked = settings.showNotification
  renderRangeOptions(settings.checkRange)
  document.getElementById('settingsLastUpdated').textContent = settings.lastUpdated.toLocaleString()
  document.getElementById('audioEnabled').checked = settings.audioEnabled
  document.getElementById('theme').checked = settings.darkTheme
  applyTheme(settings.darkTheme)
}

function saveSettings(e) {

  e.preventDefault();

  const settings = {
      checkInterval: parseInt(document.getElementById('checkInterval').value),
      checkUnitInterval: document.getElementById('checkUnitInterval').value,
      showNotification: document.getElementById('showNotification').checked,
      checkRange: [].map.call(document.getElementById('range').selectedOptions, ele => parseInt(ele.value)),
      lastUpdated: new Date(),
      audioEnabled: document.getElementById('audioEnabled').checked
  };

  document.getElementById('settingsLastUpdated').textContent = settings.lastUpdated.toLocaleString();

  chrome.storage.sync.set({'settings': JSON.stringify(settings)}, function() {

    $('.ui.basic.modal .header').text('Mensagem');
    $('.ui.basic.modal .content').html('<h3>As configurações foram salvas com sucesso e surtirão efeito na próxima verificação!</h3>');
    $('.ui.basic.modal').modal('show');

  });

}

async function saveReferenceNumber (e) {

  e.preventDefault()
  const referenceNumberElement = document.getElementById('referenceNumber')
  const referenceNumber = referenceNumberElement.value.toUpperCase()
  const referenceDescriptionElement = document.getElementById('referenceDescription')
  const referenceDescription = referenceDescriptionElement.value
  
  let item = new Item(referenceNumber, referenceDescription)
  item = await saveTrackable(item)

  if (item) {
    const content = `Objeto <b>${item.referenceNumber} (${item.referenceDescription})</b> adicionado com sucesso!`
    message({type: 'positive', icon: 'smile', content: content})
  }
  
  referenceNumberElement.value = ''
  referenceDescriptionElement.value = ''

}

function renderTrackItems(items) {

  let template = `
    <table class="ui red striped table">
      <thead>
        <th>Objeto</th>
        <th>Verificado às</th>
        <th>Status</th>
        <th>Data</th>
        <th>Local</th>
        <th>Histórico</th>
        <th>Próxima verificação</th>
        <th colspan="2" class="center aligned">Ações</th>
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
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  const lines = items.map( item => {

    return  ` <tr data-reference-number="${item.referenceNumber}">
                <td>${item.referenceNumber} (${item.referenceDescription})</td>
                <td class="${item.checkRestriction ? 'check-restriction' : ''}"
                  title="${item.checkRestriction ? 'Não verificado porque havia restrição de hora configurada' : ''}">${formatDate(item.checkedAt)}</td>
                <td><span class="ui small ${statusesClass[item.lastStatus.split(' ').join('_').toUpperCase()] || 'primary'} label">${item.lastStatus}</span></td>
                <td>${item.tracks.length ? item.tracks[0].date : ''}</td>
                <td>${item.tracks.length ? item.tracks[0].place : ''}</td>
                <td>
                    <button class="ui labeled icon inverted tiny green button show-track-history">
                      <i class="clock icon"></i>
                      mostrar
                    </button>
                </td>
                <td>${formatDate(item.nextCheck)}</td>
                <td>
                  <button class="ui labeled icon inverted orange button check-now">
                    <i class="alarm icon"></i>
                    verificar
                  </button>
                </td>
                <td>
                  <button class="ui labeled icon inverted tiny red button remove-trackable">
                    <i class="trash icon"></i>
                    remover
                  </button>
                </td>
              </tr>
            `
  }).join('');

  if(lines) {

    template = template.replace(/{{lines}}/g, lines);

  }
  else {

    template = noObjects()
  }

  return template;

}

function renderTrackHistory(item) {

  let template = `
    <table class="ui red striped table">
      <caption class="ui red header">Número do Objeto: ${item.referenceNumber} (${item.referenceDescription})</caption>
      <thead>
        <th>Data</th>
        <th>Status</th>
        <th>Local</th>
        <th>Detalhes</th>
      </thead>
      <tbody>
        {{lines}}
      </tbody>
    </table>
  `;

  const lines = item.tracks.map( track => {
    return  `<tr>
                <td>${track.date}</td>
                <td>
                  <span class="ui small ${statusesClass[track.status.split(' ').join('_').toUpperCase()] || 'primary'} label">
                    ${track.status}
                  </span>
                </td>
                <td>${track.place}</td>
                <td>${track.details}</td>
              </tr>
            `
  }).join('');

  if(lines) {

    template = template.replace(/{{lines}}/g, lines);
  }

  else {

    template = '<h3>Não há histórico ainda!</h3>';
  }

  return template;

}

async function loadTrackHistory (referenceNumber, callback) {

  const items = await getItems()
  const itemFiltered = items.filter(item => item.referenceNumber === referenceNumber)
  if(itemFiltered.length) {
    if (typeof callback === 'function') callback(renderTrackHistory(itemFiltered[0]))
  }
}

function showTrackHistory(history) {
  $('.ui.basic.modal .header').text('Histórico');
  $('.ui.basic.modal .content').html(history);
  $('.ui.basic.modal').modal('show');
}

function removeTrackable (referenceNumber) {
  playSound('bin')
  $(`tr[data-reference-number=${referenceNumber}]`).transition('fly right')
  chrome.storage.sync.remove(referenceNumber)
}

function renderRangeOptions(checkRange) {

  let options = []

  generateHourRange().forEach(hour => {
    const hourFormatted = hour.toString().padStart(2, '0');
    const selected = checkRange.indexOf(hour) >= 0;

    options.push(`<option value="${hour}" ${selected ? 'selected' : ''}>${hourFormatted}h</option>`);
  });

  const select = document.getElementById('range');
  select.innerHTML = options.join('');
}

function generateHourRange() {

  let hours = [];

  for (let i=0; i<24; i++) {
    hours.push(i);
  }

  return hours;
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await initializeSettings()
  loadSettings(settings)
  loadTrackItems()

  const legacyItems = await getLegacyItems()
  migrateStorageStrategy('trackItems', legacyItems)
});

document.getElementById('formSaveReferenceNumber').addEventListener('submit', saveReferenceNumber);
document.getElementById('formSettings').addEventListener('submit', saveSettings);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'loadTrackItems') {
    loadTrackItems()
  } else if (request.action === 'openOptionsTab') {
    openOptionsTab(request.item)
  }

});

$('.ui.accordion').accordion();

document.getElementById('theme').addEventListener('click', async (e) => {
  const settings = await getSettings()
  settings.darkTheme = e.target.checked
  
  const save = {}
  save[defaultSettings.name] = JSON.stringify(settings)
  chrome.storage.sync.set(save)
  applyTheme(settings.darkTheme)
})
