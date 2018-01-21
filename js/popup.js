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

	if (lines) {
		template = template.replace(/{{lines}}/g, lines)
	} else {
		template = noObjects()
	}
  	return template
}

async function loadLastTrackerItems () {
	const items = await getItems()
	document.getElementById('trackItems').innerHTML = renderLastTrackerItems(items)
	const settings = await getSettings()
	applyTheme(settings.darkTheme)
}


document.getElementById('configureItems').addEventListener('click', () => {
	openOptionsTab()
});

loadLastTrackerItems()