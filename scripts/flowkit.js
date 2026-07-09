#!/usr/bin/env node
// Bootstrap: the npm bin entry point — hands off to the platform router immediately.
import { route } from './platform/router.js'

route(process.argv.slice(2))
