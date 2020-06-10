'use strict'

const Document  = require('src/Document')
const timestamp = new Date().toJSON()

// TODO: It's better to simulate in memory storage adaptor for proper tests.
class UserProfile extends Document {
  // static get tableName() {
  //   return 'UserProfile'
  // }

  static _index(query, options) { // eslint-disable-line no-unused-vars
    const timestamp = new Date().toJSON()

    const docs = [{
      id:        'USER_PROFILE_ID',
      firstName: 'Alexander',
      lastName:  'Kravets',
      age:       32,
      createdAt: timestamp,
      updatedAt: timestamp
    }]

    return { docs, count: 1 }
  }

  static _create(attributes) {
    attributes.id        = 'USER_PROFILE_ID'
    attributes.createdAt = timestamp
    attributes.updatedAt = timestamp

    return attributes
  }

  static _read(query) {
    if (query.id === 'EXCEPTION') {
      const error = new Error('Simulated unhandled exception')

      error.context = {
        type:     'Simulated error with masked secrets',
        secrets:  [{ passcode: 'SECRET_PASSCODE' }],
        password: 'SECRET_PASSWORD',
        data: {
          cookie: 'SECRET_COOKIE'
        }
      }

      throw error
    }

    if (query.id === 'INVALID_OUTPUT') {
      return {
        id:        'USER_PROFILE_ID',
        firstName: 'Alexander',
        lastName:  'Kravets'
      }
    }

    return {
      id:        'USER_PROFILE_ID',
      firstName: 'Alexander',
      lastName:  'Kravets',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...query
    }
  }

  static _update(query, attributes) {
    const updatedAt = new Date().toJSON()

    return {
      ...query,
      updatedAt,
      firstName: 'Alexander',
      lastName:  'Kravets',
      createdAt: timestamp,
      ...attributes
    }
  }

  static _delete(query) { // eslint-disable-line no-unused-vars
    return null
  }
}

module.exports = UserProfile