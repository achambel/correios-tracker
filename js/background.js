chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({'url': chrome.extension.getURL('../options.html')})
})

chrome.alarms.onAlarm.addListener(async function(alarm) {
  
  if (alarm.name === 'checkTrackerItems') {
    const items = await getItems()
		items.forEach(item => {
			const scheduledTime = new Date(alarm.scheduledTime)
			if (item.nextCheck <= scheduledTime) {
				tracker(item.referenceNumber)
			} else {
				console.info(`Alarm name: ${alarm.name}`)
				console.info(`Reference number: ${item.referenceNumber}`)
				console.info(`It's ${formatDate(scheduledTime)} and next checking should be at ${formatDate(item.nextCheck)}`)
			}
		})
  }

})

chrome.alarms.create('checkTrackerItems', {periodInMinutes: 1})