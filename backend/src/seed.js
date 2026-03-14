require('dotenv').config()
const { init, seed } = require('./db')

init()
seed()
console.log('Database seeded')
