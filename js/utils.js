function formatDate(date) {
  
  if(!date) return date;

  const language = window.navigator.language;
  const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };

  return date.toLocaleDateString(language, options);

}

function dateTimeReviver(key, value) {
  
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  
  if (typeof value === "string" && dateFormat.test(value)) {
        return new Date(value);
  }
    
  return value;
}

const statusesClass = {
	DELIVERED: 'green'
}