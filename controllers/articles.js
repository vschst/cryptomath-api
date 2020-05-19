import {Articles} from "../models/article"

const ARTICLES_LIMIT = 10

const responseBody = (
    data,
    endpoint,
    code,
    error = null,
    limit = ARTICLES_LIMIT,
    offset = 0,
    total = 0
) => ({
    data,
    context: {
        endpoint: `/articles/${endpoint}`,
        limit,
        offset,
        total,
        success: !error,
        code,
        error
    }
})

export const all = async (req, res) => {
    const data = {
        limit: parseInt(req.body.limit) || ARTICLES_LIMIT,
        offset: parseInt(req.body.offset) || 0,
        filters: req.body.filters || false,
        sorts: req.body.sorts || false
    }

    const articles = new Articles(data)

    try {
        await articles.setData()

        res.json(responseBody(
            articles.data,
            'all',
            200,
            null,
            data.limit,
            data.offset,
            articles.total
        ))
    } catch(error) {
        res.json(responseBody(
            null,
            'all',
            500,
            {
                source: 'internal',
                type: 'exception',
                message: error.message
            }
        ))
    }
}
