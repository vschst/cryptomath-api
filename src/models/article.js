import { DataTypes, QueryTypes } from "sequelize"

import {getConnection} from "../core/database"
import {getInstance} from "./index"
import {
    articles,
    answers
} from "../tests/articles"
import {
    prepareWhere,
    prepareOrder,
    prepareQuery
} from "../utils/queries"
import {FilteredList} from "./mixins"

//  Callback for updating tsv vector
const updateArticleTsv = (db, model) => async (article, options) => {
    try {
        await model.update({
            tsv: db.literal("setweight(to_tsvector(title), 'A') || setweight(to_tsvector(abstract), 'B')")
        }, {
            where: {
                id: article['id']
            },
            transaction: options.transaction
        })
    } catch (error) {
        throw new Error(error)
    }
}

//  Sequelize model for the Articles table
export const ArticleModel = () => {
    const db = getConnection()
    const model = db.define('Article', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        abstract: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        raw: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        author: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        tsv: {
            type: 'TSVECTOR'
        }
    }, {
        freezeTableName: true,
        tableName: 'Articles',
        indexes: [
            {
                name: 'article_search',
                fields: ['tsv'],
                using: 'gin'
            }
        ]
    })

    model.afterCreate(updateArticleTsv(db, model))
    model.afterUpdate(updateArticleTsv(db, model))

    return model
}

//  Sequelize model for the ArticlesHubs junction table
export const ArticleHubModel = () => {
    const db = getConnection()

    return db.define('ArticleHub', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        article: {
            type: DataTypes.INTEGER,
            primaryKey: false,
            allowNull: false
        },
        hub: {
            type: DataTypes.INTEGER,
            primaryKey: false,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        tableName: 'ArticlesHubs',
        timestamps: false
    })
}

//  Sequelize model for the ArticlesTags junction table
export const ArticleTagModel = () => {
    const db = getConnection()

    return db.define('ArticleTag', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        article: {
            type: DataTypes.INTEGER,
            primaryKey: false,
            allowNull: false
        },
        tag: {
            type: DataTypes.INTEGER,
            primaryKey: false,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        tableName: 'ArticlesTags',
        timestamps: false
    })
}

//  Sequelize model for the ArticlesAnswers junction table
export const ArticleAnswerModel = () => {
    const db = getConnection()

    return db.define('ArticleAnswer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        article: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
    }, {
        freezeTableName: true,
        tableName: 'ArticlesAnswers',
    })
}

//  Sequelize model for the ArticlesVotes junction table
export const ArticleVoteModel = () => {
    const db = getConnection()

    return db.define('ArticleVote', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        article: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        vote: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        tableName: 'ArticlesVotes',
    })
}

//  Generating Sequelize associations for the Articles table
export const ArticleAssociations = (model) => {
    const articleHubModel = getInstance('ArticleHub')
    const articleTagModel = getInstance('ArticleTag')
    const articleAnswerModel = getInstance('ArticleAnswer')
    const articleVoteModel = getInstance('ArticleVote')
    const userModel = getInstance('User')
    const hubModel = getInstance('Hub')
    const tagModel = getInstance('Tag')

    //  Article author associations
    userModel.Article = userModel.hasOne(model, {
        foreignKey: 'id'
    })

    //  User article associations
    model.User = model.belongsTo(userModel, {
        foreignKey: 'author'
    })

    //  Article hub associations
    model.Hub = model.belongsToMany(hubModel, {
        through: articleHubModel,
        foreignKey: 'article',
        constraints: false
    })

    //  Hub article associations
    hubModel.Article = hubModel.belongsToMany(model, {
        through: articleHubModel,
        foreignKey: 'hub',
        constraints: false
    })

    //  Article tag associations
    model.Tag = model.belongsToMany(tagModel, {
        through: articleTagModel,
        foreignKey: 'article',
        constraints: false
    })

    //  Tag article model
    tagModel.Article = tagModel.belongsToMany(model, {
        through: articleTagModel,
        foreignKey: 'tag',
        constraints: false
    })

    //  Article answer associations
    userModel.ArticleAnswer = userModel.hasOne(articleAnswerModel, {
        foreignKey: 'id'
    })

    articleAnswerModel.User = articleAnswerModel.belongsTo(userModel, {
        foreignKey: 'user'
    })

    model.Answer = model.hasMany(articleAnswerModel, {
        foreignKey: 'article',
        constraints: false
    })

    articleAnswerModel.Article = articleAnswerModel.belongsTo(model, {
        foreignKey: 'id',
        constraints: false
    })

    //  Article vote associations
    userModel.ArticleVote = userModel.hasOne(articleVoteModel, {
        foreignKey: 'id'
    })

    articleVoteModel.User = articleVoteModel.belongsTo(userModel, {
        foreignKey: 'user'
    })

    model.Vote = model.hasMany(articleVoteModel, {
        foreignKey: 'article',
        constraints: false
    })

    articleVoteModel.Article = articleVoteModel.belongsTo(model, {
        foreignKey: 'id',
        constraints: false
    })
}

