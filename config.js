// Critical Scripts | https://criticalscripts.shop

module.exports = {
    // The public IP address of the proxy server the clients will use to connect to, leaving this to null will work in most cases otherwise set your proxy server's public IP address.
    'proxyIpAddress': null,

    // The port the proxy server will listen to, this port needs to be allowed in the proxy server's firewall on both TCP and UDP protocols.
    'proxyPort': 34540,

    // The IP address the proxy server will listen to, leave this to null to automatically listen on all network interfaces.
    'listeningIpAddress': null,

    // Whether to use / host the WebSocket server as HTTPS or not for the proxy server. This is required if your phone resource is using "cerulean" FX version.
    // Hosting the WebSocket server as HTTPS will require a signed key and a signed certificate. Self-signing will not work.
    'httpsWebSocket': {
        'use': false,
        'keyPath': null,
        'certPath': null
    },

    // An array of the FiveM servers that their players are allowed to pass through this proxy server in the form of 'IP:Port'.
    'allowedServers': [],

    // If your players connect to your FiveM server via a reverse proxy that assigns them a dynamic IP address you can use an authentication key instead.
    // The exact same authentication key needs to be set in the resource's config so they match up.
    'authKey': null,

    // If your FiveM server is behind an internal network and you want the proxy server to access it without considering the players' endpoint, set it here in the form of 'IP:Port'. 
    'staticServerOverride': null,

    // This is the maximum count of active transmissions allowed at once, you can use this to limit the maximum network consumption the proxy server has.
    // Each active transmission consumes approximately 2mbps download and 2mbps upload.
    // A video call where both clients have their camera open is considered as two active transmissions.
    // For example a value of 64 would be a rough limit of 128mbps upload / 128mbps download to be at most consumed by the proxy server.
    // Setting this option to null will allow an unlimited amount of active transmissions.
    'maxActiveTransmissions': null,

    // If you have renamed the resource to anything other than its original name type its new name here, otherwise leave this null.
    'resourceName': null,

    // If set to true, will add a 'criticalscripts:criticalscripts' credentials pair to the TURN server that it can be used to check the connectivity of it.
    'debugTurnPair': false
}
