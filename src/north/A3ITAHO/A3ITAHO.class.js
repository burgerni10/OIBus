const net = require('net')
const { CallRequest } = require('node-opcua-client')
const ApiHandler = require('../ApiHandler.class')

class A3ITAHO extends ApiHandler {
  static category = 'IoT'

  /**
   * Constructor for A3ITAHO
   * @constructor
   * @param {Object} applicationParameters - The application parameters
   * @param {BaseEngine} engine - The Engine
   * @return {void}
   */
  constructor(applicationParameters, engine) {
    super(applicationParameters, engine)
    const { host, port } = applicationParameters.A3ITAHO
    this.host = host
    this.port = port
    this.sentValues = {}
    this.canHandleValues = true
    this.canHandleFiles = false
  }

  /**
   * Handle messages by sending them to another OIBus
   * @param {object[]} values - The values
   * @return {Promise} - The handle status
   */
  async handleValues(values) {
    let payload = ''
    values.forEach((value) => {
      if (this.sentValues[value.pointId] !== value.data.value) {
        this.sentValues[value.pointId] = value.data.value
        payload += String.fromCharCode(parseInt(value.data.value, 10))
      }
    })
    if(payload.length > 0){
      this.socket.write(payload)
    }
    return values.length
  }

  /**
   * Initiates a connection for every data source to the right host and port.
   * @return {void}
   */
   async connect() {
    this.connectToTCPServer()
  }

    /**
   * Close the connection
   *
   * @return {void}
   */
     async disconnect() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      if (this.connected) {
        this.socket.end()
        this.connected = false
      }
      await super.disconnect()
    }

    connectToTCPServer() {
      this.reconnectTimeout = null
      this.socket = new net.Socket()
      this.socket.connect(
        { host: this.host, port: this.port },
        () => {
          super.connect()
          this.updateStatusDataStream({ 'Connected at': new Date().toISOString() })
        },
      )
      this.socket.on('error', (error) => {
        this.logger.error(`A3ITAHO connect error: ${JSON.stringify(error)}`)
        this.disconnect()
        this.reconnectTimeout = setTimeout(this.connectToTCPServer.bind(this), this.retryInterval)
      })
    }
}

module.exports = A3ITAHO