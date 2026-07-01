#!/usr/bin/env node
import { route } from './cli/router.js'

route(process.argv.slice(2))
