chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({'url': chrome.extension.getURL('../options.html')})
})

chrome.alarms.create('checkTrackerItems', 
	{
		when: Date.now(),
		periodInMinutes: 1
	}
)

chrome.alarms.onAlarm.addListener(async function (alarm) {

	if (alarm.name === 'checkTrackerItems') {
		const items = await getActiveItems()
		if (!items) return
		items.forEach((item, index) => {
			const scheduledTime = new Date(alarm.scheduledTime)
			const nextCheck = new Date(item.nextCheck)
			if (nextCheck <= scheduledTime) {
				tracker(item.referenceNumber)
			} else {
				console.info(`Alarm name: ${alarm.name}`)
				console.info(`Reference number: ${item.referenceNumber}`)
				console.info(`It's ${formatDate(scheduledTime)} and next checking should be at ${formatDate(item.nextCheck)}`)
			}
		})
	}

})