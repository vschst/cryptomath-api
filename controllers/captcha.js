const jwt = require('jsonwebtoken')

import {Captcha} from "../models/captcha"
import {getInstance} from "../models"

const responseBody = (body, endpoint, code = 200, error = null) => ({
    data: body,
    context: {
        endpoint: `/captcha/${endpoint}`,
        status: error ? 'error' : 'success',
        code,
        error
    }
})

export const generate = async (req, res) => {
    const model = getInstance('Captcha')
    const captcha = new Captcha(model)

    try {
        const loaded = await captcha.setData()

        if (!loaded) {
            return res.json(responseBody(
                null,
                'generate',
                500,
                {
                    source: 'captcha',
                    type: 'not_loaded'
                }
            ))
        }

        const token = await jwt.sign(captcha.data, process.env.JWT_PRIVATE_KEY, {expiresIn: 15 * 60})
        const math = captcha.math

        res.json(responseBody(
            {token, math},
            'generate',
        ))
    } catch (error) {
        res.json(responseBody(
            null,
            'generate',
            500,
            {
                source: 'internal',
                type: 'exception',
                message: error.message
            }
        ))
    }
}