// Load defaults for Articles table
export const ArticleDefaults = async (model) => {
    try {
        for (let article of articles) {
            await model.findOrCreate({
                where: {id: article.id},
                defaults: {
                    id: article.id,
                    title: article.title,
                    author: article.author,
                    abstract: article.abstract,
                    raw: article.raw,
                    createdAt: article.createdAt
                }
            })
        }
    } catch (error) {
        throw new Error(error)
    }
}

// Load defaults for ArticlesHubs junction table
export const ArticleHubDefaults = async (model) => {
    try {
        for (let article of articles) {
            for (let id of article.hubs) {
                await model.findOrCreate({
                    where: {article: article.id, hub: id},
                    defaults: {
                        article: article.id,
                        hub: id
                    }
                })
            }
        }
    } catch (error) {
        throw new Error(error)
    }
}

// Load defaults for ArticlesTags junction table
export const ArticleTagDefaults = async (model) => {
    try {
        for (let article of articles) {
            for (let id of article.tags) {
                await model.findOrCreate({
                    where: {article: article.id, tag: id},
                    defaults: {
                        article: article.id,
                        tag: id
                    }
                })
            }
        }
    } catch (error) {
        throw new Error(error)
    }
}

// Load defaults for ArticlesAnswers table
export const ArticleAnswerDefaults = async (model) => {
    try {
        for (let answer of answers) {
            await model.findOrCreate({
                where: {id: answer.id, article: answer.article},
                defaults: {
                    id: answer.id,
                    article: answer.article,
                    user: answer.user,
                    message: answer.message,
                    createdAt: answer.createdAt
                }
            })
        }
    } catch (error) {
        throw new Error(error)
    }
}

// Filtered fields for Articles class
const articlesFields = [
    {
        field: 'id',
        filter: 'id',
        sortable: false
    },
    {
        field: 'title',
        filter: 'text',
        sortable: true
    },
    {
        field: 'author',
        filter: 'id',
        sortable: true
    },
    {
        field: 'hubs',
        filter: 'ids',
        sortable: false
    },
    {
        field: 'tags',
        filter: 'ids',
        sortable: false
    },
    {
        field: 'answers',
        filter: 'numeric',
        sortable: true
    },
    {
        field: 'votes',
        filter: 'numeric',
        sortable: true
    },
    {
        field: 'createdAt',
        filter: 'date',
        sortable: true
    }
]

// Class for getting a filtered list of articles
export class Articles extends FilteredList {
    constructor({filters, sorts, limit, offset, search}, extended) {
        super({
            fields: articlesFields,
            filters,
            sorts,
            limit,
            offset,
            search
        })

        this.extended = extended

        this.articleModel = getInstance('Article')
        this.articleHubModel = getInstance('ArticleHub')
        this.articleTagModel = getInstance('ArticleTag')
        this.articleAnswerModel = getInstance('ArticleAnswer')
        this.articleVoteModel = getInstance('ArticleVote')
        this.userModel = getInstance('User')
        this.hubModel = getInstance('Hub')
        this.tagModel = getInstance('Tag')
    }

    //  SELECT fields
    get cols() {
        return {
            id: '"Article"."id"',
            title: '"Article"."title"',
            abstract: '"Article"."abstract"',
            createdAt: '"Article"."createdAt"',
            author: '"Article"."author"',
            tsv: '"Article"."tsv"',
            user: {
                id: '"User"."id"',
                email: '"User"."email"',
                displayName: '"User"."displayName"',
                hash: '"User"."hash"'
            },
            hub: {
                id: '"Hub"."id"',
                name: '"Hub"."name"'
            },
            tag: {
                id: '"Tag"."id"',
                name: '"Tag"."name"',
                hub: '"Tag"."hub"'
            },
            count: 'COUNT(DISTINCT("Article"."id"))',
            answers: 'COUNT(DISTINCT("ArticleAnswer"."id"))',
            votes: 'COALESCE(SUM("ArticleVote"."vote"), 0)'
        }
    }

    get tsQuery() {
        return this.search ? `plainto_tsquery('${this.search}')` : ''
    }

