'use strict'

const uniq               = require('lodash.uniq')
const compact            = require('lodash.compact')
const isString           = require('lodash.isstring')
const createSpec         = require('./helpers/createSpec')
const { Validator }      = require('@kravc/schema')
const createContext      = require('./helpers/createContext')
const OperationError     = require('./errors/OperationError')
const createSchemasMap   = require('./helpers/createSchemasMap')
const InvalidInputError  = require('./errors/InvalidInputError')
const InvalidOutputError = require('./errors/InvalidOutputError')
const OperationNotFoundError = require('./errors/OperationNotFoundError')

class Service {
  constructor(modules, url, path = '/src') {
    const schemasMap = createSchemasMap(path)

    let components = modules.filter(Component => !Component.types)
    let operations = modules.filter(Component => !!Component.types)

    const operationComponents = compact(operations.map(({ Component }) => Component))
    components = uniq([ ...components, ...operationComponents ])

    for (const component of components) {
      if (!component.schema) {
        const schema = schemasMap[component.id]

        if (!schema) {
          throw new Error(`Schema for component "${component.id}" not found`)
        }

        component.schema = schema
      }

      schemasMap[component.id] = component.schema
    }

    // const routesMap = {}
    const operationsMap = {}

    for (const operationClass of operations) {
      const { mutationSchema, inputSchema, outputSchema } = operationClass

      if (mutationSchema) {
        schemasMap[mutationSchema.id] = mutationSchema
      }

      if (inputSchema) {
        schemasMap[inputSchema.id] = inputSchema
        operationClass.errors.InvalidInputError = {
          statusCode:  400,
          description: 'Invalid operation input, make sure operation parameters' +
            ' do match specification'
        }
      }

      if (outputSchema) {
        schemasMap[outputSchema.id] = outputSchema
        operationClass.errors.InvalidOutputError = {
          statusCode:  500,
          description: 'Invalid output returned by the operation, this issue' +
            ' to be addressed by service developer'
        }
      }

      // operationClass.errors.OperationError = { statusCode: 500 }

      // const httpPath   = `/${operationClass.id}`
      // const httpMethod = getHttpMethod(operationClass)

      operationsMap[operationClass.id] = operationClass
      // routesMap[`${httpMethod}:${httpPath}`] = operationClass.id
    }

    schemasMap[OperationError.id] = OperationError.schema

    const spec      = createSpec(operations, schemasMap, url)
    const schemas   = Object.values(schemasMap)
    const validator = new Validator(schemas)

    // this._routesMap     = routesMap
    this._spec          = spec
    this._validator     = validator
    this._schemasMap    = schemasMap
    this._operationsMap = operationsMap
  }

  get validator() {
    return this._validator
  }

  get basePath() {
    return ''
  }

  getOperationId(httpMethod, httpPath) {
    this._routesMap[`${httpMethod}:${httpPath}`]
  }

  async process(context) {
    const { operationId } = context
    const Operation = this._operationsMap[operationId]

    let response

    try {
      const { httpMethod, httpPath } = context
      if (!Operation) { throw new OperationNotFoundError({ operationId, httpMethod, httpPath }) }

      context.identity = await Operation.authorize(context)
      const parameters = this._getParameters(Operation.inputSchema, context)

      const operation = new Operation(context)
      response = await operation.exec(parameters)

      response.output     = this._getOutput(Operation.outputSchema, response.result)
      response.statusCode = this._getStatusCode(Operation)

    } catch (error) {
      let errorStatusCode

      const { code } = error

      if (Operation && Operation.errors[code]) {
        errorStatusCode = Operation.errors[code].statusCode || 500

      } else {
        errorStatusCode = 500

      }

      response.output     = new OperationError(context, errorStatusCode, error).json
      response.statusCode = errorStatusCode

    }

    const { output, statusCode, headers } = response

    if (!output) {
      return { statusCode, headers }
    }

    const body = isString(output) ? output : JSON.stringify(output, null, 2)

    return { statusCode, headers, body }
  }

  _getParameters(inputSchema, context) {
    if (!inputSchema) { return {} }

    const { query, mutation } = context
    const input = { ...query, mutation }

    let result

    try {
      result = this._validator.validate(input, inputSchema.id)

    } catch (validationError) {
      throw new InvalidInputError(validationError, context)

    }

    return result
  }

  _getOutput(outputSchema, object) {
    if (!outputSchema) { return null }

    let output

    try {
      output = this._validator.validate(object, outputSchema.id)

    } catch (validationError) {
      throw new InvalidOutputError(object, validationError)

    }

    return output
  }

  _getStatusCode(Operation) {
    if (!Operation.outputSchema) {
      return 204
    }

    if (Operation.type === Operation.types.CREATE) {
      return 201
    }

    return 200
  }

  static handler(service, _createContext = createContext) {
    return request => {
      const context = _createContext(service, request)
      return service.process(context)
    }
  }
}

module.exports = Service
