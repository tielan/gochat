var apn = require('apn');

/*   iOS 推送消息  
var options = {
  token: {
    key: "static/config/key.p8",
    keyId: "T0K3NK3Y1D",
    teamId: "T34M1D",
  },
  production: false,
};

var apnProvider = new apn.Provider(options);
   iOS 推送消息  */

//iOS 推送消息
exports.iOSpush = function (clientId, data) {
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.badge = 3;
    note.sound = "ping.aiff";
    note.alert = "You have a new message";
    note.payload = { 'messageFrom': 'John Appleseed' };
    apnProvider.send(note, clientId).then((result) => {
        // see documentation for an explanation of result
    });
}
exports.Androidpush = function (client, data) {
    if (client.clientId) {
        client.emit('subscribe', data);
    }
}