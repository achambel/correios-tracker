chrome.storage.sync.clear();

var trackItems = [
  new Item('RS901944672CH', 'Cabo C 3m'), 
  new Item('RX193810496CH', 'Case Jogo'),
  new Item('RY595521904CN', 'Capa Switch'),
  new Item('RL744535326CN', 'Pendrive'),
  new Item('RM281573435CN', 'Cabo'),
  new Item('RY659645775CN', 'Cabos'),
  new Item('RT391321014HK', 'Capa Gamepad S'),
  new Item('RY662264732CN', 'Capa Gamepad R'),
  new Item('RY658021425CN', 'Pendrive')
];

var save = {'trackItems': JSON.stringify(trackItems)};

chrome.storage.sync.set(save, () => console.log('saved!'));