// Critical Scripts | https://criticalscripts.shop

module.exports = {
    // The port the proxy server will listen to, this port needs to be allowed in the proxy server's firewall on both TCP and UDP protocols.
    port: 34540,

    // The IP address the proxy server will listen to, leave this to null to automatically listen on all network interfaces.
    listeningIpAddress: null,

    // The public IP address of the proxy server the clients will use to connect to, leaving this to null will work in most cases otherwise set your proxy server's public IP address.
    ipAddress: null,

    // This is the authentication key, the exact same needs to be set in the resource's config so they match up.
    authKey: null,

    // If set to true, will add a 'criticalscripts:criticalscripts' credentials pair to the TURN server that it can be used to check the connectivity of it.
    debugTurnPair: false
}
