const handleResponse = async (response) => {
  try {
    const json = await response.json()
    return json
  } catch (error) {
    console.error('Error parsing JSON', error)
  }
  return null
}

const getRequest = async (uri) => {
  console.info('uri', uri)
  try {
    const response = await fetch(uri, { method: 'GET' })
    if (response.status !== 200) {
      throw new Error(response.status)
    }
    return handleResponse(response)
  } catch (error) {
    console.error('Request error', error)
    throw new Error(error)
  }
}

const postRequest = async (uri, body) => {
  try {
    const response = await fetch(uri, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (response.status !== 200) {
      throw new Error(response.status)
    }
    return response
  } catch (error) {
    throw new Error(error)
  }
}

const putRequest = async (uri, body) => {
  try {
    const response = await fetch(uri, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (response.status !== 200) {
      throw new Error(response.status)
    }
    return response
  } catch (error) {
    throw new Error(error)
  }
}

const deleteRequest = async (uri) => {
  try {
    const response = await fetch(`${uri}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (response.status !== 200) {
      throw new Error(response.status)
    }
    return response
  } catch (error) {
    throw new Error(error)
  }
}

const getSouthProtocols = () => getRequest('/config/schemas/south')
const getNorthApis = () => getRequest('/config/schemas/north')
const getConfig = () => getRequest('config')
const getActiveConfig = () => getRequest('config/active')
const updateActiveConfig = () => putRequest('/config/activate')
const resetModifiedConfig = () => putRequest('/config/reset')
const getSouthProtocolSchema = protocol => getRequest(`/config/schemas/south/${protocol}`)
const getNorthApiSchema = api => getRequest(`/config/schemas/north/${api}`)
const addNorth = body => postRequest('/config/north', body)
const updateNorth = (applicationId, body) => putRequest(`/config/north/${applicationId}`, body)
const deleteNorth = applicationId => deleteRequest(`/config/north/${applicationId}`)
const addSouth = body => postRequest('/config/south', body)
const updateSouth = (equipmentId, body) => putRequest(`/config/south/${equipmentId}`, body)
const deleteSouth = equipmentId => deleteRequest(`/config/south/${equipmentId}`)
const updateEngine = body => putRequest('/config/engine', body)
const getLogs = (fromDate, toDate, verbosity) => getRequest(`logs?fromDate=${fromDate || ''}&toDate=${toDate || ''}&verbosity=${verbosity}`)

export default {
  getSouthProtocols,
  getNorthApis,
  getConfig,
  getActiveConfig,
  updateActiveConfig,
  resetModifiedConfig,
  getSouthProtocolSchema,
  getNorthApiSchema,
  addNorth,
  updateNorth,
  deleteNorth,
  addSouth,
  updateSouth,
  deleteSouth,
  updateEngine,
  getLogs,
}
