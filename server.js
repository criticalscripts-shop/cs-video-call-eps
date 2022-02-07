const config = require('./config.js')
const http = require('http')

const turnServer = new (require('node-turn'))({
    authMech: 'long-term',
    realm: 'criticalscripts.shop',
    listeningPort: config.port,
    listeningIps: config.listeningIpAddress ? [config.listeningIpAddress] : null,
    relayIps: config.ipAddress ? [config.ipAddress] : null,
    externalIps: config.ipAddress ? [config.ipAddress] : null
})

let users = []

const webServer = http.createServer({}, async (req, res) => {
    if (req.method === 'POST' && req.headers['x-auth-key'] === config.authKey) {
        const buffers = []

        for await (const chunk of req)
            buffers.push(chunk)

        const data = Buffer.concat(buffers).toString()
        const json = JSON.parse(data)

        switch (json.type) {
            case 'add':
                if (json.username && json.password) {
                    users.push(json.username)
                    turnServer.addUser(json.username, json.password)
                }

                break

            case 'remove':
                if (json.username)
                    if (users.includes(json.username)) {
                        users.splice(users.indexOf(json.username), 1)
                        turnServer.removeUser(json.username)
                    }

                break

            case 'reset':
                for (let index = 0; index < users.length; index++)
                    turnServer.removeUser(users[index])

                users = []

                break
        }

        res.end()
    } else {
        res.writeHead(302, {
            'Location': 'https://criticalscripts.shop'
        })

        res.end()
    }
})

if (config.debugTurnPair)
    turnServer.addUser('criticalscripts', 'criticalscripts')

turnServer.start()
webServer.listen(config.port, config.listeningIpAddress, () => console.log(`[criticalscripts.shop] Video Call Proxy Server | Listening (${config.listeningIpAddress || '0.0.0.0'}:${config.port})`))