    get rankCol() {
        return this.search ? `TS_RANK(${this.cols.tsv}, ${this.tsQuery})` : ''
    }

    //  WHERE clause for Articles table
    get where() {
        const wheres = []

        if (this.filters.id) {
            wheres.push({
                column: this.cols.id,
                filter: this.filters.id
            })
        }

        if (this.filters.title) {
            wheres.push({
                column: this.cols.title,
                filter: this.filters.title
            })
        }

        if (this.filters.createdAt) {
            wheres.push({
                column: `DATE(${this.cols.createdAt})`,
                filter: this.filters.createdAt
            })
        }

        if (this.search) {
            wheres.push({
                column: this.cols.tsv,
                filter: {
                    tsMatch: true,
                    operation: this.tsQuery
                }
            })
        }

        return prepareWhere(wheres, false)
    }

    //  WHERE clause for Users table
    get userWhere() {
        const wheres = []

        if (this.filters.author) {
            wheres.push({
                column: this.cols.user.id,
                filter: this.filters.author
            })
        }

        return prepareWhere(wheres, true)
    }

    //  WHERE clause for Hubs table
    get hubWhere() {
        const wheres = []

        if (this.filters.hubs) {
            wheres.push({
                column: this.cols.hub.id,
                filter: this.filters.hubs
            })
        }

        return prepareWhere(wheres, true)
    }

    //  WHERE clause for Tags table
    get tagWhere() {
        const wheres = []

        if (this.filters.tags) {
            wheres.push({
                column: this.cols.tag.id,
                filter: this.filters.tags
            })
        }

        return prepareWhere(wheres, true)
    }

    //  HAVING clause for Articles table
    get having() {
        const havings = []

        if (this.filters.answers) {
            havings.push({
                column: this.cols.answers,
                filter: this.filters.answers
            })
        }

        if (this.filters.votes) {
            havings.push({
                column: this.cols.votes,
                filter: this.filters.votes
            })
        }

        return prepareWhere(havings)
    }

    //  ORDER BY clause for Articles table
    get order() {
        const orders = []

        if (this.sorts.title) {
            orders.push({
                column: this.cols.title,
                direction: this.sorts.title
            })
        }

        if (this.sorts.author) {
            orders.push({
                column: this.cols.user.displayName,
                direction: this.sorts.author
            })
        }

        if (this.sorts.answers) {
            orders.push({
                column: this.cols.answers,
                direction: this.sorts.answers
            })
        }

        if (this.sorts.votes) {
            orders.push({
                column: this.cols.votes,
                direction: this.sorts.votes
            })
        }

        if (this.sorts.createdAt) {
            orders.push({
                column: this.cols.createdAt,
                direction: this.sorts.createdAt
            })
        }
        else {
            orders.push({
                column: this.cols.createdAt,
                direction: 'DESC'
            })
        }

        if (this.search) {
            orders.push({
                column: '"rank"',
                direction: 'DESC'
            })
        }

        return prepareOrder(orders)
    }

    get data() {
        return super.data
    }

    //  Data preparation
    set data(articlesRaw) {
        const articles = []

        for (let article of articlesRaw) {
            const articleId = article.id
            const dataValues = article['dataValues']
            const hub = {
                id: dataValues['Hub.id'],
                name: dataValues['Hub.name']
            }
            const tag = {
                id: dataValues['Tag.id'],
                name: dataValues['Tag.name'],
                hub: dataValues['Tag.hub']
            }

            const articleObject = articles.find(a => a.id === articleId)

            if (articleObject) {
                const hasHub = articleObject.hubs.some(h => h.id === hub.id)
                const hasTag = articleObject.tags.some(t => t.id === tag.id)

                if (!hasHub) {
                    articleObject.hubs.push(hub)
                }

                if (!hasTag) {
                    articleObject.tags.push(tag)
                }
            }
            else {
                const newArticleObject = {
                    id: article.id,
                    title: article.title,
                    ...(this.extended && {abstract: article.abstract}),
                    createdAt: article.createdAt,
                    author: {
                        id: dataValues['User.id'],
                        displayName: dataValues['User.displayName'],
                        hash: dataValues['User.hash']
                    },
                    hubs: [hub],
                    tags: [tag],
                    answers: parseInt(dataValues.answers),
                    votes: parseInt(dataValues.votes)
                }

                articles.push(newArticleObject)
            }
        }

        this.dataProxy = articles
    }

