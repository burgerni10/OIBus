function getNode(ctx) {
  const { query } = ctx.request
  const { node } = query
  const authHeader = ctx.request.header.authorization || ''
  // following sequence allow to determine the user/password
  // used in the web request
  // authHeader format: "Basic <hashcode for user:pass"

  // 1/ Check format
  if (authHeader.startsWith('Basic ')) {
    // 2 extract encoded user:pass
    const encodedUsernamePassword = authHeader.split(' ')[1]

    // 3 decode back from Base64 to string:
    const usernamePassword = Buffer.from(encodedUsernamePassword, 'base64')
      .toString()
      .split(':')
    const username = usernamePassword[0]
    const password = usernamePassword[1]
    console.log(`request from ${username} with password:${password}`)
  } else {
    // Handle what happens if that isn't the case
    throw new Error("The authorization header is either empty or isn't Basic.")
  }
  ctx.ok({ node, query, comment: ' node was requested!' })
}

module.exports = { getNode }
