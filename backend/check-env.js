#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const key = process.env.OPENAI_API_KEY || ''
console.log('Key loaded:', !!key)
console.log('Key length:', key.length)
process.exit(key ? 0 : 1)
