// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-112767555-1']);
_gaq.push(['_trackPageview']);

function renderLastTrackerItems(items) {
	if (!items.length) return noObjects()
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
					<td data-moment="${hasTracks(item) ? lastTrack(item).date : ''}"></td>
					<td>${hasTracks(item) ? lastTrack(item).place : ''}</td>
					<td data-moment="${item.nextCheck}"></td>
				</tr>`

	}).join('');

	if (lines) {
		template = template.replace(/{{lines}}/g, lines)
	} 
	return template
}

async function loadLastTrackerItems () {
	const items = await getActiveItems()
	document.getElementById('trackItems').innerHTML = renderLastTrackerItems(items)
	const settings = await getSettings()
	applyTheme(settings.darkTheme)
	momentFromNow()
}


document.getElementById('configureItems').addEventListener('click', () => {
	openOptionsTab()
});

loadLastTrackerItems()