    // Load data
    async setData() {
        try {
            this.data = await this.db.query(prepareQuery(`
                SELECT DISTINCT
                    ${this.cols.id},
                    ${this.cols.title},
                    ${this.extended ? `${this.cols.abstract},` : ''}
                    ${this.cols.createdAt},
                    ${this.search ? `${this.rankCol} AS "rank",` : ''}
                    ${this.cols.user.id} AS "User.id",
                    ${this.cols.user.displayName} AS "User.displayName",
                    ${this.cols.user.hash} AS "User.hash",
                    ${this.cols.hub.id} AS "Hub.id",
                    ${this.cols.hub.name} AS "Hub.name",
                    ${this.cols.tag.id} AS "Tag.id",
                    ${this.cols.tag.name} AS "Tag.name",
                    ${this.cols.tag.hub} AS "Tag.hub",
                    ${this.cols.answers} AS "answers",
                    ${this.cols.votes} AS "votes"
                FROM "${this.articleModel.tableName}" AS "Article"
                    INNER JOIN "${this.userModel.tableName}" AS "User" ON ${this.cols.author} = ${this.cols.user.id} ${this.userWhere}
                    INNER JOIN ("${this.articleHubModel.tableName}" AS "ArticleHub" 
                        INNER JOIN "${this.hubModel.tableName}" AS "Hub" ON ${this.cols.hub.id} = "ArticleHub"."hub") ON ${this.cols.id} = "ArticleHub"."article" ${this.hubWhere}
                    INNER JOIN ("${this.articleTagModel.tableName}" AS "ArticleTag" 
                        INNER JOIN "${this.tagModel.tableName}" AS "Tag" ON ${this.cols.tag.id} = "ArticleTag"."tag") ON ${this.cols.id} = "ArticleTag"."article" ${this.tagWhere}
                    LEFT OUTER JOIN "${this.articleAnswerModel.tableName}" AS "ArticleAnswer" ON ${this.cols.id} = "ArticleAnswer"."article" 
                    LEFT OUTER JOIN "${this.articleVoteModel.tableName}" AS "ArticleVote" ON ${this.cols.id} = "ArticleVote"."article"
                WHERE ${this.where}
                GROUP BY
                    ${this.cols.id},
                    ${this.cols.user.id},
                    ${this.cols.user.email},
                    ${this.cols.hub.id},
                    "ArticleHub"."id",
                    ${this.cols.tag.id},
                    "ArticleTag"."id"
                HAVING ${this.having}    
                ORDER BY ${this.order}
                OFFSET ${this.offset}
                LIMIT ${this.limit}    
            `), {
                model: this.articleModel,
                type: QueryTypes.SELECT,
                benchmark: true,
                logging: (sql, timing) => this.addTiming(timing)
            })

            this.total = await this.db.query(prepareQuery(`
                SELECT 
                    ${this.cols.count} AS "total"
                FROM "${this.articleModel.tableName}" AS "Article"
                    INNER JOIN "${this.userModel.tableName}" AS "User" ON ${this.cols.author} = ${this.cols.user.id} ${this.userWhere}
                    INNER JOIN ("${this.articleHubModel.tableName}" AS "ArticleHub" INNER JOIN "${this.hubModel.tableName}" AS "Hub" ON ${this.cols.hub.id} = "ArticleHub"."hub") ON ${this.cols.id} = "ArticleHub"."article" ${this.hubWhere}
                    INNER JOIN ("${this.articleTagModel.tableName}" AS "ArticleTag" INNER JOIN "${this.tagModel.tableName}" AS "Tag" ON ${this.cols.tag.id} = "ArticleTag"."tag") ON ${this.cols.id} = "ArticleTag"."article" ${this.tagWhere}
                    INNER JOIN (SELECT DISTINCT ${this.cols.id} FROM "${this.articleModel.tableName}" AS "Article"
                        LEFT OUTER JOIN "${this.articleAnswerModel.tableName}" AS "ArticleAnswer" ON ${this.cols.id} = "ArticleAnswer"."article" 
                        LEFT OUTER JOIN "${this.articleVoteModel.tableName}" AS "ArticleVote" ON ${this.cols.id} = "ArticleVote"."article"
                        GROUP BY ${this.cols.id}
                        HAVING ${this.having}
                    ) AS "ArticlesAnswerVote" ON ${this.cols.id} = "ArticlesAnswerVote"."id"
                WHERE ${this.where}
            `), {
                model: this.articleModel,
                type: QueryTypes.SELECT,
                benchmark: true,
                logging: (sql, timing) => this.addTiming(timing)
            })

            return true
        } catch (error) {
            throw error
        }
    }
}
