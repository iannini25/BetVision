// Shared Chrome launcher for the landing dev scripts (real Chrome + software WebGL so the
// R3F orb renders headless). One place to keep the flags in sync.
import { chromium } from 'playwright-core'

export function launchChrome() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
}

export const LANDING_URL = process.env.LANDING_URL || 'http://localhost:3005/landing'
