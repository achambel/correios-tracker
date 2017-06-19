function renderLastTrackerItems(items) {

	let template = `
		<table class="ui red striped table">
			<thead>
				<th>Objeto</th>
				<th>Status</th>
				<th>Data</th>
				<th>Local</th>
				<th>Próxima verificação</th>
			</thead>
			<tbody>
				{{lines}}
			</tbody>
		</table>
	`;

	const lines = items.map( item => {

		return `<tr>
					<td>${item.referenceNumber} (${item.referenceDescription})</td>
					<td><span class="ui small ${statusesClass[item.lastStatus.split(' ').join('_').toUpperCase()] || 'primary'} label">${item.lastStatus}</span></td>
					<td>${item.tracks.length ? item.tracks[0].date : ''}</td>
					<td>${item.tracks.length ? item.tracks[0].place : ''}</td>
                	<td>${formatDate(item.nextCheck)}</td>
				</tr>`

	}).join('');

	if(lines) {

		template = template.replace(/{{lines}}/g, lines);
	}
	else {
		template = '<div class="ui info message"><p>Não há objetos a rastrear ainda, por favor click no botão abaixo para configurar um.</p></div>';
	}

  	return template;

}

function loadLastTrackerItems() {

	getTrackItems().then( (items) => {

		document.getElementById('trackItems').innerHTML = renderLastTrackerItems(items);
	});
}


document.getElementById('configureItems').addEventListener('click', () => {
	chrome.tabs.create({'url': chrome.extension.getURL('../options.html')});
});

loadLastTrackerItems();
