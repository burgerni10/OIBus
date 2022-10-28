const net = require('net')
const { CallRequest } = require('node-opcua-client')
const { element, string } = require('prop-types')
const ApiHandler = require('../ApiHandler.class')

//var Trame =[{pointId: '' ,valPrec: '' ,valEnCours: ''}]
var Trame = []

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
    let valPreced = ''
    let valEnCours = ''
    let sTrame = ''
    let sLigne = ''
    let bCleExiste = 0
    let bverifConnect

    values.forEach((value) => {
      console.log('Boucle Value.forEach, point :', value.pointId)
      if (payload != ''){
        payload+= '|'
      }
      if (this.sentValues[value.pointId] !== value.data.value) {
        this.sentValues[value.pointId] = value.data.value
        valPreced = ''
        console.log('1')
        console.log('Condition SentValue : ', value.pointId)
        bCleExiste = 0
        for (var key in Trame){
          console.log("tabTrame KEY:",key)          
          if(key == value.pointId){
            bCleExiste = 1
            console.log('bcleexiste 1.1')  
            valPreced = Trame[value.pointId].valEnCours         
            console.log('bcleexiste 1.2')  
          }
        } 
        if(bCleExiste){
          console.log('bcleexiste 2.1')
          Trame[value.pointId].valPrec = valPreced
          Trame[value.pointId].valEnCours = String.fromCharCode(parseInt(value.data.value, 10))
          console.log('bcleexiste 2.2')                      
        }else{
          console.log('bcleexiste 3.1')  
          Trame[value.pointId]={Module: 'ADAM0x', NotifPanel: 'CHANGEMENTETAT',pointId: value.pointId, valPrec: valPreced, valEnCours: String.fromCharCode(parseInt(value.data.value, 10)) }
          console.log('bcleexiste 3.2')
        }
        console.log('bcleexiste 4.1')
        for (var key in Trame){      
          sLigne = ''
          console.log('bcleexiste 4.2')
          if(key == value.pointId){
            sLigne = Trame[key].Module +'|'+Trame[key].NotifPanel+'|'+Trame[key].pointId+'|'+Trame[key].valPrec+'|'+Trame[key].valEnCours+'|'+'ERR'+'|'+'ERR'
            console.log('sLigne:',sLigne)
            console.log('bcleexiste 4.3')
            if (sLigne != '') {
              this.socket.write(sLigne)
              console.log('sLigne envoyé !')
              console.log('Apres 1.1 ')
              this.socket.readable.read().then(
                ({value, done}) => {
                  if(!done){
                    console.log('Data recu 1', value)
                  }
                }
              )
              /** 
              this.socket.read('data', (stream) => { 
                console.log('bcleexiste 4.4')
                console.log('reponse :',stream.toString())
                console.log('Apres 1.2 ?')
                }) 
                */
            }  
          }
        }

        /** else{
          this.socket.once('data', (stream) => { 
            console.log('bcleexiste 4.3')
            console.log('reponse :',stream.toString())
          })  
        }    */   

        payload += String.fromCharCode(parseInt(value.data.value, 10)) 
        console.log('Payload :', payload)
      }   
    })

    if(payload.length > 0){
      //for (var key in Trame){
        //sLigne = Trame[key].Module +'|'+Trame[key].NotifPanel+'|'+Trame[key].pointId+'|'+Trame[key].valPrec+'|'+Trame[key].valEnCours+'|'+'ERR'+'|'+'ERR'
      //  sTrame += sLigne + '\n'
    //  }
      //console.log(sTrame)
      /** 
      this.socket.once('data', (stream) => { 
        console.log('reponse :',stream.toString())
        //console.log(stream.toString())
        if(stream.toString() == "ERR"){
          reponse= stream.toString + ' DE CONNECTION'
        }else{
          reponse="connexion OK"
        }
      })
      */
     // this.socket.write(sTrame)
     // console.log('Trame write ok')


      //this.socket.write(payload)
    }
    
   // this.socket.write(sTrame)

/** 
    for (var key in Trame){
      console.log("KEY FIN:",key)
      console.log(Trame[key])
    }
*/
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