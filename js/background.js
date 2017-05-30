chrome.alarms.onAlarm.addListener(function( alarm ) {
  
  console.log("Got an alarm!", alarm);
  
  if(alarm.name === 'checkTrackerItems') {
  	// todo
  }
});

chrome.alarms.create('checkTrackerItems', {periodInMinutes: 1});