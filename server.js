const config = require('./config.js')
const turn = require('node-turn')
const http = require('http')
const https = require('https')
const fetch = require('node-fetch')
const crypto = require('crypto')
const server = new (require('socket.io'))()

const turnServer = new turn({
    authMech: 'long-term',
    realm: 'criticalscripts.shop',
    listeningPort: config.proxyPort,
    listeningIps: config.listeningIpAddress ? [config.listeningIpAddress] : null,
    relayIps: config.proxyIpAddress ? [config.proxyIpAddress] : null,
    externalIps: config.proxyIpAddress ? [config.proxyIpAddress] : null
})

if (config.debugTurnPair)
    turnServer.addUser('criticalscripts', 'criticalscripts')

const webServer = config.httpsWebSocket.host ? https.createServer({
    key: fs.readFileSync(config.httpsWebSocket.keyPath),
    cert: fs.readFileSync(config.httpsWebSocket.certPath)
}, (req, res) => {
    res.writeHead(302, {
        'Location': 'https://criticalscripts.shop'
    })

    res.end()
}) : http.createServer({}, (req, res) => {
    res.writeHead(302, {
        'Location': 'https://criticalscripts.shop'
    })

    res.end()
})

const activeTransmissions = {}

class PeerProxy {
    constructor(socket, closeCallback) {
        this.socket = socket
        this.onCloseCallback = closeCallback

        this.calleeSocketId = null
        this.remotePeerConnected = false

        turnServer.addUser(this.socket.id, 'criticalscripts')

        this.socket.on('transmission-callee', calleeSocketId => {
            if (this.calleeSocketId && peerDataBySocket[this.calleeSocketId])
                peerDataBySocket[this.calleeSocketId].onRemotePeerDisconnected()

            this.calleeSocketId = calleeSocketId

            if (peerDataBySocket[this.calleeSocketId])
                peerDataBySocket[this.calleeSocketId].onRemotePeerConnected()
        })

        this.socket.on('transmission-stop', () => {
            if (this.calleeSocketId !== null)
                server.to(this.calleeSocketId).emit('stream-stop')

            if (activeTransmissions[this.socket.id])
                delete activeTransmissions[this.socket.id]
        })

        this.socket.on('transmission-offer', offer => {
            if (this.calleeSocketId !== null)
                server.to(this.calleeSocketId).emit('stream-offer', offer)

            if (config.maxActiveTransmissions && Object.values(activeTransmissions).length >= config.maxActiveTransmissions) {
                console.error(`[criticalscripts.shop] A peer transmission offer was rejected due to max active transmissions exhaustion.`)
                this.socket.emit('transmission-rejected')
                return
            }

            activeTransmissions[this.socket.id] = true
        })

        this.socket.on('transmission-ice-candidate', e => this.calleeSocketId !== null && server.to(this.calleeSocketId).emit('stream-ice-candidate', e))
        this.socket.on('stream-ice-candidate', e => this.calleeSocketId !== null && server.to(this.calleeSocketId).emit('transmission-ice-candidate', e))
        this.socket.on('stream-answer', answer => this.calleeSocketId !== null && server.to(this.calleeSocketId).emit('transmission-answer', answer))
    }

    onRemotePeerConnected() {
        if (this.remotePeerConnected)
            return

        this.remotePeerConnected = true
        this.socket.emit('remote-peer-connected')

        if (this.calleeSocketId && peerDataBySocket[this.calleeSocketId])
            peerDataBySocket[this.calleeSocketId].onRemotePeerConnected()
    }

    onRemotePeerDisconnected() {
        if (!this.remotePeerConnected)
            return

        this.remotePeerConnected = false
        this.socket.emit('remote-peer-disconnected')

        if (this.calleeSocketId && peerDataBySocket[this.calleeSocketId])
            peerDataBySocket[this.calleeSocketId].onRemotePeerDisconnected()
    }

    fatalError(error) {
        if (typeof(error) ==='object' && error.type === 'icecandidateerror' && error.errorCode === 701)
            return

        this.socket.emit('peer-disconnect')
        this.close()
    }

    close() {
        if (this.calleeSocketId !== null)
            server.to(this.calleeSocketId).emit('stream-stop')

        if (this.calleeSocketId && peerDataBySocket[this.calleeSocketId])
            peerDataBySocket[this.calleeSocketId].onRemotePeerDisconnected()

        this.onCloseCallback()

        if (activeTransmissions[this.socket.id])
            delete activeTransmissions[this.socket.id]

        turnServer.removeUser(this.socket.id)

        this.socket.removeAllListeners('transmission-callee')
        this.socket.removeAllListeners('transmission-stop')
        this.socket.removeAllListeners('transmission-offer')
        this.socket.removeAllListeners('transmission-ice-candidate')
        this.socket.removeAllListeners('stream-ice-candidate')
        this.socket.removeAllListeners('stream-answer')
    }
}

const peerDataBySocket = {}
const verifiedSockets = {}

server.on('connection', socket => {
    socket.on('verify', (id, source, endpoint) => {
        let activeEndpoint = null

        for (let index = 0; index < config.allowedServers.length; index++)
            if (endpoint === config.allowedServers[index]) {
                activeEndpoint = endpoint
                break
            }

        if ((!activeEndpoint) && config.authKey)
            activeEndpoint = endpoint

        if (activeEndpoint)
            fetch(`http://${config.staticServerOverride ? config.staticServerOverride : activeEndpoint}/${config.resourceName || 'cs-video-call'}/verify`, {
                method: 'POST',

                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    id,
                    source,
                    key: config.authKey
                })
            }).then(res => {
                if (res.ok) {
                    verifiedSockets[socket.id] = true
                    socket.emit('verified')
                } else {
                    console.error(`[criticalscripts.shop] Peer "${socket.handshake.address}" could not be verified due to server rejection (${response.text().trim() || 'Unknown Body'}).`)

                    if (peerDataBySocket[socket.id])
                        peerDataBySocket[socket.id].fatalError('The peer could not be verified.')
                }
            }).catch(error => {
                console.error(`[criticalscripts.shop] Peer "${socket.handshake.address}" could not be verified due to an unhandled error.`, error)

                if (peerDataBySocket[socket.id])
                    peerDataBySocket[socket.id].fatalError('The peer could not be verified.')
            })
        else {
            console.error(`[criticalscripts.shop] Peer "${socket.handshake.address}" could not be verified due to endpoint mismatch with "${endpoint}".`)

            if (peerDataBySocket[socket.id])
                peerDataBySocket[socket.id].fatalError('The peer could not be verified.')
        }
    })

    socket.on('peer-connect', () => verifiedSockets[socket.id] && (!peerDataBySocket[socket.id]) && (peerDataBySocket[socket.id] = new PeerProxy(socket, () => delete peerDataBySocket[socket.id])))
    socket.on('peer-disconnect', () => peerDataBySocket[socket.id] && peerDataBySocket[socket.id].close())

    socket.on('disconnect', () => {
        if (peerDataBySocket[socket.id])
            peerDataBySocket[socket.id].close()

        if (verifiedSockets[socket.id])
            delete verifiedSockets[socket.id]
    })
})

turnServer.start()
webServer.listen(config.proxyPort, config.listeningIpAddress, () => console.log(`[criticalscripts.shop] Video Call Proxy Server Listening (${config.listeningIpAddress || '0.0.0.0'}:${config.proxyPort})`))
server.listen(webServer)
