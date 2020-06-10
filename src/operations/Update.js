'use strict'

const Operation  = require('../Operation')
const startCase  = require('lodash.startcase')
const capitalize = require('lodash.capitalize')

const Update = (Component, componentAction = 'update') => {
  if (!Component) {
    throw new Error('Argument "Component" is undefined for "Update" operation' +
      ' function')
  }

  return class extends Operation {
    static get Component() {
      return Component
    }

    static get componentAction() {
      return componentAction
    }

    static get type() {
      return Operation.types.UPDATE
    }

    static get errors() {
      return {
        ...super.errors,
        ResourceNotFoundError: { statusCode: 404 }
      }
    }

    static get query() {
      const { Component: { name } } = this
      const componentTitle = capitalize(startCase(name))

      return {
        id: {
          description: `${componentTitle} ID`,
          required: true
        }
      }
    }
  }
}

module.exports = Update
